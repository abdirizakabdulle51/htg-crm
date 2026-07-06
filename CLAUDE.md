# HTG Clouds Revenue Growth CRM — Project Context

You are working on the HTG Clouds Revenue Growth Platform, a CRM system for a Huawei Cloud partner
operating in Somalia, Kenya, Ethiopia, and Djibouti.

---

## Stack

| Layer       | Tech                          | Port  |
|-------------|-------------------------------|-------|
| Frontend    | Next.js 14.2 App Router       | 3000  |
| Backend     | Go 1.22 / Gin                 | 8081  |
| Auth        | Keycloak 24 + NextAuth.js     | 8080  |
| Database    | PostgreSQL 15 (Docker)        | 5432  |
| Cache       | Redis (Docker)                | 6380  |
| Queue       | RabbitMQ (Docker)             | 5835  |
| Analytics   | ClickHouse (Docker)           | 9000  |

---

## Directory Layout

```
C:\Users\cabdi\Documents\htg-crm\
├── cmd/server/main.go          ← server entry point, registers all routes
├── internal/
│   ├── middleware/rbac.go      ← AuthMiddleware, ScopeFilter
│   ├── database/postgres.go    ← pgxpool setup, BeforeAcquire sets session vars
│   ├── targets/handler.go      ← targets module (GET/POST /api/v1/targets)
│   └── <module>/handler.go     ← pattern for every module
├── run-dev.bat                 ← starts Go API with correct env vars
└── htg-crm-frontend/
    ├── components/dashboard/
    │   ├── ExecutiveDashboard.tsx   ← CEO dashboard shell
    │   ├── CompanyKPIBar.tsx        ← top metric cards
    │   ├── SetTargetsModal.tsx      ← target-setting modal
    │   └── mock-data.ts             ← fallback chart data
    └── app/
        └── (dashboard)/ceo/        ← CEO dashboard page
```

---

## Roles & Build Order

**Build order:** CEO → Country GM → AM → HoB → Admin

| Role  | Scope          | Primary dashboard focus              |
|-------|----------------|--------------------------------------|
| CEO   | Entire org     | KPIs, forecasts, executive insights  |
| GM    | One country    | Country revenue, team, pipeline      |
| AM    | Own customers  | Personal targets, pipeline, tasks    |
| HoB   | Entire org     | Commercial leadership, all countries |
| Admin | Platform only  | Users, config, security, integrations|

---

## Countries & Markets

Somalia, Kenya, Ethiopia, Djibouti

---

## Key Patterns

### Adding a new backend module

1. Create `internal/<module>/handler.go` with `package <module>`
2. Add `RegisterRoutes(r *gin.RouterGroup, db *pgxpool.Pool)` function
3. In `cmd/server/main.go`, import and call `<module>.RegisterRoutes(api, postgresPool)`
4. All routes go under `/api/v1/<module>`

### Adding a DB migration

```cmd
docker cp migration_file.sql htg-crm-postgres-1:/tmp/migration_file.sql
docker exec htg-crm-postgres-1 psql -U htg -d htgcrm -f /tmp/migration_file.sql
```

### Frontend API fetch (with auth)

Always use `useSession` from `next-auth/react` and pass the token:

```tsx
const { data: session } = useSession()
// ...
const token = (session as any)?.accessToken ?? ""
const res = await fetch(`${API}/api/v1/<endpoint>`, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  credentials: "include",
})
```

**Never use `credentials: "include"` alone** — the Go API requires `Authorization: Bearer <token>`.

### Environment variable for API URL

```tsx
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081"
```

### Git workflow

```cmd
git add -A
git commit -m "feat|fix|chore: short description"
git push
```

---

## Known Issues & Fixes

| Issue | Fix |
|-------|-----|
| Local PostgreSQL 18 conflicts with Docker on port 5432 | `net stop "postgresql-x64-18"` — service is disabled, should not restart |
| pg_hba.conf uses `trust` auth | Docker container already patched — do not revert |
| Redis is on port 6380, RabbitMQ on 5835 | run-dev.bat sets correct ports — do not use .env.local ports |
| `.env.local` contains Keycloak secrets | Never commit — already in .gitignore |
| `test_pg.go` is a temp diagnostic file | Already in .gitignore |
| Frontend fetch returning $0 for targets | Must pass `Authorization: Bearer <token>` header — `credentials: "include"` alone is not enough |

---

## Database

- Connection: `postgres://htg:htgdev@127.0.0.1:5432/htgcrm?sslmode=disable`
- Use `127.0.0.1` not `localhost` (forces IPv4)
- RLS session vars set via `BeforeAcquire`: `app.user_role`, `app.user_id`, `app.country_id`

### Key tables

| Table     | Contents                                      |
|-----------|-----------------------------------------------|
| tenants   | 20 placeholder tenants (5 SO, 6 KE, 5 ET, 4 DJ) |
| targets   | Q3 2026 country targets (SO $1.5M, KE $2.4M, ET $2M, DJ $1M) |
| users     | Keycloak-synced users                         |

---

## Dev Server Startup Order

1. `docker compose up -d` (from htg-crm root)
2. `run-dev.bat` (Go API — wait for `:8081`)
3. `cd htg-crm-frontend && npm run dev` (wait for `:3000`)
4. Health check: `curl http://localhost:8081/api/v1/health`

---

## Short Prompt Patterns

Use these when given a task verbally — you have full context above, so prompts can be brief:

- **New module:** "Add [name] module: table [schema], GET /api/v1/[name], POST /api/v1/[name], register in main.go, run migration"
- **Frontend fix:** "Fix [component]: [symptom] → [expected result]"
- **Seed data:** "Seed [table] with [rows] — run via docker exec"  
- **Wire card to API:** "Wire [card name] on CEO dashboard to GET /api/v1/[endpoint] using useSession auth pattern"
- **Debug:** "Debug [symptom] in [file] — log the actual error, don't swallow it"
- **Commit:** "Commit and push: [short message]"
