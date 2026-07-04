ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'OVERDUE';

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE INDEX IF NOT EXISTS idx_contracts_tenant_end_date ON contracts(tenant_id, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_status ON contracts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_services_tenant_id ON tenant_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_name_trgm ON tenants USING gin (name gin_trgm_ops);
