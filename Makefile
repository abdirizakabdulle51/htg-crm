.PHONY: run build test migrate seed lint docker dev-up dev-down dev

ENV_FILE ?= .env.local
ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
export
endif

run:
	go run ./cmd/server

build:
	go build -o bin/server ./cmd/server

test:
	go test ./...

migrate:
	migrate -path internal/migrations -database "$$DATABASE_URL" up

seed:
	go run ./cmd/seed

lint:
	go vet ./...

docker:
	docker build -t htg-crm-api .

dev-up:
	docker compose up -d

dev-down:
	docker compose down

dev:
	go run ./cmd/server
