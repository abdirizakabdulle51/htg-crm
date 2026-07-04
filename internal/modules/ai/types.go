package ai

type Recommendation struct {
	ID                       string  `json:"id"`
	TenantID                 string  `json:"tenant_id,omitempty"`
	TenantName               string  `json:"tenant_name,omitempty"`
	Title                    string  `json:"title"`
	Message                  string  `json:"message"`
	Priority                 string  `json:"priority"`
	RecommendedService       string  `json:"recommended_service,omitempty"`
	EstimatedMonthlyValueUSD float64 `json:"estimated_monthly_value_usd,omitempty"`
}

type OverdueActivity struct {
	ID             string `json:"id"`
	Type           string `json:"type"`
	Subject        string `json:"subject"`
	EntityName     string `json:"entity_name"`
	EntityType     string `json:"entity_type"`
	EntityID       string `json:"entity_id"`
	NextActionDate string `json:"next_action_date"`
	DaysOverdue    int    `json:"days_overdue"`
}
