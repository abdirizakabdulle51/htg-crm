package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/errgroup"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/modules/targets"
)

const coachSystemPrompt = "You are a direct, motivating sales coach for an HTG Clouds account manager. HTG Clouds sells Huawei Cloud services in East Africa (Somalia, Kenya, Ethiopia, Djibouti). Generate a personalized daily briefing. Use ONLY the data provided. Never invent numbers, tenant names, or statistics. Return valid JSON matching the schema exactly - no extra text."

type DailyBrief struct {
	Greeting           string   `json:"greeting"`
	HealthSummary      string   `json:"health_summary"`
	Top3Actions        []string `json:"top_3_actions"`
	CrossSellAlerts    []string `json:"cross_sell_alerts"`
	RenewalWarnings    []string `json:"renewal_warnings"`
	DailyTargetMessage string   `json:"daily_target_message"`
	SalesTip           string   `json:"sales_tip"`
}

type coachUser struct {
	ID      uuid.UUID
	Name    string
	Country string
}

type coachPipelineDeal struct {
	Name             string
	Stage            int
	ValueUSD         float64
	LastActivityDays int
	Stale            bool
}

type coachTask struct {
	Subject     string
	EntityName  string
	DaysOverdue int
}

type coachRenewal struct {
	TenantName string
	DaysUntil  int
}

type coachRecommendation struct {
	Title             string
	EstimatedValueUSD float64
}

type coachRiskTenant struct {
	Name      string
	RiskScore int
}

type coachData struct {
	User            coachUser
	Health          targets.TargetHealth
	Pipeline        []coachPipelineDeal
	OverdueTasks    []coachTask
	Renewals        []coachRenewal
	Recommendations []coachRecommendation
	RiskTenants     []coachRiskTenant
}

func (s *Service) DailyBrief(ctx context.Context, user auth.UserContext, today time.Time) (DailyBrief, error) {
	dateKey := today.Format("2006-01-02")
	cacheKey := fmt.Sprintf("htgcrm:coach:%s:%s", user.ID.String(), dateKey)
	if s.redis != nil {
		if raw, err := s.redis.Get(ctx, cacheKey).Bytes(); err == nil && len(raw) > 0 {
			var cached DailyBrief
			if json.Unmarshal(raw, &cached) == nil {
				return cached, nil
			}
		}
	}

	data, err := s.collectCoachData(ctx, user.ID, today)
	if err != nil {
		return DailyBrief{}, err
	}
	brief, err := s.generateCoachBrief(ctx, data, today)
	if err != nil {
		brief = fallbackCoachBrief(data)
	}
	if s.redis != nil {
		if body, err := json.Marshal(brief); err == nil {
			_ = s.redis.Set(ctx, cacheKey, body, 4*time.Hour).Err()
		}
	}
	return brief, nil
}

func (s *Service) collectCoachData(ctx context.Context, userID uuid.UUID, today time.Time) (coachData, error) {
	data := coachData{}
	var mu sync.Mutex
	group, groupCtx := errgroup.WithContext(ctx)

	group.Go(func() error {
		user, err := s.loadCoachUser(groupCtx, userID)
		mu.Lock()
		data.User = user
		mu.Unlock()
		return err
	})
	group.Go(func() error {
		health, err := targets.CalculateDailyHealth(groupCtx, s.targetRepo, userID, today)
		mu.Lock()
		data.Health = health
		mu.Unlock()
		return err
	})
	group.Go(func() error {
		items, err := s.loadActivePipeline(groupCtx, userID, today)
		mu.Lock()
		data.Pipeline = items
		mu.Unlock()
		return err
	})
	group.Go(func() error {
		items, err := s.loadOverdueTasks(groupCtx, userID, today)
		mu.Lock()
		data.OverdueTasks = items
		mu.Unlock()
		return err
	})
	group.Go(func() error {
		items, err := s.loadUpcomingRenewals(groupCtx, userID, today)
		mu.Lock()
		data.Renewals = items
		mu.Unlock()
		return err
	})
	group.Go(func() error {
		items, err := s.loadNewRecommendations(groupCtx, userID)
		mu.Lock()
		data.Recommendations = items
		mu.Unlock()
		return err
	})
	group.Go(func() error {
		items, err := s.loadAtRiskTenants(groupCtx, userID)
		mu.Lock()
		data.RiskTenants = items
		mu.Unlock()
		return err
	})

	return data, group.Wait()
}

func (s *Service) generateCoachBrief(ctx context.Context, data coachData, today time.Time) (DailyBrief, error) {
	raw, err := s.client.Chat(ctx, "gpt-4o-mini", coachSystemPrompt, buildCoachPrompt(data, today), 500, 0.4)
	if err != nil {
		return DailyBrief{}, err
	}
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)
	var brief DailyBrief
	if err := json.Unmarshal([]byte(raw), &brief); err != nil {
		return DailyBrief{}, err
	}
	return brief, nil
}

func (s *Service) loadCoachUser(ctx context.Context, userID uuid.UUID) (coachUser, error) {
	item := coachUser{ID: userID}
	err := s.db.QueryRow(ctx, `
		SELECT u.full_name, COALESCE(c.name, '')
		FROM users u
		LEFT JOIN country_offices c ON c.id = u.country_office_id
		WHERE u.id = $1`, userID).Scan(&item.Name, &item.Country)
	return item, err
}

func (s *Service) loadActivePipeline(ctx context.Context, userID uuid.UUID, today time.Time) ([]coachPipelineDeal, error) {
	rows, err := s.db.Query(ctx, `
		SELECT l.company_name, l.stage_number, l.value_usd, max(a.created_at)::date
		FROM leads l
		LEFT JOIN activities a ON a.lead_id = l.id
		WHERE l.owner_id = $1 AND l.stage_number BETWEEN 3 AND 8
		GROUP BY l.id
		ORDER BY l.value_usd DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []coachPipelineDeal{}
	for rows.Next() {
		var lastActivity *time.Time
		item := coachPipelineDeal{}
		if err := rows.Scan(&item.Name, &item.Stage, &item.ValueUSD, &lastActivity); err != nil {
			return nil, err
		}
		if lastActivity == nil {
			item.LastActivityDays = 999
		} else {
			item.LastActivityDays = int(today.Sub(*lastActivity).Hours() / 24)
		}
		item.Stale = item.LastActivityDays > 7
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) loadOverdueTasks(ctx context.Context, userID uuid.UUID, today time.Time) ([]coachTask, error) {
	rows, err := s.db.Query(ctx, `
		SELECT a.subject, COALESCE(l.company_name, t.name, 'CRM item'), (CURRENT_DATE - a.next_action_date)::int
		FROM activities a
		LEFT JOIN leads l ON l.id = a.lead_id
		LEFT JOIN tenants t ON t.id = a.tenant_id
		WHERE a.user_id = $1 AND a.next_action_date < CURRENT_DATE AND a.next_action_date IS NOT NULL
		ORDER BY a.next_action_date ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []coachTask{}
	for rows.Next() {
		item := coachTask{}
		if err := rows.Scan(&item.Subject, &item.EntityName, &item.DaysOverdue); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) loadUpcomingRenewals(ctx context.Context, userID uuid.UUID, today time.Time) ([]coachRenewal, error) {
	rows, err := s.db.Query(ctx, `
		SELECT t.name, (c.end_date - CURRENT_DATE)::int
		FROM contracts c
		JOIN tenants t ON t.id = c.tenant_id
		WHERE t.account_manager_id = $1
			AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '30 days'
		ORDER BY c.end_date ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []coachRenewal{}
	for rows.Next() {
		item := coachRenewal{}
		if err := rows.Scan(&item.TenantName, &item.DaysUntil); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) loadNewRecommendations(ctx context.Context, userID uuid.UUID) ([]coachRecommendation, error) {
	rows, err := s.db.Query(ctx, `
		SELECT ar.title, COALESCE(ar.estimated_monthly_value_usd, 0)
		FROM ai_recommendations ar
		JOIN tenants t ON t.id = ar.tenant_id
		WHERE t.account_manager_id = $1 AND ar.status = 'NEW'::ai_recommendation_status
		ORDER BY ar.created_at DESC
		LIMIT 3`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []coachRecommendation{}
	for rows.Next() {
		item := coachRecommendation{}
		if err := rows.Scan(&item.Title, &item.EstimatedValueUSD); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) loadAtRiskTenants(ctx context.Context, userID uuid.UUID) ([]coachRiskTenant, error) {
	rows, err := s.db.Query(ctx, `
		SELECT name, risk_score
		FROM tenants
		WHERE account_manager_id = $1 AND risk_score >= 60
		ORDER BY risk_score DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []coachRiskTenant{}
	for rows.Next() {
		item := coachRiskTenant{}
		var riskScore float64
		if err := rows.Scan(&item.Name, &riskScore); err != nil {
			return nil, err
		}
		item.RiskScore = int(math.Round(riskScore))
		items = append(items, item)
	}
	return items, rows.Err()
}

func buildCoachPrompt(data coachData, today time.Time) string {
	pipelineTotal := 0.0
	for _, deal := range data.Pipeline {
		pipelineTotal += deal.ValueUSD
	}
	return fmt.Sprintf(`User name: %s. Date: %s. Country: %s.
TARGET STATUS: Health=%s, Quarterly target=%.2f, Achieved=%.2f, Gap=%.2f, Required daily pace=%.2f/day, %d days left.
ACTIVE PIPELINE (%d deals, total value=%.2f):
%s
OVERDUE TASKS (%d): %s
AT-RISK TENANTS (%d): %s
NEW AI RECOMMENDATIONS (%d): %s
UPCOMING RENEWALS (%d): %s`,
		data.User.Name, today.Format("2006-01-02"), data.User.Country,
		data.Health.Health, data.Health.QuarterlyTargetUSD, data.Health.AchievedUSD, data.Health.GapUSD, data.Health.RequiredDailyPaceUSD, data.Health.WorkingDaysRemaining,
		len(data.Pipeline), pipelineTotal, formatPipelineDeals(data.Pipeline),
		len(data.OverdueTasks), formatTasks(data.OverdueTasks),
		len(data.RiskTenants), formatRiskTenants(data.RiskTenants),
		len(data.Recommendations), formatRecommendations(data.Recommendations),
		len(data.Renewals), formatRenewals(data.Renewals))
}

func fallbackCoachBrief(data coachData) DailyBrief {
	return DailyBrief{
		Greeting:           fmt.Sprintf("Good morning %s,", data.User.Name),
		HealthSummary:      data.Health.AIAdvice,
		Top3Actions:        topTasks(data.OverdueTasks, 3),
		CrossSellAlerts:    topRecommendations(data.Recommendations, 3),
		RenewalWarnings:    topRenewals(data.Renewals),
		DailyTargetMessage: data.Health.AIAdvice,
		SalesTip:           "",
	}
}

func formatPipelineDeals(items []coachPipelineDeal) string {
	if len(items) == 0 {
		return "- none"
	}
	lines := []string{}
	for _, item := range items {
		lines = append(lines, fmt.Sprintf("- %s (Stage %d, $%.2f, last activity %d days ago, stale=%t)", item.Name, item.Stage, item.ValueUSD, item.LastActivityDays, item.Stale))
	}
	return strings.Join(lines, "\n")
}

func formatTasks(items []coachTask) string {
	if len(items) == 0 {
		return "none"
	}
	lines := []string{}
	for _, item := range items {
		lines = append(lines, fmt.Sprintf("- %s for %s (%d days overdue)", item.Subject, item.EntityName, item.DaysOverdue))
	}
	return strings.Join(lines, "\n")
}

func formatRiskTenants(items []coachRiskTenant) string {
	if len(items) == 0 {
		return "none"
	}
	lines := []string{}
	for _, item := range items {
		lines = append(lines, fmt.Sprintf("- %s risk_score=%d", item.Name, item.RiskScore))
	}
	return strings.Join(lines, "\n")
}

func formatRecommendations(items []coachRecommendation) string {
	if len(items) == 0 {
		return "none"
	}
	lines := []string{}
	for _, item := range items {
		lines = append(lines, fmt.Sprintf("- %s (est. $%.2f/mo)", item.Title, item.EstimatedValueUSD))
	}
	return strings.Join(lines, "\n")
}

func formatRenewals(items []coachRenewal) string {
	if len(items) == 0 {
		return "none"
	}
	lines := []string{}
	for _, item := range items {
		lines = append(lines, fmt.Sprintf("- %s expires in %d days", item.TenantName, item.DaysUntil))
	}
	return strings.Join(lines, "\n")
}

func topTasks(items []coachTask, limit int) []string {
	out := []string{}
	for i, item := range items {
		if i >= limit {
			break
		}
		out = append(out, fmt.Sprintf("%s for %s (%d days overdue)", item.Subject, item.EntityName, item.DaysOverdue))
	}
	return out
}

func topRecommendations(items []coachRecommendation, limit int) []string {
	out := []string{}
	for i, item := range items {
		if i >= limit {
			break
		}
		out = append(out, fmt.Sprintf("%s (est. $%.2f/mo)", item.Title, item.EstimatedValueUSD))
	}
	return out
}

func topRenewals(items []coachRenewal) []string {
	out := []string{}
	for _, item := range items {
		out = append(out, fmt.Sprintf("%s expires in %d days", item.TenantName, item.DaysUntil))
	}
	return out
}

func CoachCacheKey(userID uuid.UUID, today time.Time) string {
	return fmt.Sprintf("htgcrm:coach:%s:%s", userID.String(), today.Format("2006-01-02"))
}

func InvalidateCoachCache(ctx context.Context, redisClient *redis.Client, userID uuid.UUID, today time.Time) error {
	if redisClient == nil {
		return nil
	}
	return redisClient.Del(ctx, CoachCacheKey(userID, today)).Err()
}
