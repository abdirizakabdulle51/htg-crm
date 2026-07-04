package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/middleware"
)

const meetingSystemPrompt = "You are an expert B2B sales analyst for HTG Clouds, a Huawei Cloud partner in East Africa. Analyze meeting notes and extract structured sales intelligence. Use the tenant context provided when interpreting what was discussed. Return ONLY valid JSON matching the exact schema - no markdown, no extra text."

var (
	ErrMeetingNotFound   = errors.New("meeting activity not found")
	ErrMeetingValidation = errors.New("meeting validation failed")
	ErrMeetingForbidden  = errors.New("meeting forbidden")
	ErrAIUnavailable     = errors.New("ai unavailable")
)

type MeetingAnalysisOutput struct {
	Summary                 string            `json:"summary"`
	AttendeesMentioned      []string          `json:"attendees_mentioned"`
	CustomerPainPoints      []string          `json:"customer_pain_points"`
	BudgetSignals           string            `json:"budget_signals"`
	DecisionTimeline        string            `json:"decision_timeline"`
	CompetitorsMentioned    []string          `json:"competitors_mentioned"`
	TechnicalRequirements   []string          `json:"technical_requirements"`
	CloudReadinessIndicator string            `json:"cloud_readiness_indicator"`
	NextSteps               []MeetingNextStep `json:"next_steps"`
	RecommendedServices     []string          `json:"recommended_services"`
	EstimatedOpportunityUSD float64           `json:"estimated_opportunity_usd"`
	RiskSignals             string            `json:"risk_signals"`
	FollowUpEmailDraft      string            `json:"follow_up_email_draft"`
}

type MeetingNextStep struct {
	Action  string `json:"action"`
	Owner   string `json:"owner"`
	DueDays int    `json:"due_days"`
}

type meetingActivity struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	LeadID     *uuid.UUID
	TenantID   *uuid.UUID
	Type       string
	Subject    string
	Notes      string
	OccurredAt *time.Time
	CreatedAt  time.Time
}

type meetingEntityContext struct {
	EntityName     string
	Sector         string
	Country        string
	AccountManager string
	Services       string
	TenantContext  string
}

func (s *Service) AnalyzeMeeting(ctx context.Context, activityID uuid.UUID, user auth.UserContext) (MeetingAnalysisOutput, error) {
	activity, err := s.loadMeetingActivity(ctx, activityID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return MeetingAnalysisOutput{}, ErrMeetingNotFound
		}
		return MeetingAnalysisOutput{}, err
	}
	if activity.Type != "MEETING" {
		return MeetingAnalysisOutput{}, fmt.Errorf("%w: activity type must be MEETING", ErrMeetingValidation)
	}
	if len([]rune(strings.TrimSpace(activity.Notes))) <= 50 {
		return MeetingAnalysisOutput{}, fmt.Errorf("%w: activity notes must be more than 50 characters", ErrMeetingValidation)
	}
	if !canAnalyzeMeeting(user, activity) {
		return MeetingAnalysisOutput{}, ErrMeetingForbidden
	}

	entity, err := s.meetingEntityContext(ctx, activity)
	if err != nil {
		return MeetingAnalysisOutput{}, err
	}
	body, err := s.client.Chat(ctx, "gpt-4o", meetingSystemPrompt, buildMeetingPrompt(activity, entity), 1200, 0.2)
	if err != nil {
		return MeetingAnalysisOutput{}, ErrAIUnavailable
	}
	output, err := parseMeetingOutput(body)
	if err != nil {
		return MeetingAnalysisOutput{}, ErrAIUnavailable
	}
	if err := s.persistMeetingAnalysis(ctx, activity, output); err != nil {
		return MeetingAnalysisOutput{}, err
	}
	return output, nil
}

func (s *Service) loadMeetingActivity(ctx context.Context, activityID uuid.UUID) (meetingActivity, error) {
	item := meetingActivity{}
	err := s.db.QueryRow(ctx, `
		SELECT id, user_id, lead_id, tenant_id, type::text, subject, COALESCE(body, ''), occurred_at, created_at
		FROM activities
		WHERE id = $1`, activityID).
		Scan(&item.ID, &item.UserID, &item.LeadID, &item.TenantID, &item.Type, &item.Subject, &item.Notes, &item.OccurredAt, &item.CreatedAt)
	return item, err
}

func (s *Service) meetingEntityContext(ctx context.Context, activity meetingActivity) (meetingEntityContext, error) {
	if activity.TenantID != nil {
		return s.tenantMeetingContext(ctx, *activity.TenantID, activity.Notes)
	}
	if activity.LeadID != nil {
		return s.leadMeetingContext(ctx, *activity.LeadID)
	}
	return meetingEntityContext{}, fmt.Errorf("%w: activity must have a tenant or lead", ErrMeetingValidation)
}

func (s *Service) tenantMeetingContext(ctx context.Context, tenantID uuid.UUID, notes string) (meetingEntityContext, error) {
	item := meetingEntityContext{}
	err := s.db.QueryRow(ctx, `
		SELECT t.name, s.name, c.name, u.full_name
		FROM tenants t
		JOIN sectors s ON s.id = t.sector_id
		JOIN country_offices c ON c.id = t.country_id
		JOIN users u ON u.id = t.account_manager_id
		WHERE t.id = $1`, tenantID).Scan(&item.EntityName, &item.Sector, &item.Country, &item.AccountManager)
	if err != nil {
		return item, err
	}
	services, err := s.servicesList(ctx, tenantID)
	if err != nil {
		return item, err
	}
	item.Services = services
	chunks, err := s.rag.RetrieveContext(ctx, notes, 5)
	if err == nil {
		item.TenantContext = strings.Join(chunks, "\n")
	}
	return item, nil
}

func (s *Service) leadMeetingContext(ctx context.Context, leadID uuid.UUID) (meetingEntityContext, error) {
	item := meetingEntityContext{Services: "none yet - prospect"}
	err := s.db.QueryRow(ctx, `
		SELECT l.company_name, s.name, c.name, u.full_name
		FROM leads l
		JOIN sectors s ON s.id = l.sector_id
		JOIN country_offices c ON c.id = l.country_id
		JOIN users u ON u.id = l.owner_id
		WHERE l.id = $1`, leadID).Scan(&item.EntityName, &item.Sector, &item.Country, &item.AccountManager)
	if err != nil {
		return item, err
	}
	item.TenantContext = "Lead prospect context: no tenant services yet."
	return item, nil
}

func (s *Service) servicesList(ctx context.Context, tenantID uuid.UUID) (string, error) {
	rows, err := s.db.Query(ctx, `
		SELECT service_name, monthly_usd
		FROM tenant_services
		WHERE tenant_id = $1 AND status = 'ACTIVE'::service_status
		ORDER BY service_name`, tenantID)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	parts := []string{}
	for rows.Next() {
		var name string
		var monthly float64
		if err := rows.Scan(&name, &monthly); err != nil {
			return "", err
		}
		parts = append(parts, fmt.Sprintf("%s ($%.2f/month)", name, monthly))
	}
	if len(parts) == 0 {
		return "none", rows.Err()
	}
	return strings.Join(parts, ", "), rows.Err()
}

func (s *Service) persistMeetingAnalysis(ctx context.Context, activity meetingActivity, output MeetingAnalysisOutput) error {
	body, err := json.Marshal(output)
	if err != nil {
		return err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if len(output.NextSteps) > 0 {
		dueDays := output.NextSteps[0].DueDays
		if dueDays < 0 {
			dueDays = 0
		}
		if _, err := tx.Exec(ctx, `
			UPDATE activities
			SET ai_output = $1, ai_summary = $2, next_action_date = CURRENT_DATE + ($3::int * interval '1 day'), next_action_notes = $4
			WHERE id = $5`,
			body, output.Summary, dueDays, output.NextSteps[0].Action, activity.ID); err != nil {
			return err
		}
	} else {
		if _, err := tx.Exec(ctx, `
			UPDATE activities
			SET ai_output = $1, ai_summary = $2
			WHERE id = $3`, body, output.Summary, activity.ID); err != nil {
			return err
		}
	}

	if output.EstimatedOpportunityUSD > 0 && activity.LeadID != nil {
		if _, err := tx.Exec(ctx, `UPDATE leads SET potential_value_usd = $1 WHERE id = $2`, output.EstimatedOpportunityUSD, *activity.LeadID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func buildMeetingPrompt(activity meetingActivity, entity meetingEntityContext) string {
	meetingDate := activity.CreatedAt
	if activity.OccurredAt != nil {
		meetingDate = *activity.OccurredAt
	}
	return fmt.Sprintf(`TENANT CONTEXT:
%s
MEETING DETAILS:
Entity: %s. Sector: %s. Country: %s.
Account Manager: %s. Meeting date: %s.
Current services: %s.
RAW MEETING NOTES:
%s`,
		entity.TenantContext,
		entity.EntityName,
		entity.Sector,
		entity.Country,
		entity.AccountManager,
		meetingDate.Format("2006-01-02"),
		entity.Services,
		activity.Notes)
}

func parseMeetingOutput(raw string) (MeetingAnalysisOutput, error) {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)
	var output MeetingAnalysisOutput
	if err := json.Unmarshal([]byte(raw), &output); err != nil {
		return MeetingAnalysisOutput{}, err
	}
	if output.Summary == "" {
		return MeetingAnalysisOutput{}, errors.New("meeting analysis missing summary")
	}
	return output, nil
}

func canAnalyzeMeeting(user auth.UserContext, activity meetingActivity) bool {
	if activity.UserID == user.ID {
		return true
	}
	switch user.Role {
	case middleware.RoleCountryGM, middleware.RoleHOB, middleware.RoleCEO, middleware.RoleAdmin:
		return true
	default:
		return false
	}
}
