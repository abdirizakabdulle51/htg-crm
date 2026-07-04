CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage opportunity_stage NOT NULL DEFAULT 'IDENTIFIED',
  value_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  probability NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 1),
  expected_close_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_opportunities_updated_at
BEFORE UPDATE ON opportunities
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
