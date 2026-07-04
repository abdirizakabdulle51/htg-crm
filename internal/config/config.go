package config

import (
	"strings"

	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	AppEnv                    string `envconfig:"APP_ENV" default:"development"`
	HTTPAddr                  string `envconfig:"HTTP_ADDR" default:":8080"`
	CORSOrigins               string `envconfig:"CORS_ORIGINS" default:"http://localhost:3000"`
	DatabaseURL               string `envconfig:"DATABASE_URL" required:"true"`
	ClickHouseAddr            string `envconfig:"CLICKHOUSE_ADDR" default:"localhost:9000"`
	ClickHouseDB              string `envconfig:"CLICKHOUSE_DATABASE" default:"tenant_analytics"`
	ClickHouseUser            string `envconfig:"CLICKHOUSE_USERNAME" default:"default"`
	ClickHousePass            string `envconfig:"CLICKHOUSE_PASSWORD"`
	RedisAddr                 string `envconfig:"REDIS_ADDR" default:"localhost:6379"`
	RedisPassword             string `envconfig:"REDIS_PASSWORD"`
	RedisDB                   int    `envconfig:"REDIS_DB" default:"0"`
	RabbitMQURL               string `envconfig:"RABBITMQ_URL" default:"amqp://guest:guest@localhost:5672/"`
	KeycloakURL               string `envconfig:"KEYCLOAK_URL" default:"http://localhost:8080"`
	KeycloakRealm             string `envconfig:"KEYCLOAK_REALM" default:"htg-crm"`
	KeycloakIssuer            string `envconfig:"KEYCLOAK_ISSUER"`
	KeycloakJWKSURL           string `envconfig:"KEYCLOAK_JWKS_URL"`
	KeycloakAudience          string `envconfig:"KEYCLOAK_AUDIENCE"`
	KeycloakAdminClientSecret string `envconfig:"KEYCLOAK_ADMIN_CLIENT_SECRET"`
	OpenAIAPIKey              string `envconfig:"OPENAI_API_KEY"`
	OpenAIModel               string `envconfig:"OPENAI_MODEL" default:"gpt-4.1-mini"`
	SMTPHost                  string `envconfig:"SMTP_HOST"`
	SMTPPort                  int    `envconfig:"SMTP_PORT" default:"587"`
	SMTPUser                  string `envconfig:"SMTP_USER"`
	SMTPPass                  string `envconfig:"SMTP_PASS"`
	SMTPFrom                  string `envconfig:"SMTP_FROM"`
	SMTPAdminEmail            string `envconfig:"SMTP_ADMIN_EMAIL"`
	PushWebhookURL            string `envconfig:"PUSH_WEBHOOK_URL"`
	HCSEndpoint               string `envconfig:"HCS_ENDPOINT"`
	HCSUsername               string `envconfig:"HCS_USERNAME"`
	HCSPassword               string `envconfig:"HCS_PASSWORD"`
	HCSDomainID               string `envconfig:"HCS_DOMAIN_ID"`
}

func Load() (Config, error) {
	var cfg Config
	err := envconfig.Process("", &cfg)
	return cfg, err
}

func (c Config) AllowedOrigins() []string {
	parts := strings.Split(c.CORSOrigins, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}
