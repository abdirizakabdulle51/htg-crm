package users

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, user *User) (*User, error) {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	if user.KeycloakID == "" {
		user.KeycloakID = user.ID.String()
	}

	row := r.db.QueryRow(ctx, `
		INSERT INTO users (id, keycloak_id, email, full_name, role, country_office_id, phone, is_active)
		VALUES ($1, $2, $3, $4, $5::user_role, $6, $7, TRUE)
		RETURNING id, keycloak_id, email, full_name, role::text, country_office_id, COALESCE(phone, ''), is_active, created_at, updated_at`,
		user.ID, user.KeycloakID, user.Email, user.FullName, user.Role, user.CountryOfficeID, user.Phone,
	)
	return scanUser(row)
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, keycloak_id, email, full_name, role::text, country_office_id, COALESCE(phone, ''), is_active, created_at, updated_at
		FROM users
		WHERE id = $1`, id)
	user, err := scanUser(row)
	if err != nil {
		return nil, err
	}
	return r.attachAssignments(ctx, user)
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, keycloak_id, email, full_name, role::text, country_office_id, COALESCE(phone, ''), is_active, created_at, updated_at
		FROM users
		WHERE email = $1`, email)
	user, err := scanUser(row)
	if err != nil {
		return nil, err
	}
	return r.attachAssignments(ctx, user)
}

func (r *Repository) FindAll(ctx context.Context, filters UserFilters, params PaginationParams) ([]*User, int, error) {
	where := []string{"1=1"}
	args := []any{}
	if filters.Role != "" {
		args = append(args, filters.Role)
		where = append(where, fmt.Sprintf("role = $%d", len(args)))
	}
	if filters.CountryOfficeID != uuid.Nil {
		args = append(args, filters.CountryOfficeID)
		where = append(where, fmt.Sprintf("country_office_id = $%d", len(args)))
	}
	if filters.IsActive != nil {
		args = append(args, *filters.IsActive)
		where = append(where, fmt.Sprintf("is_active = $%d", len(args)))
	}

	whereSQL := strings.Join(where, " AND ")
	countSQL := "SELECT count(*) FROM users WHERE " + whereSQL
	var total int
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sort := safeUserSort(params.Sort)
	offset := (params.Page - 1) * params.Limit
	args = append(args, params.Limit, offset)
	query := fmt.Sprintf(`
		SELECT id, keycloak_id, email, full_name, role::text, country_office_id, COALESCE(phone, ''), is_active, created_at, updated_at
		FROM users
		WHERE %s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`, whereSQL, sort, params.Order, len(args)-1, len(args))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	users := []*User{}
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}
	return users, total, rows.Err()
}

func (r *Repository) Update(ctx context.Context, id uuid.UUID, updates UserUpdates) (*User, error) {
	sets := []string{}
	args := []any{}
	add := func(column string, value any) {
		args = append(args, value)
		sets = append(sets, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	if updates.Email != nil {
		add("email", *updates.Email)
	}
	if updates.FullName != nil {
		add("full_name", *updates.FullName)
	}
	if updates.Role != nil {
		args = append(args, *updates.Role)
		sets = append(sets, fmt.Sprintf("role = $%d::user_role", len(args)))
	}
	if updates.CountryOfficeID != nil {
		add("country_office_id", *updates.CountryOfficeID)
	}
	if updates.Phone != nil {
		add("phone", *updates.Phone)
	}
	if updates.IsActive != nil {
		add("is_active", *updates.IsActive)
	}
	if len(sets) == 0 {
		return r.FindByID(ctx, id)
	}

	args = append(args, id)
	query := fmt.Sprintf(`
		UPDATE users SET %s
		WHERE id = $%d
		RETURNING id, keycloak_id, email, full_name, role::text, country_office_id, COALESCE(phone, ''), is_active, created_at, updated_at`,
		strings.Join(sets, ", "), len(args),
	)
	return scanUser(r.db.QueryRow(ctx, query, args...))
}

func (r *Repository) SetRegions(ctx context.Context, id uuid.UUID, regions []uuid.UUID) error {
	return replaceIDs(ctx, r.db, "user_regions", "region_id", id, regions)
}

func (r *Repository) SetSectors(ctx context.Context, id uuid.UUID, sectors []uuid.UUID) error {
	return replaceIDs(ctx, r.db, "user_sectors", "sector_id", id, sectors)
}

func (r *Repository) Deactivate(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, "UPDATE users SET is_active = FALSE WHERE id = $1", id)
	return err
}

func (r *Repository) CreateCountryOffice(ctx context.Context, req CreateCountryOfficeRequest) (*CountryOffice, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO country_offices (code, name, timezone, currency_code)
		VALUES ($1, $2, $3, $4)
		RETURNING id, code, name, timezone, currency_code, is_active`,
		req.Code, req.Name, req.Timezone, req.CurrencyCode,
	)
	return scanCountryOffice(row)
}

func (r *Repository) ListCountryOffices(ctx context.Context) ([]*CountryOffice, error) {
	rows, err := r.db.Query(ctx, "SELECT id, code, name, timezone, currency_code, is_active FROM country_offices ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []*CountryOffice{}
	for rows.Next() {
		item, err := scanCountryOffice(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) UpdateCountryOffice(ctx context.Context, id uuid.UUID, req UpdateCountryOfficeRequest) (*CountryOffice, error) {
	sets := []string{}
	args := []any{}
	add := func(column string, value any) {
		args = append(args, value)
		sets = append(sets, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	if req.Code != nil {
		add("code", *req.Code)
	}
	if req.Name != nil {
		add("name", *req.Name)
	}
	if req.Timezone != nil {
		add("timezone", *req.Timezone)
	}
	if req.CurrencyCode != nil {
		add("currency_code", *req.CurrencyCode)
	}
	if req.IsActive != nil {
		add("is_active", *req.IsActive)
	}
	if len(sets) == 0 {
		return scanCountryOffice(r.db.QueryRow(ctx, "SELECT id, code, name, timezone, currency_code, is_active FROM country_offices WHERE id = $1", id))
	}
	args = append(args, id)
	query := fmt.Sprintf("UPDATE country_offices SET %s WHERE id = $%d RETURNING id, code, name, timezone, currency_code, is_active", strings.Join(sets, ", "), len(args))
	return scanCountryOffice(r.db.QueryRow(ctx, query, args...))
}

func (r *Repository) CreateRegion(ctx context.Context, req CreateRegionRequest) (*Region, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO regions (country_office_id, name, code, type)
		VALUES ($1, $2, $3, $4)
		RETURNING id, country_office_id, name, code, type, is_active`,
		req.CountryOfficeID, req.Name, req.Code, req.Type,
	)
	return scanRegion(row)
}

func (r *Repository) ListRegions(ctx context.Context, filters RegionFilters) ([]*Region, error) {
	where := []string{"1=1"}
	args := []any{}
	if filters.CountryOfficeID != uuid.Nil {
		args = append(args, filters.CountryOfficeID)
		where = append(where, fmt.Sprintf("country_office_id = $%d", len(args)))
	}
	if filters.Type != "" {
		args = append(args, filters.Type)
		where = append(where, fmt.Sprintf("type = $%d", len(args)))
	}
	query := "SELECT id, country_office_id, name, code, type, is_active FROM regions WHERE " + strings.Join(where, " AND ") + " ORDER BY name"
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []*Region{}
	for rows.Next() {
		item, err := scanRegion(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreateSector(ctx context.Context, req CreateSectorRequest) (*Sector, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO sectors (name, description)
		VALUES ($1, $2)
		RETURNING id, name, COALESCE(description, ''), is_active`,
		req.Name, req.Description,
	)
	return scanSector(row)
}

func (r *Repository) ListSectors(ctx context.Context) ([]*Sector, error) {
	rows, err := r.db.Query(ctx, "SELECT id, name, COALESCE(description, ''), is_active FROM sectors ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []*Sector{}
	for rows.Next() {
		item, err := scanSector(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) UpdateKeycloakID(ctx context.Context, id uuid.UUID, keycloakID string) (*User, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE users SET keycloak_id = $1
		WHERE id = $2
		RETURNING id, keycloak_id, email, full_name, role::text, country_office_id, COALESCE(phone, ''), is_active, created_at, updated_at`,
		keycloakID, id,
	)
	return scanUser(row)
}

func (r *Repository) attachAssignments(ctx context.Context, user *User) (*User, error) {
	regions, err := r.listAssignmentIDs(ctx, "user_regions", "region_id", user.ID)
	if err != nil {
		return nil, err
	}
	sectors, err := r.listAssignmentIDs(ctx, "user_sectors", "sector_id", user.ID)
	if err != nil {
		return nil, err
	}
	user.Regions = regions
	user.Sectors = sectors
	return user, nil
}

func (r *Repository) listAssignmentIDs(ctx context.Context, table, column string, userID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.db.Query(ctx, fmt.Sprintf("SELECT %s FROM %s WHERE user_id = $1", column, table), userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []uuid.UUID{}
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		items = append(items, id)
	}
	return items, rows.Err()
}

func replaceIDs(ctx context.Context, db *pgxpool.Pool, table, column string, userID uuid.UUID, ids []uuid.UUID) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, fmt.Sprintf("DELETE FROM %s WHERE user_id = $1", table), userID); err != nil {
		return err
	}
	for _, id := range ids {
		if _, err := tx.Exec(ctx, fmt.Sprintf("INSERT INTO %s (user_id, %s) VALUES ($1, $2)", table, column), userID, id); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

type scanner interface {
	Scan(dest ...any) error
}

func scanUser(row scanner) (*User, error) {
	user := &User{}
	err := row.Scan(&user.ID, &user.KeycloakID, &user.Email, &user.FullName, &user.Role, &user.CountryOfficeID, &user.Phone, &user.IsActive, &user.CreatedAt, &user.UpdatedAt)
	return user, err
}

func scanCountryOffice(row scanner) (*CountryOffice, error) {
	item := &CountryOffice{}
	err := row.Scan(&item.ID, &item.Code, &item.Name, &item.Timezone, &item.CurrencyCode, &item.IsActive)
	return item, err
}

func scanRegion(row scanner) (*Region, error) {
	item := &Region{}
	err := row.Scan(&item.ID, &item.CountryOfficeID, &item.Name, &item.Code, &item.Type, &item.IsActive)
	return item, err
}

func scanSector(row scanner) (*Sector, error) {
	item := &Sector{}
	err := row.Scan(&item.ID, &item.Name, &item.Description, &item.IsActive)
	return item, err
}

func safeUserSort(sort string) string {
	switch sort {
	case "email", "full_name", "role", "created_at", "updated_at":
		return sort
	default:
		return "created_at"
	}
}

var _ UserRepository = (*Repository)(nil)
