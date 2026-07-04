package pipeline

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/middleware"
	tenantsmodule "github.com/htgclouds/crm-api/internal/modules/tenants"
)

type PaginationParams = middleware.PaginationParams

const (
	StageWon     = 9
	StageLost    = 10
	StageDormant = 11
)

type Lead struct {
	ID                uuid.UUID  `json:"id"`
	OwnerID           uuid.UUID  `json:"owner_id"`
	CountryID         uuid.UUID  `json:"country_id"`
	RegionID          *uuid.UUID `json:"region_id,omitempty"`
	SectorID          uuid.UUID  `json:"sector_id"`
	CompanyName       string     `json:"company_name"`
	ContactName       string     `json:"contact_name,omitempty"`
	ContactEmail      string     `json:"contact_email,omitempty"`
	ContactPhone      string     `json:"contact_phone,omitempty"`
	Stage             string     `json:"stage"`
	StageNumber       int        `json:"stage_number"`
	StageName         string     `json:"stage_name"`
	Status            string     `json:"status"`
	ValueUSD          float64    `json:"value_usd"`
	Probability       float64    `json:"probability"`
	ExpectedCloseDate *time.Time `json:"expected_close_date,omitempty"`
	Source            string     `json:"source,omitempty"`
	Notes             string     `json:"notes,omitempty"`
	LostReason        string     `json:"lost_reason,omitempty"`
	Competitor        string     `json:"competitor,omitempty"`
	WonDate           *time.Time `json:"won_date,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type LeadProfile struct {
	Lead            *Lead      `json:"lead"`
	ActivitiesCount int        `json:"activities_count"`
	Contacts        []*Contact `json:"contacts"`
}

type Activity struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	LeadID         uuid.UUID  `json:"lead_id"`
	Type           string     `json:"type"`
	Status         string     `json:"status"`
	Subject        string     `json:"subject"`
	Body           string     `json:"body,omitempty"`
	OccurredAt     *time.Time `json:"occurred_at,omitempty"`
	NextActionDate *time.Time `json:"next_action_date,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type Contact struct {
	ID        uuid.UUID `json:"id"`
	LeadID    uuid.UUID `json:"lead_id"`
	FullName  string    `json:"full_name"`
	Title     string    `json:"title,omitempty"`
	Email     string    `json:"email,omitempty"`
	Phone     string    `json:"phone,omitempty"`
	IsPrimary bool      `json:"is_primary"`
}

type LeadFilters struct {
	Stage     *int
	SectorID  uuid.UUID
	CountryID uuid.UUID
	OwnerID   uuid.UUID
	MinValue  *float64
	MaxValue  *float64
	IsHot     *bool
}

type CreateLeadRequest struct {
	OwnerID           uuid.UUID  `json:"owner_id" binding:"required"`
	CountryID         uuid.UUID  `json:"country_id" binding:"required"`
	RegionID          *uuid.UUID `json:"region_id"`
	SectorID          uuid.UUID  `json:"sector_id" binding:"required"`
	CompanyName       string     `json:"company_name" binding:"required"`
	ContactName       string     `json:"contact_name"`
	ContactEmail      string     `json:"contact_email"`
	ContactPhone      string     `json:"contact_phone"`
	StageNumber       int        `json:"stage"`
	ValueUSD          float64    `json:"value_usd"`
	Probability       float64    `json:"probability"`
	ExpectedCloseDate *time.Time `json:"expected_close_date"`
	Source            string     `json:"source"`
	Notes             string     `json:"notes"`
}

type UpdateLeadRequest struct {
	OwnerID           *uuid.UUID `json:"owner_id"`
	CountryID         *uuid.UUID `json:"country_id"`
	RegionID          *uuid.UUID `json:"region_id"`
	SectorID          *uuid.UUID `json:"sector_id"`
	CompanyName       *string    `json:"company_name"`
	ContactName       *string    `json:"contact_name"`
	ContactEmail      *string    `json:"contact_email"`
	ContactPhone      *string    `json:"contact_phone"`
	ValueUSD          *float64   `json:"value_usd"`
	Probability       *float64   `json:"probability"`
	ExpectedCloseDate *time.Time `json:"expected_close_date"`
	Source            *string    `json:"source"`
	Notes             *string    `json:"notes"`
}

type StageChangeRequest struct {
	Stage      int    `json:"stage" binding:"required"`
	Reason     string `json:"reason"`
	Competitor string `json:"competitor"`
}

type CreateActivityRequest struct {
	Type           string     `json:"type" binding:"required"`
	Subject        string     `json:"subject" binding:"required"`
	Body           string     `json:"body"`
	OccurredAt     *time.Time `json:"occurred_at"`
	NextActionDate *time.Time `json:"next_action_date"`
}

type CreateContactRequest struct {
	FullName  string `json:"full_name" binding:"required"`
	Title     string `json:"title"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	IsPrimary bool   `json:"is_primary"`
}

type StageBreakdown struct {
	Stage          int     `json:"stage"`
	Name           string  `json:"name"`
	Count          int     `json:"count"`
	Value          float64 `json:"value"`
	AvgProbability float64 `json:"avg_probability"`
}

type SectorBreakdown struct {
	SectorID uuid.UUID `json:"sector_id"`
	Sector   string    `json:"sector"`
	Count    int       `json:"count"`
	Value    float64   `json:"value"`
}

type CountryBreakdown struct {
	CountryID uuid.UUID `json:"country_id"`
	Country   string    `json:"country"`
	Count     int       `json:"count"`
	Value     float64   `json:"value"`
}

type OwnerBreakdown struct {
	UserID uuid.UUID `json:"user_id"`
	Name   string    `json:"name"`
	Count  int       `json:"count"`
	Value  float64   `json:"value"`
	Health string    `json:"health"`
}

type CountValue struct {
	Count int     `json:"count"`
	Value float64 `json:"value"`
}

type Overview struct {
	TotalValueUSD    float64            `json:"total_value_usd"`
	TotalCount       int                `json:"total_count"`
	ByStage          []StageBreakdown   `json:"by_stage"`
	BySector         []SectorBreakdown  `json:"by_sector"`
	ByCountry        []CountryBreakdown `json:"by_country"`
	ByOwner          []OwnerBreakdown   `json:"by_owner"`
	WonThisMonth     CountValue         `json:"won_this_month"`
	LostThisMonth    CountValue         `json:"lost_this_month"`
	ConversionRate   float64            `json:"conversion_rate"`
	AvgDealCycleDays int                `json:"avg_deal_cycle_days"`
}

type ForecastMonth struct {
	Month            time.Time `json:"month"`
	Count            int       `json:"count"`
	WeightedValueUSD float64   `json:"weighted_value_usd"`
	PipelineValueUSD float64   `json:"pipeline_value_usd"`
}

type Forecast struct {
	Months                   []ForecastMonth `json:"months"`
	TotalWeightedPipelineUSD float64         `json:"total_weighted_pipeline_usd"`
}

type StageChangeResult struct {
	Lead    *Lead  `json:"lead"`
	Warning string `json:"warning,omitempty"`
}

type UserContext = auth.UserContext
type Tenant = tenantsmodule.Tenant

type Repository interface {
	Create(ctx context.Context, req CreateLeadRequest) (*Lead, error)
	List(ctx context.Context, filters LeadFilters, params PaginationParams) ([]*Lead, int, error)
	FindByID(ctx context.Context, id uuid.UUID) (*Lead, error)
	Profile(ctx context.Context, id uuid.UUID) (*LeadProfile, error)
	Update(ctx context.Context, id uuid.UUID, req UpdateLeadRequest) (*Lead, error)
	AdvanceStage(ctx context.Context, lead *Lead, req StageChangeRequest, user UserContext, notifyService NotificationService) (*Lead, error)
	CreateActivity(ctx context.Context, leadID, userID uuid.UUID, req CreateActivityRequest) (*Activity, error)
	ListActivities(ctx context.Context, leadID uuid.UUID, params PaginationParams) ([]*Activity, int, error)
	CreateContact(ctx context.Context, leadID uuid.UUID, req CreateContactRequest) (*Contact, error)
	Overview(ctx context.Context) (*Overview, error)
	Forecast(ctx context.Context, months int) (*Forecast, error)
	LastActivityAt(ctx context.Context, leadID uuid.UUID) (*time.Time, error)
}

type TenantRepository interface {
	FindTenantByLeadID(ctx context.Context, leadID uuid.UUID) (*Tenant, error)
	CreateTenantFromWonLead(ctx context.Context, tenant Tenant) (*Tenant, error)
}

type PipelineRepository interface {
	LogWonTenantActivity(ctx context.Context, leadID, userID, tenantID uuid.UUID) error
	PublishEmbeddingRefresh(ctx context.Context, tenantID uuid.UUID) error
}

type NotificationService interface {
	Send(userID uuid.UUID, title, body string) error
	SendEmail(email, subject, htmlBody string) error
}
