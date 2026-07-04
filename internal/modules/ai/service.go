package ai

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/htgclouds/crm-api/internal/middleware"
	"github.com/htgclouds/crm-api/internal/modules/targets"
)

type Service struct {
	client     *OpenAIClient
	rag        *RAGStore
	db         *pgxpool.Pool
	redis      *redis.Client
	targetRepo targets.TargetRepository
}

func NewService(client *OpenAIClient, rag *RAGStore, db *pgxpool.Pool, redisClient *redis.Client, targetRepo targets.TargetRepository) *Service {
	return &Service{client: client, rag: rag, db: db, redis: redisClient, targetRepo: targetRepo}
}

func (s *Service) Recommendations(ctx context.Context) ([]Recommendation, error) {
	scopeSQL := "TRUE"
	args := []any{}
	if userID, ok := middleware.FilterUserID(ctx); ok {
		args = append(args, userID)
		scopeSQL = "t.account_manager_id = $1"
	}
	if countryID, ok := middleware.FilterCountryID(ctx); ok {
		args = append(args, countryID)
		scopeSQL = "t.country_id = $1"
	}
	rows, err := s.db.Query(ctx, `
		SELECT ar.id::text, COALESCE(ar.tenant_id::text, ''), COALESCE(t.name, ''), ar.title, ar.message, ar.priority,
			COALESCE(ar.recommended_service, ''), COALESCE(ar.estimated_monthly_value_usd, 0)
		FROM ai_recommendations ar
		LEFT JOIN tenants t ON t.id = ar.tenant_id
		WHERE ar.status = 'NEW'::ai_recommendation_status AND `+scopeSQL+`
		ORDER BY ar.created_at DESC
		LIMIT 20`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Recommendation{}
	for rows.Next() {
		item := Recommendation{}
		if err := rows.Scan(&item.ID, &item.TenantID, &item.TenantName, &item.Title, &item.Message, &item.Priority, &item.RecommendedService, &item.EstimatedMonthlyValueUSD); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) UpdateRecommendationStatus(ctx context.Context, id string, status string) error {
	status = strings.ToUpper(strings.TrimSpace(status))
	if status == "" {
		status = "DISMISSED"
	}
	_, err := s.db.Exec(ctx, `UPDATE ai_recommendations SET status = $1::ai_recommendation_status WHERE id = $2`, status, id)
	return err
}

func (s *Service) OverdueActivities(ctx context.Context, userID uuid.UUID, limitRaw string) ([]OverdueActivity, error) {
	limit, err := strconv.Atoi(limitRaw)
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}
	rows, err := s.db.Query(ctx, `
		SELECT a.id::text, a.type::text, a.subject,
			COALESCE(t.name, l.company_name, 'CRM item') AS entity_name,
			CASE WHEN t.id IS NOT NULL THEN 'tenant' WHEN l.id IS NOT NULL THEN 'lead' ELSE 'activity' END AS entity_type,
			COALESCE(t.id::text, l.id::text, a.id::text) AS entity_id,
			a.next_action_date,
			(CURRENT_DATE - a.next_action_date)::int AS days_overdue
		FROM activities a
		LEFT JOIN tenants t ON t.id = a.tenant_id
		LEFT JOIN leads l ON l.id = a.lead_id
		WHERE a.user_id = $1 AND a.next_action_date < CURRENT_DATE AND a.next_action_date IS NOT NULL
		ORDER BY a.next_action_date ASC
		LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []OverdueActivity{}
	for rows.Next() {
		item := OverdueActivity{}
		var nextAction time.Time
		if err := rows.Scan(&item.ID, &item.Type, &item.Subject, &item.EntityName, &item.EntityType, &item.EntityID, &nextAction, &item.DaysOverdue); err != nil {
			return nil, err
		}
		item.NextActionDate = nextAction.Format("2006-01-02")
		items = append(items, item)
	}
	return items, rows.Err()
}
