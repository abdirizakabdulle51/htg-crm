CREATE TABLE tenant_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_code TEXT,
  status service_status NOT NULL DEFAULT 'ACTIVE',
  monthly_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  started_at DATE,
  ended_at DATE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenant_services_updated_at
BEFORE UPDATE ON tenant_services
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
