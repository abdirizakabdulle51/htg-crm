package pipeline

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/htgclouds/crm-api/internal/middleware"
	"github.com/htgclouds/crm-api/internal/queue"
)

type PostgresRepository struct {
	db        *pgxpool.Pool
	publisher *queue.Publisher
}

func NewRepository(db *pgxpool.Pool, publishers ...*queue.Publisher) *PostgresRepository {
	var publisher *queue.Publisher
	if len(publishers) > 0 {
		publisher = publishers[0]
	}
	return &PostgresRepository{db: db, publisher: publisher}
}

func (r *PostgresRepository) Create(ctx context.Context, req CreateLeadRequest) (*Lead, error) {
	stageNumber := req.StageNumber
	if stageNumber == 0 {
		stageNumber = 1
	}
	row := r.db.QueryRow(ctx, `
		INSERT INTO leads (owner_id, country_id, region_id, sector_id, company_name, contact_name, contact_email, contact_phone,
			stage, stage_number, value_usd, probability, expected_close_date, source, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::lead_stage, $10, $11, $12, $13, $14, $15)
		RETURNING `+leadColumns,
		req.OwnerID, req.CountryID, req.RegionID, req.SectorID, req.CompanyName, req.ContactName, req.ContactEmail, req.ContactPhone,
		stageEnum(stageNumber), stageNumber, req.ValueUSD, normalizeProbability(req.Probability), req.ExpectedCloseDate, req.Source, req.Notes)
	return scanLead(row)
}

func (r *PostgresRepository) List(ctx context.Context, filters LeadFilters, params PaginationParams) ([]*Lead, int, error) {
	where, args := leadWhere(ctx, filters)
	total, err := countRows(ctx, r.db, "leads", where, args)
	if err != nil {
		return nil, 0, err
	}
	args = append(args, params.Limit, (params.Page-1)*params.Limit)
	query := fmt.Sprintf(`
		SELECT %s FROM leads WHERE %s
		ORDER BY %s %s LIMIT $%d OFFSET $%d`,
		leadColumns, where, safeLeadSort(params.Sort), params.Order, len(args)-1, len(args))
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []*Lead{}
	for rows.Next() {
		item, err := scanLead(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *PostgresRepository) FindByID(ctx context.Context, id uuid.UUID) (*Lead, error) {
	where, args := leadWhere(ctx, LeadFilters{})
	args = append(args, id)
	row := r.db.QueryRow(ctx, fmt.Sprintf(`SELECT %s FROM leads WHERE %s AND id = $%d`, leadColumns, where, len(args)), args...)
	return scanLead(row)
}

func (r *PostgresRepository) Profile(ctx context.Context, id uuid.UUID) (*LeadProfile, error) {
	lead, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	contacts, err := r.listContacts(ctx, id)
	if err != nil {
		return nil, err
	}
	var activityCount int
	if err := r.db.QueryRow(ctx, `SELECT count(*) FROM activities WHERE lead_id = $1`, id).Scan(&activityCount); err != nil {
		return nil, err
	}
	return &LeadProfile{Lead: lead, ActivitiesCount: activityCount, Contacts: contacts}, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id uuid.UUID, req UpdateLeadRequest) (*Lead, error) {
	sets := []string{}
	args := []any{}
	add := func(column string, value any) {
		args = append(args, value)
		sets = append(sets, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	if req.OwnerID != nil {
		add("owner_id", *req.OwnerID)
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
	if req.CompanyName != nil {
		add("company_name", *req.CompanyName)
	}
	if req.ContactName != nil {
		add("contact_name", *req.ContactName)
	}
	if req.ContactEmail != nil {
		add("contact_email", *req.ContactEmail)
	}
	if req.ContactPhone != nil {
		add("contact_phone", *req.ContactPhone)
	}
	if req.ValueUSD != nil {
		add("value_usd", *req.ValueUSD)
	}
	if req.Probability != nil {
		add("probability", normalizeProbability(*req.Probability))
	}
	if req.ExpectedCloseDate != nil {
		add("expected_close_date", *req.ExpectedCloseDate)
	}
	if req.Source != nil {
		add("source", *req.Source)
	}
	if req.Notes != nil {
		add("notes", *req.Notes)
	}
	if len(sets) == 0 {
		return r.FindByID(ctx, id)
	}
	args = append(args, id)
	row := r.db.QueryRow(ctx, fmt.Sprintf(`
		UPDATE leads SET %s WHERE id = $%d
		RETURNING %s`, strings.Join(sets, ", "), len(args), leadColumns), args...)
	return scanLead(row)
}

func (r *PostgresRepository) AdvanceStage(ctx context.Context, lead *Lead, req StageChangeRequest, user UserContext, notifyService NotificationService) (*Lead, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	txRepo := &transactionRepository{tx: tx, publisher: r.publisher}
	if req.Stage == StageWon {
		if _, err := HandleWon(ctx, *lead, user, txRepo, txRepo, notifyService); err != nil {
			return nil, err
		}
	}

	updated, err := txRepo.updateLeadStage(ctx, lead, req)
	if err != nil {
		return nil, err
	}
	body := fmt.Sprintf("Stage advanced from %d (%s) to %d (%s). Reason: %s", lead.StageNumber, StageName(lead.StageNumber), req.Stage, StageName(req.Stage), req.Reason)
	if _, err := txRepo.createActivity(ctx, lead.ID, user.ID, CreateActivityRequest{Type: "NOTE", Subject: "Stage changed", Body: body, OccurredAt: ptrTime(time.Now())}); err != nil {
		return nil, err
	}
	return updated, tx.Commit(ctx)
}

func (r *transactionRepository) updateLeadStage(ctx context.Context, lead *Lead, req StageChangeRequest) (*Lead, error) {
	args := []any{req.Stage, stageEnum(req.Stage)}
	sets := []string{"stage_number = $1", "stage = $2::lead_stage"}
	if req.Stage == StageLost {
		args = append(args, req.Reason, req.Competitor)
		sets = append(sets, fmt.Sprintf("lost_reason = $%d", len(args)-1), fmt.Sprintf("competitor = $%d", len(args)))
	}
	if req.Stage == StageWon {
		sets = append(sets, "status = 'CLOSED'::lead_status", "won_date = CURRENT_DATE")
	}
	if req.Stage == StageLost || req.Stage == StageDormant {
		sets = append(sets, "status = 'CLOSED'::lead_status")
	}
	args = append(args, lead.ID)
	row := r.tx.QueryRow(ctx, fmt.Sprintf(`UPDATE leads SET %s WHERE id = $%d RETURNING %s`, strings.Join(sets, ", "), len(args), leadColumns), args...)
	return scanLead(row)
}

func (r *PostgresRepository) CreateActivity(ctx context.Context, leadID, userID uuid.UUID, req CreateActivityRequest) (*Activity, error) {
	return createActivity(ctx, r.db, leadID, userID, req)
}

func createActivity(ctx context.Context, q queryer, leadID, userID uuid.UUID, req CreateActivityRequest) (*Activity, error) {
	activityType := strings.ToUpper(req.Type)
	if req.OccurredAt == nil {
		now := time.Now()
		req.OccurredAt = &now
	}
	row := q.QueryRow(ctx, `
		INSERT INTO activities (user_id, lead_id, type, status, subject, body, occurred_at, next_action_date)
		VALUES ($1, $2, $3::activity_type, 'COMPLETED'::activity_status, $4, $5, $6, $7)
		RETURNING id, user_id, lead_id, type::text, status::text, subject, COALESCE(body, ''), occurred_at, next_action_date, created_at`,
		userID, leadID, activityType, req.Subject, req.Body, req.OccurredAt, req.NextActionDate)
	return scanActivity(row)
}

func (r *PostgresRepository) ListActivities(ctx context.Context, leadID uuid.UUID, params PaginationParams) ([]*Activity, int, error) {
	total, err := countRows(ctx, r.db, "activities", "lead_id = $1", []any{leadID})
	if err != nil {
		return nil, 0, err
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, lead_id, type::text, status::text, subject, COALESCE(body, ''), occurred_at, next_action_date, created_at
		FROM activities WHERE lead_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		leadID, params.Limit, (params.Page-1)*params.Limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []*Activity{}
	for rows.Next() {
		item, err := scanActivity(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *PostgresRepository) CreateContact(ctx context.Context, leadID uuid.UUID, req CreateContactRequest) (*Contact, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO contacts (lead_id, full_name, title, email, phone, is_primary)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, lead_id, full_name, COALESCE(title, ''), COALESCE(email, ''), COALESCE(phone, ''), is_primary`,
		leadID, req.FullName, req.Title, req.Email, req.Phone, req.IsPrimary)
	return scanContact(row)
}

func (r *PostgresRepository) Overview(ctx context.Context) (*Overview, error) {
	where, args := leadWhere(ctx, LeadFilters{})
	overview := &Overview{}
	if err := r.db.QueryRow(ctx, fmt.Sprintf(`SELECT COALESCE(sum(value_usd),0), count(*) FROM leads WHERE %s`, where), args...).Scan(&overview.TotalValueUSD, &overview.TotalCount); err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, fmt.Sprintf(`SELECT stage_number, count(*), COALESCE(sum(value_usd),0), COALESCE(avg(probability),0) FROM leads WHERE %s GROUP BY stage_number ORDER BY stage_number`, where), args...)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		item := StageBreakdown{}
		var avgProbability float64
		if err := rows.Scan(&item.Stage, &item.Count, &item.Value, &avgProbability); err != nil {
			rows.Close()
			return nil, err
		}
		item.Name = StageName(item.Stage)
		item.AvgProbability = avgProbability * 100
		overview.ByStage = append(overview.ByStage, item)
	}
	rows.Close()

	if err := r.scanSectors(ctx, overview, where, args); err != nil {
		return nil, err
	}
	if err := r.scanCountries(ctx, overview, where, args); err != nil {
		return nil, err
	}
	if err := r.scanOwners(ctx, overview, where, args); err != nil {
		return nil, err
	}
	if err := r.monthTotals(ctx, overview, where, args); err != nil {
		return nil, err
	}
	if overview.TotalCount > 0 {
		closed := overview.WonThisMonth.Count + overview.LostThisMonth.Count
		if closed > 0 {
			overview.ConversionRate = float64(overview.WonThisMonth.Count) / float64(closed)
		}
	}
	_ = r.db.QueryRow(ctx, fmt.Sprintf(`SELECT COALESCE(avg(CURRENT_DATE - created_at::date), 0)::int FROM leads WHERE %s AND stage_number = 9`, where), args...).Scan(&overview.AvgDealCycleDays)
	return overview, nil
}

func (r *PostgresRepository) Forecast(ctx context.Context, months int) (*Forecast, error) {
	where, args := leadWhere(ctx, LeadFilters{})
	args = append(args, months)
	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT date_trunc('month', expected_close_date)::date AS month, count(*), COALESCE(sum(value_usd * probability),0), COALESCE(sum(value_usd),0)
		FROM leads
		WHERE %s AND stage_number BETWEEN 2 AND 8 AND expected_close_date < date_trunc('month', CURRENT_DATE) + ($%d::int * interval '1 month')
		GROUP BY month ORDER BY month`, where, len(args)), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	forecast := &Forecast{}
	for rows.Next() {
		item := ForecastMonth{}
		if err := rows.Scan(&item.Month, &item.Count, &item.WeightedValueUSD, &item.PipelineValueUSD); err != nil {
			return nil, err
		}
		forecast.TotalWeightedPipelineUSD += item.WeightedValueUSD
		forecast.Months = append(forecast.Months, item)
	}
	return forecast, rows.Err()
}

func (r *PostgresRepository) LastActivityAt(ctx context.Context, leadID uuid.UUID) (*time.Time, error) {
	var t *time.Time
	err := r.db.QueryRow(ctx, `SELECT max(created_at) FROM activities WHERE lead_id = $1`, leadID).Scan(&t)
	return t, err
}

func (r *PostgresRepository) scanSectors(ctx context.Context, overview *Overview, where string, args []any) error {
	scopedWhere := qualifyLeadWhere(where)
	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT s.id, s.name, count(*), COALESCE(sum(l.value_usd),0)
		FROM leads l JOIN sectors s ON l.sector_id = s.id
		WHERE %s GROUP BY s.id, s.name ORDER BY 4 DESC`, scopedWhere), args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		item := SectorBreakdown{}
		if err := rows.Scan(&item.SectorID, &item.Sector, &item.Count, &item.Value); err != nil {
			return err
		}
		overview.BySector = append(overview.BySector, item)
	}
	return rows.Err()
}

func (r *PostgresRepository) scanCountries(ctx context.Context, overview *Overview, where string, args []any) error {
	scopedWhere := qualifyLeadWhere(where)
	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT c.id, c.name, count(*), COALESCE(sum(l.value_usd),0)
		FROM leads l JOIN country_offices c ON l.country_id = c.id
		WHERE %s GROUP BY c.id, c.name ORDER BY 4 DESC`, scopedWhere), args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		item := CountryBreakdown{}
		if err := rows.Scan(&item.CountryID, &item.Country, &item.Count, &item.Value); err != nil {
			return err
		}
		overview.ByCountry = append(overview.ByCountry, item)
	}
	return rows.Err()
}

func (r *PostgresRepository) scanOwners(ctx context.Context, overview *Overview, where string, args []any) error {
	scopedWhere := qualifyLeadWhere(where)
	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT u.id, u.full_name, count(*), COALESCE(sum(l.value_usd),0),
			CASE WHEN COALESCE(avg(l.probability),0) >= 0.6 THEN 'GREEN' WHEN COALESCE(avg(l.probability),0) >= 0.35 THEN 'YELLOW' ELSE 'RED' END
		FROM leads l JOIN users u ON l.owner_id = u.id
		WHERE %s GROUP BY u.id, u.full_name ORDER BY 4 DESC`, scopedWhere), args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		item := OwnerBreakdown{}
		if err := rows.Scan(&item.UserID, &item.Name, &item.Count, &item.Value, &item.Health); err != nil {
			return err
		}
		overview.ByOwner = append(overview.ByOwner, item)
	}
	return rows.Err()
}

func (r *PostgresRepository) monthTotals(ctx context.Context, overview *Overview, where string, args []any) error {
	wonWhere := qualifyLeadWhere(where)
	if err := r.db.QueryRow(ctx, fmt.Sprintf(`SELECT count(*), COALESCE(sum(value_usd),0) FROM leads l WHERE %s AND stage_number = 9 AND won_date >= date_trunc('month', CURRENT_DATE)`, wonWhere), args...).Scan(&overview.WonThisMonth.Count, &overview.WonThisMonth.Value); err != nil {
		return err
	}
	if err := r.db.QueryRow(ctx, fmt.Sprintf(`SELECT count(*), COALESCE(sum(value_usd),0) FROM leads l WHERE %s AND stage_number = 10 AND updated_at >= date_trunc('month', CURRENT_DATE)`, wonWhere), args...).Scan(&overview.LostThisMonth.Count, &overview.LostThisMonth.Value); err != nil {
		return err
	}
	return nil
}

func leadWhere(ctx context.Context, filters LeadFilters) (string, []any) {
	where := []string{"1=1"}
	args := []any{}
	if filters.Stage != nil {
		args = append(args, *filters.Stage)
		where = append(where, fmt.Sprintf("stage_number = $%d", len(args)))
	}
	if filters.SectorID != uuid.Nil {
		args = append(args, filters.SectorID)
		where = append(where, fmt.Sprintf("sector_id = $%d", len(args)))
	}
	if filters.CountryID != uuid.Nil {
		args = append(args, filters.CountryID)
		where = append(where, fmt.Sprintf("country_id = $%d", len(args)))
	}
	if filters.OwnerID != uuid.Nil {
		args = append(args, filters.OwnerID)
		where = append(where, fmt.Sprintf("owner_id = $%d", len(args)))
	}
	if filters.MinValue != nil {
		args = append(args, *filters.MinValue)
		where = append(where, fmt.Sprintf("value_usd >= $%d", len(args)))
	}
	if filters.MaxValue != nil {
		args = append(args, *filters.MaxValue)
		where = append(where, fmt.Sprintf("value_usd <= $%d", len(args)))
	}
	if filters.IsHot != nil && *filters.IsHot {
		where = append(where, "NOT EXISTS (SELECT 1 FROM activities a WHERE a.lead_id = leads.id AND a.created_at >= NOW() - interval '7 days')")
	}
	if userID, ok := middleware.FilterUserID(ctx); ok {
		args = append(args, userID)
		where = append(where, fmt.Sprintf("owner_id = $%d", len(args)))
	}
	if countryID, ok := middleware.FilterCountryID(ctx); ok {
		args = append(args, countryID)
		where = append(where, fmt.Sprintf("country_id = $%d", len(args)))
	}
	return strings.Join(where, " AND "), args
}

func qualifyLeadWhere(where string) string {
	replacer := strings.NewReplacer("owner_id", "l.owner_id", "country_id", "l.country_id", "sector_id", "l.sector_id", "stage_number", "l.stage_number", "value_usd", "l.value_usd", "leads.id", "l.id")
	return replacer.Replace(where)
}

const leadColumns = `id, owner_id, country_id, region_id, sector_id, company_name, COALESCE(contact_name, ''), COALESCE(contact_email, ''), COALESCE(contact_phone, ''), stage::text, stage_number, status::text, value_usd, probability, expected_close_date, COALESCE(source, ''), COALESCE(notes, ''), COALESCE(lost_reason, ''), COALESCE(competitor, ''), won_date, created_at, updated_at`

type scanner interface{ Scan(dest ...any) error }

type queryer interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type transactionRepository struct {
	tx        pgx.Tx
	publisher *queue.Publisher
}

func (r *transactionRepository) FindTenantByLeadID(ctx context.Context, leadID uuid.UUID) (*Tenant, error) {
	item := &Tenant{}
	err := r.tx.QueryRow(ctx, `
		SELECT id, country_id, region_id, sector_id, account_manager_id, lead_id, name, status::text,
			arr_usd, mrr_usd, health_score, risk_score, renewal_date, onboarded_at, created_at, updated_at
		FROM tenants WHERE lead_id = $1`, leadID).
		Scan(&item.ID, &item.CountryID, &item.RegionID, &item.SectorID, &item.AccountManagerID, &item.LeadID, &item.Name, &item.Status, &item.ARRUSD, &item.MRRUSD, &item.HealthScore, &item.RiskScore, &item.RenewalDate, &item.OnboardedAt, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *transactionRepository) CreateTenantFromWonLead(ctx context.Context, tenant Tenant) (*Tenant, error) {
	item := &Tenant{}
	err := r.tx.QueryRow(ctx, `
		INSERT INTO tenants (id, name, country_id, region_id, sector_id, account_manager_id, lead_id, status, mrr_usd, renewal_date, created_by, hcs_account_id, huawei_region)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'PROSPECT'::tenant_status, 0, NULL, $8, '', 'af-south-1')
		RETURNING id, country_id, region_id, sector_id, account_manager_id, lead_id, name, status::text,
			arr_usd, mrr_usd, health_score, risk_score, renewal_date, onboarded_at, created_at, updated_at`,
		tenant.ID, tenant.Name, tenant.CountryID, tenant.RegionID, tenant.SectorID, tenant.AccountManagerID, tenant.LeadID, tenant.CreatedBy).
		Scan(&item.ID, &item.CountryID, &item.RegionID, &item.SectorID, &item.AccountManagerID, &item.LeadID, &item.Name, &item.Status, &item.ARRUSD, &item.MRRUSD, &item.HealthScore, &item.RiskScore, &item.RenewalDate, &item.OnboardedAt, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *transactionRepository) LogWonTenantActivity(ctx context.Context, leadID, userID, tenantID uuid.UUID) error {
	_, err := r.createActivity(ctx, leadID, userID, CreateActivityRequest{
		Type:       "NOTE",
		Subject:    "Deal Won - Tenant created",
		Body:       fmt.Sprintf("Lead converted to tenant. Tenant ID: %s. Next step: onboard to HCS.", tenantID.String()),
		OccurredAt: ptrTime(time.Now()),
	})
	return err
}

func (r *transactionRepository) PublishEmbeddingRefresh(ctx context.Context, tenantID uuid.UUID) error {
	if r.publisher == nil {
		return nil
	}
	return r.publisher.PublishQueueJSON(ctx, "htgcrm.ai.embedding_refresh", map[string]any{
		"entity_type": "tenant",
		"entity_id":   tenantID,
	})
}

func (r *transactionRepository) createActivity(ctx context.Context, leadID, userID uuid.UUID, req CreateActivityRequest) (*Activity, error) {
	return createActivity(ctx, r.tx, leadID, userID, req)
}

func scanLead(row scanner) (*Lead, error) {
	item := &Lead{}
	err := row.Scan(&item.ID, &item.OwnerID, &item.CountryID, &item.RegionID, &item.SectorID, &item.CompanyName, &item.ContactName, &item.ContactEmail, &item.ContactPhone, &item.Stage, &item.StageNumber, &item.Status, &item.ValueUSD, &item.Probability, &item.ExpectedCloseDate, &item.Source, &item.Notes, &item.LostReason, &item.Competitor, &item.WonDate, &item.CreatedAt, &item.UpdatedAt)
	item.Probability *= 100
	item.StageName = StageName(item.StageNumber)
	return item, err
}

func scanActivity(row scanner) (*Activity, error) {
	item := &Activity{}
	err := row.Scan(&item.ID, &item.UserID, &item.LeadID, &item.Type, &item.Status, &item.Subject, &item.Body, &item.OccurredAt, &item.NextActionDate, &item.CreatedAt)
	return item, err
}

func scanContact(row scanner) (*Contact, error) {
	item := &Contact{}
	err := row.Scan(&item.ID, &item.LeadID, &item.FullName, &item.Title, &item.Email, &item.Phone, &item.IsPrimary)
	return item, err
}

func (r *PostgresRepository) listContacts(ctx context.Context, leadID uuid.UUID) ([]*Contact, error) {
	rows, err := r.db.Query(ctx, `SELECT id, lead_id, full_name, COALESCE(title, ''), COALESCE(email, ''), COALESCE(phone, ''), is_primary FROM contacts WHERE lead_id = $1 ORDER BY is_primary DESC, full_name`, leadID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []*Contact{}
	for rows.Next() {
		item, err := scanContact(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func countRows(ctx context.Context, db *pgxpool.Pool, table, where string, args []any) (int, error) {
	var total int
	err := db.QueryRow(ctx, fmt.Sprintf("SELECT count(*) FROM %s WHERE %s", table, where), args...).Scan(&total)
	return total, err
}

func safeLeadSort(sort string) string {
	switch sort {
	case "company_name", "stage_number", "value_usd", "expected_close_date", "created_at", "updated_at":
		return sort
	default:
		return "created_at"
	}
}

func normalizeProbability(value float64) float64 {
	if value > 1 {
		return value / 100
	}
	return value
}

func stageEnum(stage int) string {
	switch stage {
	case StageWon:
		return "WON"
	case StageLost:
		return "LOST"
	case StageDormant:
		return "DORMANT"
	case 4, 5:
		return "PROPOSAL"
	case 6, 7, 8:
		return "NEGOTIATION"
	case 2, 3:
		return "QUALIFIED"
	default:
		return "NEW"
	}
}

func StageName(stage int) string {
	names := map[int]string{
		1: "New Lead", 2: "Qualified", 3: "Discovery", 4: "Solution Fit", 5: "Proposal", 6: "Negotiation", 7: "Procurement", 8: "Contracting", 9: "Won", 10: "Lost", 11: "Dormant",
	}
	if name, ok := names[stage]; ok {
		return name
	}
	return "Unknown"
}

func ptrTime(t time.Time) *time.Time {
	return &t
}

var _ Repository = (*PostgresRepository)(nil)
