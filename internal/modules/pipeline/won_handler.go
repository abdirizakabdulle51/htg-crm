package pipeline

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func HandleWon(ctx context.Context, lead Lead, actingUser UserContext, tenantRepo TenantRepository, pipelineRepo PipelineRepository, notifyService NotificationService) (*Tenant, error) {
	existing, err := tenantRepo.FindTenantByLeadID(ctx, lead.ID)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	tenant := Tenant{
		ID:               uuid.New(),
		Name:             lead.CompanyName,
		CountryID:        lead.CountryID,
		RegionID:         lead.RegionID,
		SectorID:         lead.SectorID,
		AccountManagerID: lead.OwnerID,
		Status:           "PROSPECT",
		LeadID:           &lead.ID,
		CreatedBy:        &actingUser.ID,
		MRRUSD:           0,
		RenewalDate:      nil,
		HCSAccountID:     "",
		HuaweiRegion:     "af-south-1",
	}

	created, err := tenantRepo.CreateTenantFromWonLead(ctx, tenant)
	if err != nil {
		return nil, err
	}

	if err := pipelineRepo.LogWonTenantActivity(ctx, lead.ID, actingUser.ID, created.ID); err != nil {
		return nil, err
	}

	if notifyService != nil {
		title := "Deal Won!"
		body := fmt.Sprintf("Congratulations! %s has been converted to a tenant. Please add their HCS account ID and set up their first services.", lead.CompanyName)
		if err := notifyService.Send(actingUser.ID, title, body); err != nil {
			log.Printf("won notification failed: %v", err)
		}
		if actingUser.Email != "" {
			if err := notifyService.SendEmail(actingUser.Email, title, body); err != nil {
				log.Printf("won email notification failed: %v", err)
			}
		}
	}

	if err := pipelineRepo.PublishEmbeddingRefresh(ctx, created.ID); err != nil {
		return nil, err
	}

	return created, nil
}

type SMTPWebhookNotificationService struct {
	SMTPAddr     string
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	WebhookURL   string
	HTTPClient   *http.Client
}

func (s SMTPWebhookNotificationService) Send(userID uuid.UUID, title, body string) error {
	if s.WebhookURL == "" {
		return nil
	}
	client := s.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}
	payload := []byte(fmt.Sprintf(`{"user_id":"%s","title":%q,"body":%q}`, userID.String(), title, body))
	resp, err := client.Post(s.WebhookURL, "application/json", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("notification webhook returned %s", resp.Status)
	}
	return nil
}

func (s SMTPWebhookNotificationService) SendEmail(email, subject, htmlBody string) error {
	if s.SMTPAddr == "" || s.FromEmail == "" || email == "" {
		return nil
	}
	auth := smtp.PlainAuth("", s.SMTPUsername, s.SMTPPassword, smtpHost(s.SMTPAddr))
	msg := []byte("From: " + s.FromEmail + "\r\n" +
		"To: " + email + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n\r\n" +
		htmlBody)
	return smtp.SendMail(s.SMTPAddr, auth, s.FromEmail, []string{email}, msg)
}

type NoopNotificationService struct{}

func (NoopNotificationService) Send(uuid.UUID, string, string) error {
	return nil
}

func (NoopNotificationService) SendEmail(string, string, string) error {
	return nil
}

func smtpHost(addr string) string {
	for i, ch := range addr {
		if ch == ':' {
			return addr[:i]
		}
	}
	return addr
}
