package main

import (
	"context"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"

	"github.com/htgclouds/crm-api/internal/config"
)

func main() {
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("load_config")
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Fatal().Err(err).Msg("connect_postgres")
	}
	defer db.Close()

	statements := []string{
		`INSERT INTO country_offices (code, name, timezone, currency_code) VALUES
			('SO', 'Somalia', 'Africa/Mogadishu', 'USD'),
			('KE', 'Kenya', 'Africa/Nairobi', 'KES'),
			('ET', 'Ethiopia', 'Africa/Addis_Ababa', 'ETB'),
			('DJ', 'Djibouti', 'Africa/Djibouti', 'DJF')
		ON CONFLICT (code) DO NOTHING`,
		`INSERT INTO sectors (name, description) VALUES
			('Telecom', 'Network and connectivity providers'),
			('Finance', 'Banks, fintech, insurance, and payments'),
			('Healthcare', 'Hospitals, clinics, and health technology'),
			('Government', 'Public sector institutions'),
			('Education', 'Schools, universities, and training providers'),
			('Retail', 'Retail and commerce organizations'),
			('Logistics', 'Transport, warehousing, and supply chain'),
			('Energy', 'Power, utilities, and energy providers'),
			('Hospitality', 'Hotels, tourism, and travel'),
			('Manufacturing', 'Industrial and production firms'),
			('NGO', 'Non-governmental organizations'),
			('Agriculture', 'Agribusiness and food production')
		ON CONFLICT (name) DO NOTHING`,
		`INSERT INTO regions (country_office_id, name, code)
		SELECT co.id, r.name, r.code
		FROM country_offices co
		JOIN (VALUES
			('SO', 'Mogadishu', 'BN'), ('SO', 'Hargeisa', 'HG'),
			('KE', 'Nairobi', 'NRB'), ('KE', 'Mombasa', 'MBA'), ('KE', 'Kisumu', 'KSM'),
			('ET', 'Addis Ababa', 'AA'), ('ET', 'Dire Dawa', 'DD'),
			('DJ', 'Djibouti City', 'DJI'), ('DJ', 'Ali Sabieh', 'AS')
		) AS r(country_code, name, code) ON r.country_code = co.code
		ON CONFLICT (country_office_id, code) DO NOTHING`,
		`INSERT INTO users (keycloak_id, email, full_name, role, country_office_id)
		SELECT 'keycloak-am-test', 'am@test.com', 'Account Manager', 'ACCOUNT_MANAGER', id FROM country_offices WHERE code = 'KE'
		ON CONFLICT (email) DO NOTHING`,
		`INSERT INTO users (keycloak_id, email, full_name, role, country_office_id)
		SELECT 'keycloak-gm-test', 'gm@test.com', 'Country GM', 'COUNTRY_GM', id FROM country_offices WHERE code = 'KE'
		ON CONFLICT (email) DO NOTHING`,
		`INSERT INTO users (keycloak_id, email, full_name, role)
		VALUES ('keycloak-hob-test', 'hob@test.com', 'Head of Business', 'HEAD_OF_BUSINESS')
		ON CONFLICT (email) DO NOTHING`,
		`INSERT INTO users (keycloak_id, email, full_name, role)
		VALUES ('keycloak-ceo-test', 'ceo@test.com', 'Chief Executive', 'CEO')
		ON CONFLICT (email) DO NOTHING`,
		`INSERT INTO users (keycloak_id, email, full_name, role)
		VALUES ('keycloak-admin-test', 'admin@test.com', 'CRM Admin', 'ADMIN')
		ON CONFLICT (email) DO NOTHING`,
	}

	for _, statement := range statements {
		if _, err := db.Exec(ctx, statement); err != nil {
			logger.Fatal().Err(err).Msg("seed_statement")
		}
	}

	logger.Info().Msg("seed_complete")
}
