package tenants

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/htgclouds/crm-api/internal/middleware"
)

type Repository struct {
	db        *pgxpool.Pool
	publisher RiskPublisher
}

func NewRepository(db *pgxpool.Pool, publisher RiskPublisher) *Repository {
	if publisher == nil {
		publisher = NoopRiskPublisher{}
	}
	return &Repository{db: db, publisher: publisher}
}

func (r *Repository) List(ctx context.Context, filters TenantFilters, params PaginationParams) ([]*Tenant, int, error) {
	where, args := tenantWhere(ctx, filters)
	total, err := countRows(ctx, r.db, "tenants", where, args)
	if err != nil {
		return nil, 0, err
	}
	args = append(args, params.Limit, (params.Page-1)*params.Limit)
	query := fmt.Sprintf(`
		SELECT id, country_id, region_id, sector_id, account_manager_id, lead_id, name,
			(SELECT name FROM country_offices WHERE country_offices.id = tenants.country_id),
			(SELECT name FROM sectors WHERE sectors.id = tenants.sector_id),
			status::text,
			arr_usd, mrr_usd, health_score, risk_score, renewal_date, onboarded_at, created_at, updated_at
		FROM tenants WHERE %s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`, where, safeTenantSort(params.Sort), params.Order, len(args)-1, len(args))
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []*Tenant{}
	for rows.Next() {
		item, err := scanTenant(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	where, args := tenantWhere(ctx, TenantFilters{})
	args = append(args, id)
	row := r.db.QueryRow(ctx, fmt.Sprintf(`
		SELECT id, country_id, region_id, sector_id, account_manager_id, lead_id, name,
			(SELECT name FROM country_offices WHERE country_offices.id = tenants.country_id),
			(SELECT name FROM sectors WHERE sectors.id = tenants.sector_id),
			status::text,
			arr_usd, mrr_usd, health_score, risk_score, renewal_date, onboarded_at, created_at, updated_at
		FROM tenants WHERE %s AND id = $%d`, where, len(args)), args...)
	return scanTenant(row)
}

func (r *Repository) Profile(ctx context.Context, id uuid.UUID) (*TenantProfile, error) {
	tenant, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	services, err := r.ListServices(ctx, id)
	if err != nil {
		return nil, err
	}
	var contactCount int
	if err := r.db.QueryRow(ctx, "SELECT count(*) FROM contacts WHERE tenant_id = $1", id).Scan(&contactCount); err != nil {
		return nil, err
	}
	return &TenantProfile{Tenant: tenant, Services: services, LatestRisk: tenant.RiskScore, ContactsCount: contactCount}, nil
}

func (r *Repository) Create(ctx context.Context, req CreateTenantRequest) (*Tenant, error) {
	status := req.Status
	if status == "" {
		status = "ACTIVE"
	}
	row := r.db.QueryRow(ctx, `
		INSERT INTO tenants (country_id, region_id, sector_id, account_manager_id, lead_id, name, status, arr_usd, mrr_usd, renewal_date, onboarded_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7::tenant_status, $8, $9, $10, NOW())
		RETURNING id, country_id, region_id, sector_id, account_manager_id, lead_id, name,
			(SELECT name FROM country_offices WHERE country_offices.id = tenants.country_id),
			(SELECT name FROM sectors WHERE sectors.id = tenants.sector_id),
			status::text,
			arr_usd, mrr_usd, health_score, risk_score, renewal_date, onboarded_at, created_at, updated_at`,
		req.CountryID, req.RegionID, req.SectorID, req.AccountManagerID, req.LeadID, req.Name, status, req.ARRUSD, req.MRRUSD, req.RenewalDate)
	return scanTenant(row)
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, req UpdateTenantRequest) (*Tenant, error) {
	sets := []string{}
	args := []any{}
	add := func(column string, value any) {
		args = append(args, value)
		sets = append(sets, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	if req.CountryID != nil {
		add("country_id", *req.CountryID)
	}
	if req.RegionID != nil {
		add("region_id", *req.RegionID)
	}
	if req.SectorID != nil {
		add("sector_id", *req.SectorID)
	}
	if req.AccountManagerID != nil {
		add("account_manager_id", *req.AccountManagerID)
	}
	if req.Name != nil {
		add("name", *req.Name)
	}
	if req.Status != nil {
		args = append(args, *req.Status)
		sets = append(sets, fmt.Sprintf("status = $%d::tenant_status", len(args)))
	}
	if req.ARRUSD != nil {
		add("arr_usd", *req.ARRUSD)
	}
	if req.MRRUSD != nil {
		add("mrr_usd", *req.MRRUSD)
	}
	if req.RenewalDate != nil {
		add("renewal_date", *req.RenewalDate)
	}
	if len(sets) == 0 {
		return r.FindByID(ctx, id)
	}
	args = append(args, id)
	where := []string{fmt.Sprintf("id = $%d", len(args))}
	if userID, ok := middleware.FilterUserID(ctx); ok {
		args = append(args, userID)
		where = append(where, fmt.Sprintf("account_manager_id = $%d", len(args)))
	}
	if countryID, ok := middleware.FilterCountryID(ctx); ok {
		args = append(args, countryID)
		where = append(where, fmt.Sprintf("country_id = $%d", len(args)))
	}
	query := fmt.Sprintf(`
		UPDATE tenants SET %s WHERE %s
		RETURNING id, country_id, region_id, sector_id, account_manager_id, lead_id, name,
			(SELECT name FROM country_offices WHERE country_offices.id = tenants.country_id),
			(SELECT name FROM sectors WHERE sectors.id = tenants.sector_id),
			status::text,
			arr_usd, mrr_usd, health_score, risk_score, renewal_date, onboarded_at, created_at, updated_at`,
		strings.Join(sets, ", "), strings.Join(where, " AND "))
	return scanTenant(r.db.QueryRow(ctx, query, args...))
}

func (r *Repository) ListServices(ctx context.Context, tenantID uuid.UUID) ([]*Service, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, tenant_id, service_name, COALESCE(service_code, ''), status::text, monthly_usd, started_at, ended_at, metadata
		FROM tenant_services WHERE tenant_id = $1 ORDER BY service_name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []*Service{}
	for rows.Next() {
		item, err := scanService(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreateService(ctx context.Context, tenantID uuid.UUID, req CreateServiceRequest) (*Service, error) {
	status := defaultString(req.Status, "ACTIVE")
	metadata := req.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return nil, err
	}
	row := r.db.QueryRow(ctx, `
		INSERT INTO tenant_services (tenant_id, service_name, service_code, status, monthly_usd, started_at, ended_at, metadata)
		VALUES ($1, $2, $3, $4::service_status, $5, $6, $7, $8)
		RETURNING id, tenant_id, service_name, COALESCE(service_code, ''), status::text, monthly_usd, started_at, ended_at, metadata`,
		tenantID, req.Name, req.Code, status, req.MonthlyUSD, req.StartedAt, req.EndedAt, metadataJSON)
	return scanService(row)
}

func (r *Repository) UpdateService(ctx context.Context, tenantID, serviceID uuid.UUID, req CreateServiceRequest) (*Service, error) {
	status := defaultString(req.Status, "ACTIVE")
	metadata := req.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return nil, err
	}
	row := r.db.QueryRow(ctx, `
		UPDATE tenant_services SET service_name = $1, service_code = $2, status = $3::service_status,
			monthly_usd = $4, started_at = $5, ended_at = $6, metadata = $7
		WHERE tenant_id = $8 AND id = $9
		RETURNING id, tenant_id, service_name, COALESCE(service_code, ''), status::text, monthly_usd, started_at, ended_at, metadata`,
		req.Name, req.Code, status, req.MonthlyUSD, req.StartedAt, req.EndedAt, metadataJSON, tenantID, serviceID)
	return scanService(row)
}

func (r *Repository) ListContacts(ctx context.Context, tenantID uuid.UUID, params PaginationParams) ([]*Contact, int, error) {
	total, err := countRows(ctx, r.db, "contacts", "tenant_id = $1", []any{tenantID})
	if err != nil {
		return nil, 0, err
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, tenant_id, full_name, COALESCE(title, ''), COALESCE(email, ''), COALESCE(phone, ''), is_primary
		FROM contacts WHERE tenant_id = $1 ORDER BY is_primary DESC, full_name LIMIT $2 OFFSET $3`,
		tenantID, params.Limit, (params.Page-1)*params.Limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []*Contact{}
	for rows.Next() {
		item := &Contact{}
		if err := rows.Scan(&item.ID, &item.TenantID, &item.FullName, &item.Title, &item.Email, &item.Phone, &item.IsPrimary); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *Repository) CreateContact(ctx context.Context, tenantID uuid.UUID, req CreateContactRequest) (*Contact, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO contacts (tenant_id, full_name, title, email, phone, is_primary)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, tenant_id, full_name, COALESCE(title, ''), COALESCE(email, ''), COALESCE(phone, ''), is_primary`,
		tenantID, req.FullName, req.Title, req.Email, req.Phone, req.IsPrimary)
	item := &Contact{}
	err := row.Scan(&item.ID, &item.TenantID, &item.FullName, &item.Title, &item.Email, &item.Phone, &item.IsPrimary)
	return item, err
}

func (r *Repository) ListContracts(ctx context.Context, tenantID uuid.UUID, params PaginationParams) ([]*Contract, int, error) {
	total, err := countRows(ctx, r.db, "contracts", "tenant_id = $1", []any{tenantID})
	if err != nil {
		return nil, 0, err
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, tenant_id, contract_number, status::text, start_date, end_date, value_usd, COALESCE(document_url, ''),
			(end_date - CURRENT_DATE)::int
		FROM contracts WHERE tenant_id = $1 ORDER BY end_date DESC LIMIT $2 OFFSET $3`,
		tenantID, params.Limit, (params.Page-1)*params.Limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items, err := scanContracts(rows)
	return items, total, err
}

func (r *Repository) CreateContract(ctx context.Context, tenantID uuid.UUID, req CreateContractRequest) (*Contract, error) {
	status := defaultString(req.Status, "DRAFT")
	row := r.db.QueryRow(ctx, `
		INSERT INTO contracts (tenant_id, contract_number, status, start_date, end_date, value_usd, document_url)
		VALUES ($1, $2, $3::contract_status, $4, $5, $6, $7)
		RETURNING id, tenant_id, contract_number, status::text, start_date, end_date, value_usd, COALESCE(document_url, ''),
			(end_date - CURRENT_DATE)::int`,
		tenantID, req.ContractNumber, status, req.StartDate, req.EndDate, req.ValueUSD, req.DocumentURL)
	return scanContract(row)
}

func (r *Repository) ListActivities(ctx context.Context, tenantID uuid.UUID, params PaginationParams) ([]*Activity, int, error) {
	total, err := countRows(ctx, r.db, "activities", "tenant_id = $1", []any{tenantID})
	if err != nil {
		return nil, 0, err
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, lead_id, tenant_id, type::text, status::text, subject, COALESCE(body, ''), occurred_at, next_action_date, created_at
		FROM activities WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		tenantID, params.Limit, (params.Page-1)*params.Limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []*Activity{}
	for rows.Next() {
		item := &Activity{}
		if err := rows.Scan(&item.ID, &item.UserID, &item.LeadID, &item.TenantID, &item.Type, &item.Status, &item.Subject, &item.Body, &item.OccurredAt, &item.NextActionDate, &item.CreatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *Repository) AtRisk(ctx context.Context, params PaginationParams) ([]*Tenant, int, error) {
	min := 60
	return r.List(ctx, TenantFilters{MinRiskScore: &min}, PaginationParams{Page: params.Page, Limit: params.Limit, Sort: "risk_score", Order: "desc"})
}

func (r *Repository) Renewals(ctx context.Context, days int, params PaginationParams) ([]*Contract, int, error) {
	total := 0
	if err := r.db.QueryRow(ctx, `
		SELECT count(*) FROM contracts c JOIN tenants t ON t.id = c.tenant_id
		WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int * interval '1 day') AND `+tenantScopeSQL(ctx, "t", 2),
		append([]any{days}, tenantScopeArgs(ctx)...)...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args := append([]any{days, params.Limit, (params.Page - 1) * params.Limit}, tenantScopeArgs(ctx)...)
	rows, err := r.db.Query(ctx, `
		SELECT c.id, c.tenant_id, c.contract_number, c.status::text, c.start_date, c.end_date, c.value_usd, COALESCE(c.document_url, ''),
			(c.end_date - CURRENT_DATE)::int
		FROM contracts c JOIN tenants t ON t.id = c.tenant_id
		WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int * interval '1 day') AND `+tenantScopeSQL(ctx, "t", 4)+`
		ORDER BY c.end_date ASC LIMIT $2 OFFSET $3`, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items, err := scanContracts(rows)
	return items, total, err
}

func (r *Repository) RiskInputs(ctx context.Context, tenantID uuid.UUID, now time.Time) (RiskInputs, error) {
	inputs := RiskInputs{}
	if err := r.db.QueryRow(ctx, `SELECT count(*) FROM contracts WHERE tenant_id = $1 AND status = 'OVERDUE'`, tenantID).Scan(&inputs.OverdueContracts); err != nil {
		return inputs, err
	}
	if err := r.db.QueryRow(ctx, `
		SELECT count(*) FROM activities
		WHERE tenant_id = $1 AND type = 'NOTE' AND created_at >= $2
			AND (body ILIKE '%complaint%' OR body ILIKE '%issue%' OR subject ILIKE '%complaint%' OR subject ILIKE '%issue%')`,
		tenantID, now.AddDate(0, 0, -30)).Scan(&inputs.ComplaintNoteCount); err != nil {
		return inputs, err
	}
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM contracts
			WHERE tenant_id = $1 AND status = 'ACTIVE' AND end_date < $2 AND end_date >= $3
		)`, tenantID, now.AddDate(0, 0, 30), now).Scan(&inputs.ActiveContractExpSoon); err != nil {
		return inputs, err
	}
	if err := r.db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM activities WHERE tenant_id = $1 AND created_at >= $2)`, tenantID, now.AddDate(0, 0, -14)).Scan(&inputs.ActivityLast14Days); err != nil {
		return inputs, err
	}
	if err := r.db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM activities WHERE tenant_id = $1 AND created_at >= $2)`, tenantID, now.AddDate(0, 0, -60)).Scan(&inputs.ActivityLast60Days); err != nil {
		return inputs, err
	}
	return inputs, nil
}

func (r *Repository) UpdateRiskScore(ctx context.Context, tenantID uuid.UUID, score int) (previous int, err error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)
	var previousScore float64
	if err := tx.QueryRow(ctx, `SELECT risk_score FROM tenants WHERE id = $1 FOR UPDATE`, tenantID).Scan(&previousScore); err != nil {
		return 0, err
	}
	previous = int(previousScore)
	if _, err := tx.Exec(ctx, `UPDATE tenants SET risk_score = $1, updated_at = NOW() WHERE id = $2`, score, tenantID); err != nil {
		return 0, err
	}
	return previous, tx.Commit(ctx)
}

func (r *Repository) PublishRiskAlert(ctx context.Context, tenantID uuid.UUID, score int) error {
	return r.publisher.PublishRiskAlert(ctx, tenantID, score)
}

func tenantWhere(ctx context.Context, filters TenantFilters) (string, []any) {
	where := []string{"1=1"}
	args := []any{}
	if filters.CountryID != uuid.Nil {
		args = append(args, filters.CountryID)
		where = append(where, fmt.Sprintf("country_id = $%d", len(args)))
	}
	if filters.SectorID != uuid.Nil {
		args = append(args, filters.SectorID)
		where = append(where, fmt.Sprintf("sector_id = $%d", len(args)))
	}
	if filters.Status != "" {
		args = append(args, filters.Status)
		where = append(where, fmt.Sprintf("status = $%d::tenant_status", len(args)))
	}
	if filters.AccountManagerID != uuid.Nil {
		args = append(args, filters.AccountManagerID)
		where = append(where, fmt.Sprintf("account_manager_id = $%d", len(args)))
	}
	if filters.Search != "" {
		args = append(args, "%"+filters.Search+"%")
		where = append(where, fmt.Sprintf("name ILIKE $%d", len(args)))
	}
	if filters.MinRiskScore != nil {
		args = append(args, *filters.MinRiskScore)
		where = append(where, fmt.Sprintf("risk_score >= $%d", len(args)))
	}
	if userID, ok := middleware.FilterUserID(ctx); ok {
		args = append(args, userID)
		where = append(where, fmt.Sprintf("account_manager_id = $%d", len(args)))
	}
	if countryID, ok := middleware.FilterCountryID(ctx); ok {
		args = append(args, countryID)
		where = append(where, fmt.Sprintf("country_id = $%d", len(args)))
	}
	return strings.Join(where, " AND "), args
}

func tenantScopeArgs(ctx context.Context) []any {
	if userID, ok := middleware.FilterUserID(ctx); ok {
		return []any{userID}
	}
	if countryID, ok := middleware.FilterCountryID(ctx); ok {
		return []any{countryID}
	}
	return nil
}

func tenantScopeSQL(ctx context.Context, alias string, startIndex int) string {
	if _, ok := middleware.FilterUserID(ctx); ok {
		return fmt.Sprintf("%s.account_manager_id = $%d", alias, startIndex)
	}
	if _, ok := middleware.FilterCountryID(ctx); ok {
		return fmt.Sprintf("%s.country_id = $%d", alias, startIndex)
	}
	return "TRUE"
}

type scanner interface{ Scan(dest ...any) error }

func scanTenant(row scanner) (*Tenant, error) {
	item := &Tenant{}
	var riskScore float64
	err := row.Scan(&item.ID, &item.CountryID, &item.RegionID, &item.SectorID, &item.AccountManagerID, &item.LeadID, &item.Name, &item.Country, &item.Sector, &item.Status, &item.ARRUSD, &item.MRRUSD, &item.HealthScore, &riskScore, &item.RenewalDate, &item.OnboardedAt, &item.CreatedAt, &item.UpdatedAt)
	item.RiskScore = int(riskScore)
	return item, err
}

func scanService(row scanner) (*Service, error) {
	item := &Service{}
	var metadata []byte
	err := row.Scan(&item.ID, &item.TenantID, &item.Name, &item.Code, &item.Status, &item.MonthlyUSD, &item.StartedAt, &item.EndedAt, &metadata)
	if len(metadata) > 0 {
		_ = json.Unmarshal(metadata, &item.Metadata)
	}
	return item, err
}

func scanContract(row scanner) (*Contract, error) {
	item := &Contract{}
	var days int
	err := row.Scan(&item.ID, &item.TenantID, &item.ContractNumber, &item.Status, &item.StartDate, &item.EndDate, &item.ValueUSD, &item.DocumentURL, &days)
	item.DaysToExpiry = &days
	return item, err
}

func scanContracts(rows pgxRows) ([]*Contract, error) {
	items := []*Contract{}
	for rows.Next() {
		item, err := scanContract(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

type pgxRows interface {
	Next() bool
	Err() error
	Scan(dest ...any) error
}

func countRows(ctx context.Context, db *pgxpool.Pool, table, where string, args []any) (int, error) {
	var total int
	err := db.QueryRow(ctx, fmt.Sprintf("SELECT count(*) FROM %s WHERE %s", table, where), args...).Scan(&total)
	return total, err
}

func safeTenantSort(sort string) string {
	switch sort {
	case "name", "status", "risk_score", "renewal_date", "created_at", "updated_at":
		return sort
	default:
		return "created_at"
	}
}

func defaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

var _ TenantRepository = (*Repository)(nil)
