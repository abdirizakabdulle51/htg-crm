package targets

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Repository struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

func NewRepository(db *pgxpool.Pool, redisClient *redis.Client) *Repository {
	return &Repository{db: db, redis: redisClient}
}

func (r *Repository) CreateAnnualTarget(ctx context.Context, req CreateTargetRequest, quarters []float64) (*AnnualTarget, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var target AnnualTarget
	err = tx.QueryRow(ctx, `
		INSERT INTO sales_targets (user_id, year, annual_target_usd)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, year) DO UPDATE SET annual_target_usd = EXCLUDED.annual_target_usd
		RETURNING id, user_id, year, annual_target_usd, created_at, updated_at`,
		req.UserID, req.Year, req.AnnualTargetUSD,
	).Scan(&target.ID, &target.UserID, &target.Year, &target.AnnualTargetUSD, &target.CreatedAt, &target.UpdatedAt)
	if err != nil {
		return nil, err
	}

	existing, err := r.quarters(ctx, target.ID)
	if err != nil {
		return nil, err
	}
	if len(existing) == 4 {
		quarters = recalculateUnlockedQuarters(req.AnnualTargetUSD, existing)
	}

	for i, value := range quarters {
		quarter := i + 1
		_, err := tx.Exec(ctx, `
			INSERT INTO quarterly_targets (sales_target_id, quarter, target_usd)
			VALUES ($1, $2, $3)
			ON CONFLICT (sales_target_id, quarter) DO UPDATE
			SET target_usd = CASE WHEN quarterly_targets.is_manually_set THEN quarterly_targets.target_usd ELSE EXCLUDED.target_usd END`,
			target.ID, quarter, value,
		)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetAnnualTarget(ctx, req.UserID, req.Year)
}

func (r *Repository) GetAnnualTarget(ctx context.Context, userID uuid.UUID, year int) (*AnnualTarget, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, user_id, year, annual_target_usd, created_at, updated_at
		FROM sales_targets
		WHERE user_id = $1 AND year = $2`, userID, year)
	target, err := scanAnnualTarget(row)
	if err != nil {
		return nil, err
	}
	quarters, err := r.quarters(ctx, target.ID)
	if err != nil {
		return nil, err
	}
	target.Quarters = quarters
	return target, nil
}

func (r *Repository) GetQuarterlyTarget(ctx context.Context, userID uuid.UUID, year, quarter int) (*QuarterlyTarget, error) {
	row := r.db.QueryRow(ctx, `
		SELECT qt.id, qt.sales_target_id, qt.quarter, qt.target_usd, qt.achieved_usd, qt.is_manually_set
		FROM quarterly_targets qt
		JOIN sales_targets st ON st.id = qt.sales_target_id
		WHERE st.user_id = $1 AND st.year = $2 AND qt.quarter = $3`, userID, year, quarter)
	return scanQuarterlyTarget(row)
}

func (r *Repository) UpdateQuarterlyTarget(ctx context.Context, id uuid.UUID, targetUSD float64) (*QuarterlyTarget, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE quarterly_targets qt SET target_usd = $1, is_manually_set = TRUE
		FROM sales_targets st
		WHERE qt.id = $2 AND st.id = qt.sales_target_id
		RETURNING qt.id, qt.sales_target_id, st.user_id, st.year, qt.quarter, qt.target_usd, qt.achieved_usd, qt.is_manually_set`,
		targetUSD, id,
	)
	return scanQuarterlyTargetWithOwner(row)
}

func (r *Repository) ListUserTargets(ctx context.Context, userID uuid.UUID) ([]*AnnualTarget, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, year, annual_target_usd, created_at, updated_at
		FROM sales_targets
		WHERE user_id = $1
		ORDER BY year DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []*AnnualTarget{}
	for rows.Next() {
		item, err := scanAnnualTarget(rows)
		if err != nil {
			return nil, err
		}
		item.Quarters, err = r.quarters(ctx, item.ID)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListTeamTargets(ctx context.Context, requesterRole string, requesterCountryID uuid.UUID) ([]*TeamTarget, error) {
	where := "u.role = 'ACCOUNT_MANAGER'"
	args := []any{}
	if requesterRole == "COUNTRY_GM" {
		args = append(args, requesterCountryID)
		where += " AND u.country_office_id = $1"
	}

	rows, err := r.db.Query(ctx, fmt.Sprintf(`
		SELECT u.id, u.email, u.full_name, u.country_office_id, COALESCE(co.name, ''), COALESCE(st.annual_target_usd, 0),
			COALESCE(SUM(CASE WHEN l.stage = 'WON' THEN COALESCE(l.potential_value_usd, l.value_usd) ELSE 0 END), 0)
		FROM users u
		LEFT JOIN country_offices co ON co.id = u.country_office_id
		LEFT JOIN sales_targets st ON st.user_id = u.id AND st.year = EXTRACT(YEAR FROM NOW())::int
		LEFT JOIN leads l ON l.owner_id = u.id AND EXTRACT(YEAR FROM COALESCE(l.won_date, l.updated_at)) = EXTRACT(YEAR FROM NOW())
		WHERE %s
		GROUP BY u.id, u.email, u.full_name, u.country_office_id, co.name, st.annual_target_usd
		ORDER BY u.full_name`, where), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []*TeamTarget{}
	for rows.Next() {
		item := &TeamTarget{}
		if err := rows.Scan(&item.UserID, &item.Email, &item.Name, &item.CountryOfficeID, &item.Country, &item.AnnualTargetUSD, &item.AchievedUSD); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) GetAchievementsByMonth(ctx context.Context, userID uuid.UUID, year int) ([]Achievement, error) {
	rows, err := r.db.Query(ctx, `
		SELECT EXTRACT(MONTH FROM won_date)::int AS month, COALESCE(SUM(COALESCE(potential_value_usd, value_usd)), 0)
		FROM leads
		WHERE owner_id = $1 AND stage = 'WON' AND won_date >= make_date($2, 1, 1) AND won_date < make_date($2 + 1, 1, 1)
		GROUP BY month
		ORDER BY month`, userID, year)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []Achievement{}
	for rows.Next() {
		item := Achievement{}
		if err := rows.Scan(&item.Month, &item.AchievedUSD); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) SumWonDeals(ctx context.Context, userID uuid.UUID, start, end time.Time) (float64, error) {
	var total float64
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(COALESCE(potential_value_usd, value_usd)), 0)
		FROM leads
		WHERE owner_id = $1 AND stage = 'WON' AND won_date >= $2 AND won_date <= $3`,
		userID, start, end,
	).Scan(&total)
	return total, err
}

func (r *Repository) WorkingDays(ctx context.Context, userID uuid.UUID, start, end time.Time) (int, error) {
	var days int
	err := r.db.QueryRow(ctx, `
		WITH calendar AS (
			SELECT generate_series($2::date, $3::date, interval '1 day')::date AS day
		)
		SELECT count(*)
		FROM calendar
		JOIN users u ON u.id = $1
		JOIN country_offices co ON co.id = u.country_office_id
		LEFT JOIN public_holidays ph ON ph.country_office_id = co.id AND ph.holiday_date = calendar.day
		WHERE EXTRACT(ISODOW FROM calendar.day) BETWEEN 1 AND 5 AND ph.id IS NULL`,
		userID, start, end,
	).Scan(&days)
	return days, err
}

func (r *Repository) GetCachedHealth(ctx context.Context, userID uuid.UUID, year, quarter int) (*TargetHealth, error) {
	if r.redis == nil {
		return nil, nil
	}
	raw, err := r.redis.Get(ctx, healthCacheKey(userID, year, quarter)).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var health TargetHealth
	if err := json.Unmarshal([]byte(raw), &health); err != nil {
		return nil, err
	}
	return &health, nil
}

func (r *Repository) CacheHealth(ctx context.Context, health TargetHealth) error {
	if r.redis == nil {
		return nil
	}
	body, err := json.Marshal(health)
	if err != nil {
		return err
	}
	return r.redis.Set(ctx, healthCacheKey(health.UserID, health.Year, health.Quarter), body, 15*time.Minute).Err()
}

func (r *Repository) InvalidateHealth(ctx context.Context, userID uuid.UUID, year, quarter int) error {
	if r.redis == nil {
		return nil
	}
	return r.redis.Del(ctx, healthCacheKey(userID, year, quarter), coachCacheKey(userID, time.Now().UTC())).Err()
}

func (r *Repository) quarters(ctx context.Context, salesTargetID uuid.UUID) ([]QuarterlyTarget, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, sales_target_id, quarter, target_usd, achieved_usd, is_manually_set
		FROM quarterly_targets
		WHERE sales_target_id = $1
		ORDER BY quarter`, salesTargetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []QuarterlyTarget{}
	for rows.Next() {
		item, err := scanQuarterlyTarget(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return items, rows.Err()
}

type scanner interface {
	Scan(dest ...any) error
}

func scanAnnualTarget(row scanner) (*AnnualTarget, error) {
	item := &AnnualTarget{}
	err := row.Scan(&item.ID, &item.UserID, &item.Year, &item.AnnualTargetUSD, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func scanQuarterlyTarget(row scanner) (*QuarterlyTarget, error) {
	item := &QuarterlyTarget{}
	err := row.Scan(&item.ID, &item.SalesTargetID, &item.Quarter, &item.TargetUSD, &item.AchievedUSD, &item.IsManuallySet)
	return item, err
}

func scanQuarterlyTargetWithOwner(row scanner) (*QuarterlyTarget, error) {
	item := &QuarterlyTarget{}
	err := row.Scan(&item.ID, &item.SalesTargetID, &item.UserID, &item.Year, &item.Quarter, &item.TargetUSD, &item.AchievedUSD, &item.IsManuallySet)
	return item, err
}

func healthCacheKey(userID uuid.UUID, year, quarter int) string {
	return fmt.Sprintf("htgcrm:health:%s:%d-Q%d", userID, year, quarter)
}

func coachCacheKey(userID uuid.UUID, today time.Time) string {
	return fmt.Sprintf("htgcrm:coach:%s:%s", userID, today.Format("2006-01-02"))
}

func recalculateUnlockedQuarters(annual float64, existing []QuarterlyTarget) []float64 {
	values := make([]float64, 4)
	manualTotal := 0.0
	unlocked := []int{}
	weights := []float64{0.22, 0.23, 0.25, 0.30}
	unlockedWeight := 0.0

	for i, quarter := range existing {
		if quarter.IsManuallySet {
			values[i] = quarter.TargetUSD
			manualTotal += quarter.TargetUSD
			continue
		}
		unlocked = append(unlocked, i)
		unlockedWeight += weights[i]
	}

	if len(unlocked) == 0 {
		return values
	}

	remainder := annual - manualTotal
	assigned := 0.0
	for position, index := range unlocked {
		if position == len(unlocked)-1 {
			values[index] = math.Round(remainder - assigned)
			break
		}
		value := math.Round(remainder * (weights[index] / unlockedWeight))
		values[index] = value
		assigned += value
	}
	return values
}

var _ TargetRepository = (*Repository)(nil)
