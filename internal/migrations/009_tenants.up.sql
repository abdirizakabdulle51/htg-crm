CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES country_offices(id),
  region_id UUID REFERENCES regions(id),
  sector_id UUID NOT NULL REFERENCES sectors(id),
  account_manager_id UUID NOT NULL REFERENCES users(id),
  lead_id UUID REFERENCES leads(id),
  name TEXT NOT NULL,
  status tenant_status NOT NULL DEFAULT 'ACTIVE',
  arr_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  mrr_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  health_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  risk_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  renewal_date DATE,
  onboarded_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
