package notifications

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"net/smtp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	SMTPHost       string
	SMTPPort       int
	SMTPUser       string
	SMTPPass       string
	SMTPFrom       string
	PushWebhookURL string
}

type Service struct {
	db         *pgxpool.Pool
	config     Config
	httpClient *http.Client
}

type TemplateData map[string]any

type RenewalReminder struct {
	UserID         uuid.UUID
	Email          string
	TenantName     string
	ContractNumber string
	EndDate        time.Time
}

type RenewalReminderRepository interface {
	RenewalRemindersDue(ctx context.Context, days int) ([]RenewalReminder, error)
	SendTemplate(ctx context.Context, userID uuid.UUID, email string, notificationType NotificationType, data TemplateData) error
}

func NewService(db *pgxpool.Pool, cfg Config) *Service {
	return &Service{
		db:     db,
		config: cfg,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (s *Service) SendWelcome(ctx context.Context, email, name, temporaryPassword string) error {
	return s.SendTemplate(ctx, uuid.Nil, email, TypeWelcome, TemplateData{
		"Name":         name,
		"TempPassword": temporaryPassword,
	})
}

func (s *Service) Send(userID uuid.UUID, title, body string) error {
	ctx := context.Background()
	if err := s.CreateInAppAlert(ctx, userID, title, body, TypeGeneral); err != nil {
		return err
	}
	return s.PushWebhook(ctx, userID, title, body, TypeGeneral)
}

func (s *Service) SendEmail(email, subject, htmlBody string) error {
	return s.sendSMTP(email, subjectPrefix+subject, htmlBody)
}

func (s *Service) SendTemplate(ctx context.Context, userID uuid.UUID, email string, notificationType NotificationType, data TemplateData) error {
	title := titleFor(notificationType, data)
	body := bodyFor(notificationType, data)
	if userID != uuid.Nil {
		if err := s.CreateInAppAlert(ctx, userID, title, body, notificationType); err != nil {
			return err
		}
		if err := s.PushWebhook(ctx, userID, title, body, notificationType); err != nil {
			return err
		}
	}
	if email == "" {
		return nil
	}
	htmlBody, err := renderEmail(notificationType, data)
	if err != nil {
		return err
	}
	return s.sendSMTP(email, subjectPrefix+title, htmlBody)
}

func (s *Service) CreateInAppAlert(ctx context.Context, userID uuid.UUID, title, body string, notificationType NotificationType) error {
	if s.db == nil || userID == uuid.Nil {
		return nil
	}
	metadata, _ := json.Marshal(map[string]any{"notification_type": notificationType})
	_, err := s.db.Exec(ctx, `
		INSERT INTO ai_recommendations (user_id, type, status, title, message, priority, confidence, metadata)
		VALUES ($1, 'COACHING'::ai_recommendation_type, 'NEW'::ai_recommendation_status, $2, $3, 'medium', 1, $4)`,
		userID, title, body, metadata)
	return err
}

func (s *Service) PushWebhook(ctx context.Context, userID uuid.UUID, title, body string, notificationType NotificationType) error {
	if s.config.PushWebhookURL == "" || userID == uuid.Nil {
		return nil
	}
	payload, err := json.Marshal(map[string]any{
		"user_id": userID.String(),
		"title":   title,
		"body":    body,
		"type":    notificationType,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.config.PushWebhookURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("push webhook returned %s", resp.Status)
	}
	return nil
}

func (s *Service) RenewalRemindersDue(ctx context.Context, days int) ([]RenewalReminder, error) {
	rows, err := s.db.Query(ctx, `
		SELECT u.id, u.email, t.name, c.contract_number, c.end_date
		FROM contracts c
		JOIN tenants t ON t.id = c.tenant_id
		JOIN users u ON u.id = t.account_manager_id
		WHERE c.status = 'ACTIVE'::contract_status
			AND c.end_date = CURRENT_DATE + ($1::int * interval '1 day')`,
		days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []RenewalReminder{}
	for rows.Next() {
		item := RenewalReminder{}
		if err := rows.Scan(&item.UserID, &item.Email, &item.TenantName, &item.ContractNumber, &item.EndDate); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func SendRenewalReminders(ctx context.Context, repo RenewalReminderRepository) error {
	return SendRenewalRemindersWithDays(ctx, repo, 30)
}

func SendRenewalRemindersWithDays(ctx context.Context, repo RenewalReminderRepository, days int) error {
	items, err := repo.RenewalRemindersDue(ctx, days)
	if err != nil {
		return err
	}
	for _, item := range items {
		err = repo.SendTemplate(ctx, item.UserID, item.Email, TypeRenewalReminder, TemplateData{
			"TenantName":     item.TenantName,
			"ContractNumber": item.ContractNumber,
			"EndDate":        item.EndDate.Format("2006-01-02"),
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) sendSMTP(email, subject, htmlBody string) error {
	if s.config.SMTPHost == "" || s.config.SMTPFrom == "" || email == "" {
		return nil
	}
	addr := s.config.SMTPHost + ":" + strconv.Itoa(s.config.SMTPPort)
	var auth smtp.Auth
	if s.config.SMTPUser != "" {
		auth = smtp.PlainAuth("", s.config.SMTPUser, s.config.SMTPPass, s.config.SMTPHost)
	}
	msg := []byte("From: " + s.config.SMTPFrom + "\r\n" +
		"To: " + email + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n\r\n" +
		htmlBody)
	return smtp.SendMail(addr, auth, s.config.SMTPFrom, []string{email}, msg)
}

func renderEmail(notificationType NotificationType, data TemplateData) (string, error) {
	raw, ok := emailTemplates[notificationType]
	if !ok {
		raw = emailTemplates[TypeGeneral]
	}
	tpl, err := template.New(string(notificationType)).Parse(raw)
	if err != nil {
		return "", err
	}
	var out bytes.Buffer
	if err := tpl.Execute(&out, data); err != nil {
		return "", err
	}
	return out.String(), nil
}

func titleFor(notificationType NotificationType, data TemplateData) string {
	switch notificationType {
	case TypeWelcome:
		return "Welcome"
	case TypeWonDeal:
		return "Deal Won!"
	case TypeRiskAlert:
		return "Tenant Risk Alert"
	case TypeRenewalReminder:
		return "Renewal Reminder"
	case TypeTargetBehind:
		return "Target Behind Pace"
	default:
		if title, ok := data["Title"].(string); ok && strings.TrimSpace(title) != "" {
			return title
		}
		return "Notification"
	}
}

func bodyFor(notificationType NotificationType, data TemplateData) string {
	switch notificationType {
	case TypeWonDeal:
		return fmt.Sprintf("Congratulations! %v has been converted to a tenant. Please add their HCS account ID and set up their first services.", data["CompanyName"])
	case TypeRiskAlert:
		return fmt.Sprintf("%v has crossed the risk threshold. Current risk score: %v.", data["TenantName"], data["RiskScore"])
	case TypeRenewalReminder:
		return fmt.Sprintf("%v contract %v expires on %v.", data["TenantName"], data["ContractNumber"], data["EndDate"])
	case TypeTargetBehind:
		return fmt.Sprint(data["Advice"])
	default:
		if body, ok := data["Body"].(string); ok {
			return body
		}
		return titleFor(notificationType, data)
	}
}
