package tenants

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/htgclouds/crm-api/internal/middleware"
)

type PaginationParams = middleware.PaginationParams

type Tenant struct {
	ID               uuid.UUID  `json:"id"`
	CountryID        uuid.UUID  `json:"country_id"`
	RegionID         *uuid.UUID `json:"region_id,omitempty"`
	SectorID         uuid.UUID  `json:"sector_id"`
	AccountManagerID uuid.UUID  `json:"account_manager_id"`
	LeadID           *uuid.UUID `json:"lead_id,omitempty"`
	CreatedBy        *uuid.UUID `json:"created_by,omitempty"`
	Name             string     `json:"name"`
	Status           string     `json:"status"`
	ARRUSD           float64    `json:"arr_usd"`
	MRRUSD           float64    `json:"mrr_usd"`
	HealthScore      float64    `json:"health_score"`
	RiskScore        int        `json:"risk_score"`
	RenewalDate      *time.Time `json:"renewal_date,omitempty"`
	OnboardedAt      *time.Time `json:"onboarded_at,omitempty"`
	HCSAccountID     string     `json:"hcs_account_id"`
	HuaweiRegion     string     `json:"huawei_region"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type TenantProfile struct {
	Tenant        *Tenant    `json:"tenant"`
	Services      []*Service `json:"services"`
	LatestRisk    int        `json:"latest_risk"`
	ContactsCount int        `json:"contacts_count"`
}

type Service struct {
	ID         uuid.UUID      `json:"id"`
	TenantID   uuid.UUID      `json:"tenant_id"`
	Name       string         `json:"service_name"`
	Code       string         `json:"service_code,omitempty"`
	Status     string         `json:"status"`
	MonthlyUSD float64        `json:"monthly_usd"`
	StartedAt  *time.Time     `json:"started_at,omitempty"`
	EndedAt    *time.Time     `json:"ended_at,omitempty"`
	Metadata   map[string]any `json:"metadata"`
}

type Contact struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenant_id"`
	FullName  string    `json:"full_name"`
	Title     string    `json:"title,omitempty"`
	Email     string    `json:"email,omitempty"`
	Phone     string    `json:"phone,omitempty"`
	IsPrimary bool      `json:"is_primary"`
}

type Contract struct {
	ID             uuid.UUID `json:"id"`
	TenantID       uuid.UUID `json:"tenant_id"`
	ContractNumber string    `json:"contract_number"`
	Status         string    `json:"status"`
	StartDate      time.Time `json:"start_date"`
	EndDate        time.Time `json:"end_date"`
	ValueUSD       float64   `json:"value_usd"`
	DocumentURL    string    `json:"document_url,omitempty"`
	DaysToExpiry   *int      `json:"days_to_expiry,omitempty"`
}

type Activity struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	LeadID         *uuid.UUID `json:"lead_id,omitempty"`
	TenantID       uuid.UUID  `json:"tenant_id"`
	Type           string     `json:"type"`
	Status         string     `json:"status"`
	Subject        string     `json:"subject"`
	Body           string     `json:"body,omitempty"`
	OccurredAt     *time.Time `json:"occurred_at,omitempty"`
	NextActionDate *time.Time `json:"next_action_date,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type UsageSummary struct {
	Date            time.Time `json:"date"`
	ServiceType     string    `json:"service_type"`
	MetricName      string    `json:"metric_name"`
	TotalValue      float64   `json:"total_value"`
	TotalBillingUSD float64   `json:"total_billing_usd"`
	RecordCount     uint64    `json:"record_count"`
}

type GrowthPoint struct {
	Month           time.Time `json:"month"`
	TotalBillingUSD float64   `json:"total_billing_usd"`
	ServiceCount    uint64    `json:"service_count"`
	MoMPercent      float64   `json:"mom_percent"`
}

type TenantFilters struct {
	CountryID        uuid.UUID
	SectorID         uuid.UUID
	Status           string
	AccountManagerID uuid.UUID
	Search           string
	MinRiskScore     *int
}

type CreateTenantRequest struct {
	CountryID        uuid.UUID  `json:"country_id" binding:"required"`
	RegionID         *uuid.UUID `json:"region_id"`
	SectorID         uuid.UUID  `json:"sector_id" binding:"required"`
	AccountManagerID uuid.UUID  `json:"account_manager_id" binding:"required"`
	LeadID           *uuid.UUID `json:"lead_id"`
	Name             string     `json:"name" binding:"required"`
	Status           string     `json:"status"`
	ARRUSD           float64    `json:"arr_usd"`
	MRRUSD           float64    `json:"mrr_usd"`
	RenewalDate      *time.Time `json:"renewal_date"`
}

type UpdateTenantRequest struct {
	CountryID        *uuid.UUID `json:"country_id"`
	RegionID         *uuid.UUID `json:"region_id"`
	SectorID         *uuid.UUID `json:"sector_id"`
	AccountManagerID *uuid.UUID `json:"account_manager_id"`
	Name             *string    `json:"name"`
	Status           *string    `json:"status"`
	ARRUSD           *float64   `json:"arr_usd"`
	MRRUSD           *float64   `json:"mrr_usd"`
	RenewalDate      *time.Time `json:"renewal_date"`
}

type CreateServiceRequest struct {
	Name       string         `json:"service_name" binding:"required"`
	Code       string         `json:"service_code"`
	Status     string         `json:"status"`
	MonthlyUSD float64        `json:"monthly_usd"`
	StartedAt  *time.Time     `json:"started_at"`
	EndedAt    *time.Time     `json:"ended_at"`
	Metadata   map[string]any `json:"metadata"`
}

type CreateContactRequest struct {
	FullName  string `json:"full_name" binding:"required"`
	Title     string `json:"title"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	IsPrimary bool   `json:"is_primary"`
}

type CreateContractRequest struct {
	ContractNumber string    `json:"contract_number" binding:"required"`
	Status         string    `json:"status"`
	StartDate      time.Time `json:"start_date" binding:"required"`
	EndDate        time.Time `json:"end_date" binding:"required"`
	ValueUSD       float64   `json:"value_usd"`
	DocumentURL    string    `json:"document_url"`
}

type TenantRepository interface {
	List(ctx context.Context, filters TenantFilters, params PaginationParams) ([]*Tenant, int, error)
	FindByID(ctx context.Context, id uuid.UUID) (*Tenant, error)
	Profile(ctx context.Context, id uuid.UUID) (*TenantProfile, error)
	Create(ctx context.Context, req CreateTenantRequest) (*Tenant, error)
	Update(ctx context.Context, id uuid.UUID, req UpdateTenantRequest) (*Tenant, error)
	ListServices(ctx context.Context, tenantID uuid.UUID) ([]*Service, error)
	CreateService(ctx context.Context, tenantID uuid.UUID, req CreateServiceRequest) (*Service, error)
	UpdateService(ctx context.Context, tenantID, serviceID uuid.UUID, req CreateServiceRequest) (*Service, error)
	ListContacts(ctx context.Context, tenantID uuid.UUID, params PaginationParams) ([]*Contact, int, error)
	CreateContact(ctx context.Context, tenantID uuid.UUID, req CreateContactRequest) (*Contact, error)
	ListContracts(ctx context.Context, tenantID uuid.UUID, params PaginationParams) ([]*Contract, int, error)
	CreateContract(ctx context.Context, tenantID uuid.UUID, req CreateContractRequest) (*Contract, error)
	ListActivities(ctx context.Context, tenantID uuid.UUID, params PaginationParams) ([]*Activity, int, error)
	AtRisk(ctx context.Context, params PaginationParams) ([]*Tenant, int, error)
	Renewals(ctx context.Context, days int, params PaginationParams) ([]*Contract, int, error)
	RiskInputs(ctx context.Context, tenantID uuid.UUID, now time.Time) (RiskInputs, error)
	UpdateRiskScore(ctx context.Context, tenantID uuid.UUID, score int) (previous int, err error)
}

type ClickHouseRepo interface {
	DailyUsage(ctx context.Context, tenantID uuid.UUID, days int) ([]UsageSummary, error)
	MonthlyGrowth(ctx context.Context, tenantID uuid.UUID) ([]GrowthPoint, error)
	MonthlyBillingLastTwo(ctx context.Context, tenantID uuid.UUID) (previous, latest float64, err error)
}

type RiskPublisher interface {
	PublishRiskAlert(ctx context.Context, tenantID uuid.UUID, score int) error
}

type RiskInputs struct {
	OverdueContracts      int
	PreviousBillingUSD    float64
	LatestBillingUSD      float64
	ComplaintNoteCount    int
	ActiveContractExpSoon bool
	ActivityLast14Days    bool
	ActivityLast60Days    bool
}
