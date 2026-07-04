package database

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionContext struct {
	UserID    uuid.UUID
	UserRole  string
	CountryID uuid.UUID
}

func WithSession(ctx context.Context, pool *pgxpool.Pool, session SessionContext, fn func(pgx.Tx) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := setLocal(ctx, tx, "app.user_id", session.UserID.String()); err != nil {
		return err
	}
	if err := setLocal(ctx, tx, "app.user_role", session.UserRole); err != nil {
		return err
	}
	if err := setLocal(ctx, tx, "app.country_id", session.CountryID.String()); err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func setLocal(ctx context.Context, tx pgx.Tx, key, value string) error {
	_, err := tx.Exec(ctx, "SELECT set_config($1, $2, true)", key, value)
	return err
}
