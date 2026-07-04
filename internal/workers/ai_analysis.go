package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rabbitmq/amqp091-go"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"github.com/htgclouds/crm-api/internal/modules/ai"
	"github.com/htgclouds/crm-api/internal/queue"
)

const (
	crossSellModel        = "gpt-4o-mini"
	recommendationQueue   = "htgcrm.notifications.new_recommendation"
	crossSellSystemPrompt = "You are a cloud sales advisor for HTG Clouds, a Huawei Cloud partner in East Africa. Write a concise, specific cross-sell recommendation for an account manager. Use the tenant data provided. Be concrete. Under 100 words. No markdown."
)

type AIAnalysisWorker struct {
	postgres   *pgxpool.Pool
	clickhouse clickhouse.Conn
	openai     *ai.OpenAIClient
	publisher  *queue.Publisher
	redis      *redis.Client
	amqpURL    string
	logger     zerolog.Logger
}

type AIAnalysisWorkerConfig struct {
	AMQPURL string
}

type crossSellTenant struct {
	ID               uuid.UUID
	Name             string
	Sector           string
	Country          string
	AccountManagerID uuid.UUID
	RiskScore        float64
	Services         map[string]float64
	VMCount          float64
	StorageTB        float64
	MoMGrowth        float64
}

type crossSellRule struct {
	Name               string
	Category           string
	RecommendedService string
	Priority           int
	Confidence         float64
	MinValue           float64
	MaxValue           float64
	TitleTemplate      string
	Condition          func(crossSellTenant) bool
}

func NewAIAnalysisWorker(postgres *pgxpool.Pool, clickhouseConn clickhouse.Conn, openaiClient *ai.OpenAIClient, publisher *queue.Publisher, redisClient *redis.Client, logger zerolog.Logger, cfg AIAnalysisWorkerConfig) *AIAnalysisWorker {
	return &AIAnalysisWorker{
		postgres:   postgres,
		clickhouse: clickhouseConn,
		openai:     openaiClient,
		publisher:  publisher,
		redis:      redisClient,
		amqpURL:    cfg.AMQPURL,
		logger:     logger,
	}
}

func StartAIAnalysis(ctx context.Context, logger zerolog.Logger, workers ...*AIAnalysisWorker) {
	if len(workers) == 0 || workers[0] == nil {
		go runEvery(ctx, logger, "ai_analysis", 30*time.Minute)
		return
	}
	go workers[0].Consume(ctx)
}

func (w *AIAnalysisWorker) Consume(ctx context.Context) {
	if w.amqpURL == "" {
		w.logger.Warn().Msg("ai_analysis_amqp_url_missing")
		return
	}
	conn, err := amqp091.Dial(w.amqpURL)
	if err != nil {
		w.logger.Error().Err(err).Msg("ai_analysis_connect_failed")
		return
	}
	defer conn.Close()
	ch, err := conn.Channel()
	if err != nil {
		w.logger.Error().Err(err).Msg("ai_analysis_channel_failed")
		return
	}
	defer ch.Close()
	q, err := ch.QueueDeclare(nightlySyncQueue, true, false, false, false, nil)
	if err != nil {
		w.logger.Error().Err(err).Msg("ai_analysis_queue_declare_failed")
		return
	}
	deliveries, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		w.logger.Error().Err(err).Msg("ai_analysis_consume_failed")
		return
	}
	for {
		select {
		case <-ctx.Done():
			return
		case delivery, ok := <-deliveries:
			if !ok {
				return
			}
			if err := w.RunCrossSell(ctx); err != nil {
				w.logger.Error().Err(err).Msg("ai_cross_sell_failed")
				_ = delivery.Nack(false, true)
				continue
			}
			_ = delivery.Ack(false)
		}
	}
}

func (w *AIAnalysisWorker) RunCrossSell(ctx context.Context) error {
	tenants, err := w.loadTenants(ctx)
	if err != nil {
		return err
	}
	for _, tenant := range tenants {
		tenant := tenant
		if err := w.enrichUsage(ctx, &tenant); err != nil {
			w.logger.Error().Err(err).Str("tenant_id", tenant.ID.String()).Msg("cross_sell_usage_enrichment_failed")
			continue
		}
		firedCategories := map[string]struct{}{}
		for _, rule := range crossSellRules() {
			if _, fired := firedCategories[rule.Category]; fired {
				continue
			}
			if !rule.Condition(tenant) {
				continue
			}
			firedCategories[rule.Category] = struct{}{}
			if err := w.createRecommendation(ctx, tenant, rule); err != nil {
				w.logger.Error().Err(err).Str("tenant_id", tenant.ID.String()).Str("rule", rule.Name).Msg("cross_sell_recommendation_failed")
			}
		}
	}
	return nil
}

func (w *AIAnalysisWorker) loadTenants(ctx context.Context) ([]crossSellTenant, error) {
	rows, err := w.postgres.Query(ctx, `
		SELECT t.id, t.name, s.name, c.name, t.account_manager_id, t.risk_score
		FROM tenants t
		JOIN sectors s ON s.id = t.sector_id
		JOIN country_offices c ON c.id = t.country_id
		WHERE t.status IN ('ACTIVE'::tenant_status, 'AT_RISK'::tenant_status)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tenants := []crossSellTenant{}
	for rows.Next() {
		tenant := crossSellTenant{Services: map[string]float64{}}
		if err := rows.Scan(&tenant.ID, &tenant.Name, &tenant.Sector, &tenant.Country, &tenant.AccountManagerID, &tenant.RiskScore); err != nil {
			return nil, err
		}
		if tenant.Services, err = w.loadServices(ctx, tenant.ID); err != nil {
			return nil, err
		}
		tenants = append(tenants, tenant)
	}
	return tenants, rows.Err()
}

func (w *AIAnalysisWorker) loadServices(ctx context.Context, tenantID uuid.UUID) (map[string]float64, error) {
	rows, err := w.postgres.Query(ctx, `
		SELECT UPPER(COALESCE(NULLIF(service_code, ''), service_name)), monthly_usd
		FROM tenant_services
		WHERE tenant_id = $1 AND status = 'ACTIVE'::service_status`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	services := map[string]float64{}
	for rows.Next() {
		var service string
		var monthly float64
		if err := rows.Scan(&service, &monthly); err != nil {
			return nil, err
		}
		services[normalizeService(service)] += monthly
	}
	return services, rows.Err()
}

func (w *AIAnalysisWorker) enrichUsage(ctx context.Context, tenant *crossSellTenant) error {
	if w.clickhouse == nil {
		return nil
	}
	_ = w.clickhouse.QueryRow(ctx, `
		SELECT COALESCE(sum(total_value), 0)
		FROM tenant_analytics.daily_usage_summary
		WHERE tenant_id = ? AND service_type = 'VM' AND metric_name = 'instance_count' AND date >= today() - 30`, tenant.ID).Scan(&tenant.VMCount)
	_ = w.clickhouse.QueryRow(ctx, `
		SELECT COALESCE(sum(total_value), 0)
		FROM tenant_analytics.daily_usage_summary
		WHERE tenant_id = ? AND service_type = 'OBJECT_STORAGE' AND metric_name = 'storage_tb' AND date >= today() - 30`, tenant.ID).Scan(&tenant.StorageTB)
	rows, err := w.clickhouse.Query(ctx, `
		SELECT total_billing_usd
		FROM tenant_analytics.monthly_billing_summary
		WHERE tenant_id = ?
		ORDER BY month DESC
		LIMIT 2`, tenant.ID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	values := []float64{}
	for rows.Next() {
		var value float64
		if err := rows.Scan(&value); err != nil {
			return err
		}
		values = append(values, value)
	}
	if len(values) == 2 && values[1] > 0 {
		tenant.MoMGrowth = ((values[0] - values[1]) / values[1]) * 100
	}
	return rows.Err()
}

func (w *AIAnalysisWorker) createRecommendation(ctx context.Context, tenant crossSellTenant, rule crossSellRule) error {
	exists, err := w.recommendationExists(ctx, tenant.ID, rule.RecommendedService)
	if err != nil || exists {
		return err
	}
	value := estimateValue(rule, tenant)
	body, err := w.generateBody(ctx, tenant, rule, value)
	if err != nil {
		body = fallbackBody(tenant, rule, value)
	}
	confidence := rule.Confidence * ((tenant.RiskScore/100)*0.1 + 0.9)
	if confidence > 1 {
		confidence = 1
	}
	metadata, err := json.Marshal(map[string]any{"rule_name": rule.Name, "service_category": rule.Category})
	if err != nil {
		return err
	}
	var recommendationID uuid.UUID
	err = w.postgres.QueryRow(ctx, `
		INSERT INTO ai_recommendations
			(tenant_id, type, status, title, message, priority, confidence, metadata, recommended_service, estimated_monthly_value_usd)
		VALUES
			($1, 'CROSS_SELL'::ai_recommendation_type, 'NEW'::ai_recommendation_status, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id`,
		tenant.ID, fmt.Sprintf(rule.TitleTemplate, tenant.Name), body, fmt.Sprintf("%d", rule.Priority), confidence,
		metadata, rule.RecommendedService, value).Scan(&recommendationID)
	if err != nil {
		return err
	}
	_ = ai.InvalidateCoachCache(ctx, w.redis, tenant.AccountManagerID, time.Now().UTC())
	if w.publisher != nil {
		return w.publisher.PublishQueueJSON(ctx, recommendationQueue, map[string]any{
			"user_id":           tenant.AccountManagerID,
			"recommendation_id": recommendationID,
		})
	}
	return nil
}

func (w *AIAnalysisWorker) recommendationExists(ctx context.Context, tenantID uuid.UUID, service string) (bool, error) {
	var exists bool
	err := w.postgres.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM ai_recommendations
			WHERE tenant_id = $1
				AND recommended_service = $2
				AND type = 'CROSS_SELL'::ai_recommendation_type
				AND (status = 'NEW'::ai_recommendation_status OR (status = 'DISMISSED'::ai_recommendation_status AND dismissed_until > CURRENT_DATE))
		)`, tenantID, service).Scan(&exists)
	return exists, err
}

func (w *AIAnalysisWorker) generateBody(ctx context.Context, tenant crossSellTenant, rule crossSellRule, value float64) (string, error) {
	userPrompt := fmt.Sprintf(`Tenant: %s. Sector: %s. Country: %s.
Current services and monthly spend: %s.
VM count: %.0f. Storage: %.2fTB. MoM billing change: %+.1f%%.
Rule triggered: %s. Estimated upsell value: USD %.0f/month.
Write the recommendation body.`, tenant.Name, tenant.Sector, tenant.Country, serviceSpend(tenant.Services), tenant.VMCount, tenant.StorageTB, tenant.MoMGrowth, rule.Name, value)
	return w.openai.Chat(ctx, crossSellModel, crossSellSystemPrompt, userPrompt, 120, 0.3)
}

func crossSellRules() []crossSellRule {
	return []crossSellRule{
		{Name: "MISSING_BACKUP", Category: "BACKUP", RecommendedService: "BACKUP", Priority: 1, Confidence: 0.90, MinValue: 800, MaxValue: 2000, TitleTemplate: "Backup-as-a-Service for %s", Condition: func(t crossSellTenant) bool {
			return hasService(t, "VM") && !hasService(t, "BACKUP")
		}},
		{Name: "MISSING_DR", Category: "DISASTER_RECOVERY", RecommendedService: "DISASTER_RECOVERY", Priority: 2, Confidence: 0.88, MinValue: 2000, MaxValue: 8000, TitleTemplate: "Disaster Recovery for Critical Workloads - %s", Condition: func(t crossSellTenant) bool {
			return t.VMCount >= 10 && !hasService(t, "DISASTER_RECOVERY") && sectorIn(t.Sector, "BANKING", "TELECOM", "GOV", "GOVERNMENT")
		}},
		{Name: "MISSING_DB_MANAGED", Category: "MANAGED_SERVICE", RecommendedService: "MANAGED_SERVICE", Priority: 3, Confidence: 0.85, MinValue: 1500, MaxValue: 5000, TitleTemplate: "Managed Database Service Upgrade - %s", Condition: func(t crossSellTenant) bool {
			return hasService(t, "DATABASE") && t.Services["DATABASE"] > 500 && !hasService(t, "MANAGED_SERVICE")
		}},
		{Name: "MISSING_SECURITY", Category: "SECURITY", RecommendedService: "SECURITY", Priority: 4, Confidence: 0.92, MinValue: 1000, MaxValue: 4000, TitleTemplate: "Cloud Security Package - %s", Condition: func(t crossSellTenant) bool {
			return sectorIn(t.Sector, "BANKING", "GOVERNMENT", "GOV", "FINTECH") && !hasService(t, "SECURITY")
		}},
		{Name: "MISSING_MONITORING", Category: "MONITORING", RecommendedService: "MONITORING", Priority: 5, Confidence: 0.75, MinValue: 300, MaxValue: 800, TitleTemplate: "Cloud Eye Monitoring - %s", Condition: func(t crossSellTenant) bool {
			return t.VMCount >= 5 && !hasService(t, "MONITORING")
		}},
		{Name: "STORAGE_GROWTH", Category: "OBJECT_STORAGE", RecommendedService: "OBJECT_STORAGE_OPTIMIZATION", Priority: 6, Confidence: 0.80, MinValue: 500, MaxValue: 2000, TitleTemplate: "OBS Storage Tier Optimisation - %s", Condition: func(t crossSellTenant) bool {
			return t.MoMGrowth > 30
		}},
	}
}

func hasService(t crossSellTenant, service string) bool {
	_, ok := t.Services[service]
	return ok
}

func sectorIn(sector string, values ...string) bool {
	sector = normalizeService(sector)
	for _, value := range values {
		if sector == normalizeService(value) {
			return true
		}
	}
	return false
}

func normalizeService(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, "-", "_")
	value = strings.ReplaceAll(value, " ", "_")
	if strings.Contains(value, "VM") || strings.Contains(value, "ECS") {
		return "VM"
	}
	if strings.Contains(value, "BACKUP") {
		return "BACKUP"
	}
	if strings.Contains(value, "DISASTER") || value == "DR" {
		return "DISASTER_RECOVERY"
	}
	if strings.Contains(value, "DATABASE") || strings.Contains(value, "RDS") {
		return "DATABASE"
	}
	if strings.Contains(value, "MANAGED") {
		return "MANAGED_SERVICE"
	}
	if strings.Contains(value, "SECURITY") {
		return "SECURITY"
	}
	if strings.Contains(value, "MONITOR") || strings.Contains(value, "CLOUD_EYE") {
		return "MONITORING"
	}
	if strings.Contains(value, "OBJECT") || strings.Contains(value, "OBS") || strings.Contains(value, "STORAGE") {
		return "OBJECT_STORAGE"
	}
	return value
}

func estimateValue(rule crossSellRule, tenant crossSellTenant) float64 {
	if rule.Name == "MISSING_BACKUP" && tenant.VMCount > 0 {
		return math.Max(rule.MinValue, math.Min(rule.MaxValue, tenant.VMCount*120))
	}
	return (rule.MinValue + rule.MaxValue) / 2
}

func fallbackBody(tenant crossSellTenant, rule crossSellRule, value float64) string {
	if rule.Name == "MISSING_BACKUP" {
		return fmt.Sprintf("%s is running %.0f VMs with no backup solution. A ransomware attack or accidental deletion would cause complete data loss. HCS backup services can protect all VMs automatically. Estimated cost: $%.0f/month for %.0f VMs.", tenant.Name, tenant.VMCount, value, tenant.VMCount)
	}
	return fmt.Sprintf("%s matches %s. Estimated upsell value is USD %.0f/month based on current services, usage, and sector risk.", tenant.Name, rule.Name, value)
}

func serviceSpend(services map[string]float64) string {
	if len(services) == 0 {
		return "none"
	}
	parts := []string{}
	for service, spend := range services {
		parts = append(parts, fmt.Sprintf("%s $%.0f/month", service, spend))
	}
	body, _ := json.Marshal(parts)
	return string(body)
}
