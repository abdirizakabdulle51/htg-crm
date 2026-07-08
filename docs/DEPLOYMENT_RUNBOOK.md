# HTG CRM ECS Deployment Runbook

This runbook documents the current HTG CRM deployment on the Ubuntu ECS server.

## Environment Overview

- Frontend: `http://102.203.134.59:3000`
- API: `http://102.203.134.59:8081`
- Keycloak: `http://102.203.134.59:8080`
- Server: Ubuntu ECS
- Docker services:
  - PostgreSQL
  - Redis
  - RabbitMQ
  - ClickHouse
  - Keycloak
- Go API: compiled binary managed by `systemd`
- Next.js frontend: production build managed by `systemd`

## Normal Deployment Process

### Local Machine

Use the local machine for development, testing, commits, and pushing to GitHub.

```bash
git status
git add -A
git commit -m "your commit message"
git push
```

### ECS Server

SSH into the ECS server, pull the latest code, rebuild the changed services, and restart them.

```bash
ssh root@102.203.134.59
cd /root/htg-crm
git pull origin main
```

If backend code changed, rebuild the Go API:

```bash
cd /root/htg-crm
go build -o crm-api ./cmd/server
sudo systemctl restart htg-crm-api
```

If frontend code changed, rebuild the Next.js frontend:

```bash
cd /root/htg-crm/htg-crm-frontend
rm -rf .next
npm install
npm run build
sudo systemctl restart htg-crm-frontend
```

If database migrations changed, run migrations before restarting the API:

```bash
cd /root/htg-crm
set -a
source .env.production
set +a
go run cmd/migrate/main.go up
sudo systemctl restart htg-crm-api
```

## Commands

Service names may differ in future environments. Confirm with `systemctl list-units | grep htg-crm` if needed.

```bash
sudo systemctl restart htg-crm-api
sudo systemctl restart htg-crm-frontend
sudo systemctl status htg-crm-api
sudo systemctl status htg-crm-frontend
journalctl -u htg-crm-api -f
journalctl -u htg-crm-frontend -f
```

Useful Docker checks:

```bash
docker ps
docker compose ps
docker logs htg-crm-keycloak-1 --tail=100
docker logs htg-crm-postgres-1 --tail=100
```

## Database Refresh Process

Use this only when the ECS demo database needs to match the local Windows demo database.

### 1. Export Local PostgreSQL Demo DB

Run from the local machine:

```bash
cd C:\Users\cabdi\Documents\htg-crm
docker exec htg-crm-postgres-1 pg_dump -U htg -d htgcrm --clean --if-exists --no-owner --no-privileges > htgcrm-local-demo.sql
```

### 2. Copy Dump To ECS

```bash
scp C:\Users\cabdi\Documents\htg-crm\htgcrm-local-demo.sql root@102.203.134.59:/root/htgcrm-local-demo.sql
```

If `scp` is unavailable, copy the file by another secure method and place it at:

```bash
/root/htgcrm-local-demo.sql
```

### 3. Stop CRM Services

```bash
sudo systemctl stop htg-crm-api
sudo systemctl stop htg-crm-frontend
```

### 4. Wipe ECS CRM Schema

This clears only the `htgcrm` database schema. It does not clear the separate Keycloak database.

```bash
docker exec htg-crm-postgres-1 psql -U htg -d htgcrm -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO htg; GRANT ALL ON SCHEMA public TO public;"
```

### 5. Restore Dump

```bash
docker exec -i htg-crm-postgres-1 psql -U htg -d htgcrm < /root/htgcrm-local-demo.sql
```

### 6. Restart API And Frontend

```bash
sudo systemctl start htg-crm-api
sudo systemctl start htg-crm-frontend
```

### 7. Verify Database Counts

```bash
docker exec htg-crm-postgres-1 psql -U htg -d htgcrm -c "SELECT COUNT(*) FROM tenants;"
docker exec htg-crm-postgres-1 psql -U htg -d htgcrm -c "SELECT COUNT(*) FROM leads;"
docker exec htg-crm-postgres-1 psql -U htg -d htgcrm -c "SELECT COUNT(*) FROM targets;"
docker exec htg-crm-postgres-1 psql -U htg -d htgcrm -c "SELECT COUNT(*) FROM ai_recommendations;"
```

## Verification Checklist

- CEO login works.
- HoB login works.
- GM login works.
- AM login works.
- Role redirects are correct.
- Dashboards show demo data.
- API health works:

```bash
curl http://102.203.134.59:8081/api/v1/health
```

- No browser console errors.
- CSV exports work.
- Frontend service is healthy.
- API service is healthy.

## Rollback Process

Use rollback when a deployment breaks the app and the previous commit was working.

```bash
cd /root/htg-crm
git log --oneline
git checkout <previous-working-commit>
```

If backend changed:

```bash
go build -o crm-api ./cmd/server
sudo systemctl restart htg-crm-api
```

If frontend changed:

```bash
cd /root/htg-crm/htg-crm-frontend
rm -rf .next
npm install
npm run build
sudo systemctl restart htg-crm-frontend
```

Verify:

```bash
sudo systemctl status htg-crm-api
sudo systemctl status htg-crm-frontend
curl http://102.203.134.59:8081/api/v1/health
```

Then test the browser routes:

- `http://102.203.134.59:3000/ceo`
- `http://102.203.134.59:3000/hob`
- `http://102.203.134.59:3000/gm`
- `http://102.203.134.59:3000/am`

## Future Improvements

- Automate deployment with GitHub Actions.
- Add a domain name.
- Add HTTPS.
- Add a reverse proxy with Nginx or Caddy.
- Add scheduled database backups.
- Add a documented restore drill for backups.
- Add service monitoring and alerting.
