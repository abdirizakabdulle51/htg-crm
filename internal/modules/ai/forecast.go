package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/middleware"
	"github.com/htgclouds/crm-api/internal/modules/targets"
)

const forecastSystemPrompt = "You are a revenue analyst for HTG Clouds. Provide a concise forecast narrative and identify the top risks and opportunities. Use only the data provided. Be specific."

type RevenueForecast struct {
	Period                 string   `json:"period"`
	Scope                  string   `json:"scope"`
	StatisticalForecastUSD float64  `json:"statistical_forecast_usd"`
	AdjustedForecastUSD    float64  `json:"adjusted_forecast_usd"`
	TargetUSD              float64  `json:"target_usd"`
	ForecastVsTargetPct    float64  `json:"forecast_vs_target_pct"`
	Confidence             string   `json:"confidence"`
	Narrative              string   `json:"narrative"`
	TopRisks               []string `json:"top_risks"`
	TopOpportunities       []string `json:"top_opportunities"`
	RecommendedActions     []string `json:"recommended_actions"`
}

type forecastNarrative struct {
	Confidence         string   `json:"confidence"`
	Narrative          string   `json:"narrative"`
	TopRisks           []string `json:"top_risks"`
	TopOpportunities   []string `json:"top_opportunities"`
	RecommendedActions []string `json:"recommended_actions"`
}

type forecastInputs struct {
	PeriodLabel      string
	ScopeLabel       string
	ScopeKey         string
	TargetUSD        float64
	AchievedUSD      float64
	TargetPct        float64
	WeightedPipeline float64
	ConversionRate   float64
	BaseForecast     float64
	ChurnRisk        float64
	AdjustedForecast float64
	RenewalUSD       float64
	AtRiskCount      int
	AvgDealsPerMonth float64
	AvgDealCycleDays int
}

func (s *Service) RevenueForecast(ctx context.Context, user auth.UserContext, scope string, now time.Time) (RevenueForecast, error) {
	if scope == "" {
		scope = "quarter"
	}
	scope = strings.ToLower(strings.TrimSpace(scope))
	if scope != "quarter" && scope != "year" {
		scope = "quarter"
	}
	inputs, err := s.collectForecastInputs(ctx, user, scope, now)
	if err != nil {
		return RevenueForecast{}, err
	}
	cacheKey := fmt.Sprintf("htgcrm:forecast:%s:%s", inputs.ScopeKey, inputs.PeriodLabel)
	if s.redis != nil {
		if raw, err := s.redis.Get(ctx, cacheKey).Bytes(); err == nil && len(raw) > 0 {
			var cached RevenueForecast
			if json.Unmarshal(raw, &cached) == nil {
				return cached, nil
			}
		}
	}
	forecast := RevenueForecast{
		Period:                 inputs.PeriodLabel,
		Scope:                  inputs.ScopeLabel,
		StatisticalForecastUSD: roundForecastMoney(inputs.BaseForecast),
		AdjustedForecastUSD:    roundForecastMoney(inputs.AdjustedForecast),
		TargetUSD:              roundForecastMoney(inputs.TargetUSD),
		ForecastVsTargetPct:    percent(inputs.AdjustedForecast, inputs.TargetUSD),
		Confidence:             "MEDIUM",
	}
	narrative, err := s.generateForecastNarrative(ctx, inputs)
	if err == nil {
		forecast.Confidence = defaultString(narrative.Confidence, forecast.Confidence)
		forecast.Narrative = narrative.Narrative
		forecast.TopRisks = narrative.TopRisks
		forecast.TopOpportunities = narrative.TopOpportunities
		forecast.RecommendedActions = narrative.RecommendedActions
	} else {
		forecast.Narrative = fmt.Sprintf("Adjusted forecast is $%.0f against a target of $%.0f. Weighted pipeline and churn risk are the main drivers.", inputs.AdjustedForecast, inputs.TargetUSD)
		forecast.TopRisks = []string{fmt.Sprintf("Churn risk from %d at-risk tenants totals $%.0f.", inputs.AtRiskCount, inputs.ChurnRisk)}
		forecast.TopOpportunities = []string{fmt.Sprintf("Weighted pipeline contributes $%.0f before conversion adjustment.", inputs.WeightedPipeline)}
		forecast.RecommendedActions = []string{"Prioritize late-stage pipeline and renewal protection this week."}
	}
	if s.redis != nil {
		if body, err := json.Marshal(forecast); err == nil {
			_ = s.redis.Set(ctx, cacheKey, body, 30*time.Minute).Err()
		}
	}
	return forecast, nil
}

func (s *Service) collectForecastInputs(ctx context.Context, user auth.UserContext, scope string, now time.Time) (forecastInputs, error) {
	start, end, label := forecastPeriod(scope, now)
	scopeSQL, args, scopeKey, scopeLabel := leadScope(user, 3)
	inputs := forecastInputs{PeriodLabel: label, ScopeLabel: scopeLabel, ScopeKey: scopeKey}

	health, err := targets.CalculateDailyHealth(ctx, s.targetRepo, user.ID, now)
	if err == nil {
		inputs.TargetUSD = health.QuarterlyTargetUSD
		inputs.AchievedUSD = health.AchievedUSD
		inputs.TargetPct = percent(health.AchievedUSD, health.QuarterlyTargetUSD)
	}
	if scope == "year" {
		inputs.TargetUSD, _ = s.sumTargetForScope(ctx, user, now.Year())
	} else {
		inputs.TargetUSD, _ = s.sumQuarterTargetForScope(ctx, user, now.Year(), int((now.Month()-1)/3)+1)
	}
	if err := s.db.QueryRow(ctx, `
		SELECT COALESCE(sum(COALESCE(potential_value_usd, value_usd) * probability), 0)
		FROM leads
		WHERE stage_number BETWEEN 2 AND 8 AND expected_close_date BETWEEN $1 AND $2 AND `+scopeSQL,
		append([]any{start, end}, args...)...).Scan(&inputs.WeightedPipeline); err != nil {
		return inputs, err
	}
	if err := s.db.QueryRow(ctx, `
		SELECT COALESCE(sum(COALESCE(potential_value_usd, value_usd)), 0)
		FROM leads
		WHERE stage = 'WON'::lead_stage AND won_date BETWEEN $1 AND $2 AND `+scopeSQL,
		append([]any{start, end}, args...)...).Scan(&inputs.AchievedUSD); err != nil {
		return inputs, err
	}
	inputs.TargetPct = percent(inputs.AchievedUSD, inputs.TargetUSD)
	conversionScopeSQL, conversionArgs, _, _ := leadScope(user, 1)
	inputs.ConversionRate, err = s.conversionRate(ctx, conversionScopeSQL, conversionArgs)
	if err != nil {
		return inputs, err
	}
	inputs.ChurnRisk, inputs.AtRiskCount, err = s.churnRisk(ctx, user)
	if err != nil {
		return inputs, err
	}
	inputs.RenewalUSD, err = s.renewalRevenue(ctx, user, start, end)
	if err != nil {
		return inputs, err
	}
	inputs.AvgDealsPerMonth, err = s.wonVelocity(ctx, conversionScopeSQL, conversionArgs)
	if err != nil {
		return inputs, err
	}
	inputs.AvgDealCycleDays, err = s.avgDealCycle(ctx, conversionScopeSQL, conversionArgs)
	if err != nil {
		return inputs, err
	}
	inputs.BaseForecast = inputs.AchievedUSD + inputs.WeightedPipeline*inputs.ConversionRate
	inputs.AdjustedForecast = inputs.BaseForecast - inputs.ChurnRisk
	return inputs, nil
}

func (s *Service) generateForecastNarrative(ctx context.Context, inputs forecastInputs) (forecastNarrative, error) {
	userPrompt := fmt.Sprintf(`FORECAST INPUT DATA:
Period: %s. Scope: %s.
Current target: $%.2f. Achieved so far: $%.2f (%.1f%%).
Weighted pipeline: $%.2f. Avg conversion: %.1f%%.
Statistical baseline forecast: $%.2f.
Churn risk from %d at-risk tenants: -$%.2f.
Adjusted forecast: $%.2f.
Renewal revenue at risk: $%.2f (contracts expiring this period).
Historical won velocity: %.1f deals/month for last 6 months.
Average deal cycle: %d days.
Return valid JSON matching this shape only: {"confidence":"MEDIUM","narrative":"...","top_risks":["..."],"top_opportunities":["..."],"recommended_actions":["..."]}.`,
		inputs.PeriodLabel, inputs.ScopeLabel, inputs.TargetUSD, inputs.AchievedUSD, inputs.TargetPct,
		inputs.WeightedPipeline, inputs.ConversionRate*100, inputs.BaseForecast, inputs.AtRiskCount,
		inputs.ChurnRisk, inputs.AdjustedForecast, inputs.RenewalUSD, inputs.AvgDealsPerMonth, inputs.AvgDealCycleDays)
	raw, err := s.client.Chat(ctx, "gpt-4o-mini", forecastSystemPrompt, userPrompt, 400, 0.3)
	if err != nil {
		return forecastNarrative{}, err
	}
	raw = strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(strings.TrimPrefix(strings.TrimSpace(raw), "```json"), "```"), "```"))
	var result forecastNarrative
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return forecastNarrative{}, err
	}
	return result, nil
}

func forecastPeriod(scope string, now time.Time) (time.Time, time.Time, string) {
	if scope == "year" {
		start := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(now.Year(), 12, 31, 23, 59, 59, 0, time.UTC)
		return start, end, fmt.Sprintf("%d", now.Year())
	}
	quarter := int((now.Month()-1)/3) + 1
	startMonth := time.Month((quarter-1)*3 + 1)
	start := time.Date(now.Year(), startMonth, 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 3, 0).Add(-time.Second)
	return start, end, fmt.Sprintf("Q%d %d", quarter, now.Year())
}

func leadScope(user auth.UserContext, startIndex int) (string, []any, string, string) {
	switch user.Role {
	case middleware.RoleAccountManager:
		return fmt.Sprintf("owner_id = $%d", startIndex), []any{user.ID}, "own:" + user.ID.String(), "own"
	case middleware.RoleCountryGM:
		return fmt.Sprintf("country_id = $%d", startIndex), []any{user.CountryOfficeID}, "country:" + user.CountryOfficeID.String(), "country"
	default:
		return "TRUE", nil, "company", "company"
	}
}

func (s *Service) sumTargetForScope(ctx context.Context, user auth.UserContext, year int) (float64, error) {
	switch user.Role {
	case middleware.RoleAccountManager:
		var total float64
		err := s.db.QueryRow(ctx, `SELECT COALESCE(sum(annual_target_usd),0) FROM sales_targets WHERE user_id = $1 AND year = $2`, user.ID, year).Scan(&total)
		return total, err
	case middleware.RoleCountryGM:
		var total float64
		err := s.db.QueryRow(ctx, `
			SELECT COALESCE(sum(st.annual_target_usd),0)
			FROM sales_targets st JOIN users u ON u.id = st.user_id
			WHERE u.country_office_id = $1 AND st.year = $2`, user.CountryOfficeID, year).Scan(&total)
		return total, err
	default:
		var total float64
		err := s.db.QueryRow(ctx, `SELECT COALESCE(sum(annual_target_usd),0) FROM sales_targets WHERE year = $1`, year).Scan(&total)
		return total, err
	}
}

func (s *Service) sumQuarterTargetForScope(ctx context.Context, user auth.UserContext, year, quarter int) (float64, error) {
	switch user.Role {
	case middleware.RoleAccountManager:
		var total float64
		err := s.db.QueryRow(ctx, `
			SELECT COALESCE(sum(qt.target_usd),0)
			FROM quarterly_targets qt JOIN sales_targets st ON st.id = qt.sales_target_id
			WHERE st.user_id = $1 AND st.year = $2 AND qt.quarter = $3`, user.ID, year, quarter).Scan(&total)
		return total, err
	case middleware.RoleCountryGM:
		var total float64
		err := s.db.QueryRow(ctx, `
			SELECT COALESCE(sum(qt.target_usd),0)
			FROM quarterly_targets qt
			JOIN sales_targets st ON st.id = qt.sales_target_id
			JOIN users u ON u.id = st.user_id
			WHERE u.country_office_id = $1 AND st.year = $2 AND qt.quarter = $3`, user.CountryOfficeID, year, quarter).Scan(&total)
		return total, err
	default:
		var total float64
		err := s.db.QueryRow(ctx, `
			SELECT COALESCE(sum(qt.target_usd),0)
			FROM quarterly_targets qt JOIN sales_targets st ON st.id = qt.sales_target_id
			WHERE st.year = $1 AND qt.quarter = $2`, year, quarter).Scan(&total)
		return total, err
	}
}

func (s *Service) conversionRate(ctx context.Context, scopeSQL string, args []any) (float64, error) {
	var won, total float64
	err := s.db.QueryRow(ctx, `
		SELECT count(*) FILTER (WHERE stage = 'WON'::lead_stage)::float, count(*)::float
		FROM leads
		WHERE created_at >= NOW() - interval '90 days' AND `+scopeSQL, args...).Scan(&won, &total)
	if err != nil {
		return 0, err
	}
	if total == 0 {
		return 0, nil
	}
	return won / total, nil
}

func (s *Service) churnRisk(ctx context.Context, user auth.UserContext) (float64, int, error) {
	where, args := tenantScope(user, 1)
	var total float64
	var count int
	err := s.db.QueryRow(ctx, `SELECT COALESCE(sum(mrr_usd * 0.3),0), count(*) FROM tenants WHERE risk_score >= 60 AND `+where, args...).Scan(&total, &count)
	return total, count, err
}

func (s *Service) renewalRevenue(ctx context.Context, user auth.UserContext, start, end time.Time) (float64, error) {
	where, args := tenantScope(user, 3)
	queryArgs := append([]any{start, end}, args...)
	var total float64
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(sum(c.value_usd),0)
		FROM contracts c JOIN tenants t ON t.id = c.tenant_id
		WHERE c.end_date BETWEEN $1 AND $2 AND `+qualifyTenantScope(where), queryArgs...).Scan(&total)
	return total, err
}

func (s *Service) wonVelocity(ctx context.Context, scopeSQL string, args []any) (float64, error) {
	var total float64
	err := s.db.QueryRow(ctx, `
		SELECT count(*)::float
		FROM leads
		WHERE stage = 'WON'::lead_stage AND won_date >= date_trunc('month', CURRENT_DATE) - interval '5 months' AND `+scopeSQL, args...).Scan(&total)
	return total / 6, err
}

func (s *Service) avgDealCycle(ctx context.Context, scopeSQL string, args []any) (int, error) {
	var days int
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(avg(won_date - created_at::date), 0)::int
		FROM leads
		WHERE stage = 'WON'::lead_stage AND won_date >= CURRENT_DATE - interval '12 months' AND `+scopeSQL, args...).Scan(&days)
	return days, err
}

func tenantScope(user auth.UserContext, startIndex int) (string, []any) {
	switch user.Role {
	case middleware.RoleAccountManager:
		return fmt.Sprintf("account_manager_id = $%d", startIndex), []any{user.ID}
	case middleware.RoleCountryGM:
		return fmt.Sprintf("country_id = $%d", startIndex), []any{user.CountryOfficeID}
	default:
		return "TRUE", nil
	}
}

func qualifyTenantScope(where string) string {
	return strings.NewReplacer("account_manager_id", "t.account_manager_id", "country_id", "t.country_id").Replace(where)
}

func percent(value, total float64) float64 {
	if total == 0 {
		return 0
	}
	return math.Round((value/total)*1000) / 10
}

func roundForecastMoney(value float64) float64 {
	return math.Round(value*100) / 100
}

func defaultString(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}
