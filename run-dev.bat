@echo off
set DATABASE_URL=postgres://htg:htgdev@127.0.0.1:5432/htgcrm?sslmode=disable
set KEYCLOAK_URL=http://localhost:8080
set KEYCLOAK_REALM=htg-crm
set KEYCLOAK_AUDIENCE=
set REDIS_ADDR=localhost:6380
set REDIS_PASSWORD=
set REDIS_DB=0
set RABBITMQ_URL=amqp://htg:htgdev@localhost:5835/
set CLICKHOUSE_ADDR=localhost:9000
set CLICKHOUSE_DATABASE=tenant_analytics
set CLICKHOUSE_USERNAME=htg
set CLICKHOUSE_PASSWORD=htgdev
set HTTP_ADDR=:8081
set OPENAI_API_KEY=placeholder

go run ./cmd/server
