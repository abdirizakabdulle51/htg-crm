package tenants

import (
	"context"

	"github.com/google/uuid"
)

type ServiceLayer struct {
	repository TenantRepository
	clickhouse ClickHouseRepo
}

func NewService(repository TenantRepository, clickhouse ClickHouseRepo) *ServiceLayer {
	return &ServiceLayer{repository: repository, clickhouse: clickhouse}
}

func (s *ServiceLayer) List(ctx context.Context, filters TenantFilters, params PaginationParams) ([]*Tenant, int, error) {
	return s.repository.List(ctx, filters, params)
}

func (s *ServiceLayer) Profile(ctx context.Context, id uuid.UUID) (*TenantProfile, error) {
	return s.repository.Profile(ctx, id)
}

func (s *ServiceLayer) Create(ctx context.Context, req CreateTenantRequest) (*Tenant, error) {
	return s.repository.Create(ctx, req)
}

func (s *ServiceLayer) Update(ctx context.Context, id uuid.UUID, req UpdateTenantRequest) (*Tenant, error) {
	return s.repository.Update(ctx, id, req)
}

func (s *ServiceLayer) ListServices(ctx context.Context, tenantID uuid.UUID) ([]*Service, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return nil, err
	}
	return s.repository.ListServices(ctx, tenantID)
}

func (s *ServiceLayer) CreateService(ctx context.Context, tenantID uuid.UUID, req CreateServiceRequest) (*Service, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return nil, err
	}
	return s.repository.CreateService(ctx, tenantID, req)
}

func (s *ServiceLayer) UpdateService(ctx context.Context, tenantID, serviceID uuid.UUID, req CreateServiceRequest) (*Service, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return nil, err
	}
	return s.repository.UpdateService(ctx, tenantID, serviceID, req)
}

func (s *ServiceLayer) Usage(ctx context.Context, tenantID uuid.UUID, days int) ([]UsageSummary, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return nil, err
	}
	return s.clickhouse.DailyUsage(ctx, tenantID, days)
}

func (s *ServiceLayer) Growth(ctx context.Context, tenantID uuid.UUID) ([]GrowthPoint, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return nil, err
	}
	return s.clickhouse.MonthlyGrowth(ctx, tenantID)
}

func (s *ServiceLayer) ListContacts(ctx context.Context, tenantID uuid.UUID, params PaginationParams) ([]*Contact, int, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return nil, 0, err
	}
	return s.repository.ListContacts(ctx, tenantID, params)
}

func (s *ServiceLayer) CreateContact(ctx context.Context, tenantID uuid.UUID, req CreateContactRequest) (*Contact, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return nil, err
	}
	return s.repository.CreateContact(ctx, tenantID, req)
}

func (s *ServiceLayer) ListContracts(ctx context.Context, tenantID uuid.UUID, params PaginationParams) ([]*Contract, int, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return nil, 0, err
	}
	return s.repository.ListContracts(ctx, tenantID, params)
}

func (s *ServiceLayer) CreateContract(ctx context.Context, tenantID uuid.UUID, req CreateContractRequest) (*Contract, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return nil, err
	}
	return s.repository.CreateContract(ctx, tenantID, req)
}

func (s *ServiceLayer) ListActivities(ctx context.Context, tenantID uuid.UUID, params PaginationParams) ([]*Activity, int, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return nil, 0, err
	}
	return s.repository.ListActivities(ctx, tenantID, params)
}

func (s *ServiceLayer) RefreshRisk(ctx context.Context, tenantID uuid.UUID) (int, error) {
	if err := s.ensureTenantAccess(ctx, tenantID); err != nil {
		return 0, err
	}
	return ComputeAndSaveRiskScore(ctx, s.repository, s.clickhouse, tenantID)
}

func (s *ServiceLayer) AtRisk(ctx context.Context, params PaginationParams) ([]*Tenant, int, error) {
	return s.repository.AtRisk(ctx, params)
}

func (s *ServiceLayer) Renewals(ctx context.Context, days int, params PaginationParams) ([]*Contract, int, error) {
	return s.repository.Renewals(ctx, days, params)
}

func (s *ServiceLayer) ensureTenantAccess(ctx context.Context, tenantID uuid.UUID) error {
	_, err := s.repository.FindByID(ctx, tenantID)
	return err
}
