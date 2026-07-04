CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL UNIQUE,
  status contract_status NOT NULL DEFAULT 'DRAFT',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  value_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_contracts_updated_at
BEFORE UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
