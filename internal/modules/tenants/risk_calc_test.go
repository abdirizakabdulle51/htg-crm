package tenants

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

type mockTenantRiskRepo struct {
	inputs        RiskInputs
	previousScore int
	savedScore    int
}

func (m *mockTenantRiskRepo) List(context.Context, TenantFilters, PaginationParams) ([]*Tenant, int, error) {
	return nil, 0, nil
}

func (m *mockTenantRiskRepo) FindByID(context.Context, uuid.UUID) (*Tenant, error) {
	return nil, nil
}

func (m *mockTenantRiskRepo) Profile(context.Context, uuid.UUID) (*TenantProfile, error) {
	return nil, nil
}

func (m *mockTenantRiskRepo) Create(context.Context, CreateTenantRequest) (*Tenant, error) {
	return nil, nil
}

func (m *mockTenantRiskRepo) Update(context.Context, uuid.UUID, UpdateTenantRequest) (*Tenant, error) {
	return nil, nil
}

func (m *mockTenantRiskRepo) ListServices(context.Context, uuid.UUID) ([]*Service, error) {
	return nil, nil
}

func (m *mockTenantRiskRepo) CreateService(context.Context, uuid.UUID, CreateServiceRequest) (*Service, error) {
	return nil, nil
}

func (m *mockTenantRiskRepo) UpdateService(context.Context, uuid.UUID, uuid.UUID, CreateServiceRequest) (*Service, error) {
	return nil, nil
}

func (m *mockTenantRiskRepo) ListContacts(context.Context, uuid.UUID, PaginationParams) ([]*Contact, int, error) {
	return nil, 0, nil
}

func (m *mockTenantRiskRepo) CreateContact(context.Context, uuid.UUID, CreateContactRequest) (*Contact, error) {
	return nil, nil
}

func (m *mockTenantRiskRepo) ListContracts(context.Context, uuid.UUID, PaginationParams) ([]*Contract, int, error) {
	return nil, 0, nil
}

func (m *mockTenantRiskRepo) CreateContract(context.Context, uuid.UUID, CreateContractRequest) (*Contract, error) {
	return nil, nil
}

func (m *mockTenantRiskRepo) ListActivities(context.Context, uuid.UUID, PaginationParams) ([]*Activity, int, error) {
	return nil, 0, nil
}

func (m *mockTenantRiskRepo) AtRisk(context.Context, PaginationParams) ([]*Tenant, int, error) {
	return nil, 0, nil
}

func (m *mockTenantRiskRepo) Renewals(context.Context, int, PaginationParams) ([]*Contract, int, error) {
	return nil, 0, nil
}

func (m *mockTenantRiskRepo) RiskInputs(context.Context, uuid.UUID, time.Time) (RiskInputs, error) {
	return m.inputs, nil
}

func (m *mockTenantRiskRepo) UpdateRiskScore(_ context.Context, _ uuid.UUID, score int) (int, error) {
	m.savedScore = score
	return m.previousScore, nil
}

type mockClickHouseRiskRepo struct {
	previous float64
	latest   float64
}

func (m mockClickHouseRiskRepo) DailyUsage(context.Context, uuid.UUID, int) ([]UsageSummary, error) {
	return nil, nil
}

func (m mockClickHouseRiskRepo) MonthlyGrowth(context.Context, uuid.UUID) ([]GrowthPoint, error) {
	return nil, nil
}

func (m mockClickHouseRiskRepo) MonthlyBillingLastTwo(context.Context, uuid.UUID) (float64, float64, error) {
	return m.previous, m.latest, nil
}

func TestComputeAndSaveRiskScore(t *testing.T) {
	tenantID := uuid.New()

	tests := []struct {
		name          string
		inputs        RiskInputs
		previousMonth float64
		latestMonth   float64
		expectedScore int
	}{
		{name: "zero_risk", inputs: RiskInputs{ActivityLast14Days: true, ActivityLast60Days: true}, expectedScore: 0},
		{name: "one_late_payment", inputs: RiskInputs{OverdueContracts: 1, ActivityLast14Days: true, ActivityLast60Days: true}, expectedScore: 20},
		{name: "two_late_payments", inputs: RiskInputs{OverdueContracts: 2, ActivityLast14Days: true, ActivityLast60Days: true}, expectedScore: 40},
		{name: "three_late_payments_capped", inputs: RiskInputs{OverdueContracts: 3, ActivityLast14Days: true, ActivityLast60Days: true}, expectedScore: 40},
		{name: "usage_decline_alone", inputs: RiskInputs{ActivityLast14Days: true, ActivityLast60Days: true}, previousMonth: 1000, latestMonth: 790, expectedScore: 25},
		{name: "contract_expiry_no_activity", inputs: RiskInputs{ActiveContractExpSoon: true, ActivityLast14Days: false, ActivityLast60Days: true}, expectedScore: 30},
		{name: "stale_relationship", inputs: RiskInputs{ActivityLast14Days: true, ActivityLast60Days: false}, expectedScore: 10},
		{name: "all_factors_cap_100", inputs: RiskInputs{OverdueContracts: 3, ComplaintNoteCount: 6, ActiveContractExpSoon: true}, previousMonth: 1000, latestMonth: 500, expectedScore: 100},
		{name: "high_tickets", inputs: RiskInputs{ComplaintNoteCount: 6, ActivityLast14Days: true, ActivityLast60Days: true}, expectedScore: 15},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockTenantRiskRepo{inputs: tt.inputs}
			var chRepo ClickHouseRepo
			if tt.previousMonth > 0 || tt.latestMonth > 0 {
				chRepo = mockClickHouseRiskRepo{previous: tt.previousMonth, latest: tt.latestMonth}
			}

			score, err := ComputeAndSaveRiskScore(context.Background(), repo, chRepo, tenantID)
			if err != nil {
				t.Fatalf("ComputeAndSaveRiskScore() error = %v", err)
			}
			if score != tt.expectedScore {
				t.Fatalf("score = %d, want %d", score, tt.expectedScore)
			}
			if repo.savedScore != tt.expectedScore {
				t.Fatalf("savedScore = %d, want %d", repo.savedScore, tt.expectedScore)
			}
		})
	}
}
