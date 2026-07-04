package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/htgclouds/crm-api/internal/auth"
)

func NewPostgresPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute
	config.HealthCheckPeriod = 1 * time.Minute
	config.ConnConfig.ConnectTimeout = 10 * time.Second
	config.BeforeAcquire = func(ctx context.Context, conn *pgx.Conn) bool {
		uc, ok := ctx.Value(auth.ContextKey{}).(auth.UserContext)
		if !ok {
			return true
		}

		_, err := conn.Exec(
			ctx,
			"SELECT set_config('app.user_id',$1,true),set_config('app.user_role',$2,true),set_config('app.country_id',$3,true)",
			uc.ID.String(),
			uc.Role,
			uc.CountryOfficeID.String(),
		)
		return err == nil
	}

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return pgxpool.NewWithConfig(ctx, config)
}
