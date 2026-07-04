CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  country_id UUID NOT NULL REFERENCES country_offices(id),
  region_id UUID REFERENCES regions(id),
  sector_id UUID NOT NULL REFERENCES sectors(id),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  stage lead_stage NOT NULL DEFAULT 'NEW',
  status lead_status NOT NULL DEFAULT 'OPEN',
  value_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  probability NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 1),
  expected_close_date DATE,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
