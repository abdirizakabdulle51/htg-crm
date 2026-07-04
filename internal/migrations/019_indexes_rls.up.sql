CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_country_office_id ON users(country_office_id);
CREATE INDEX idx_users_keycloak_id ON users(keycloak_id);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_tenants_account_manager_id ON tenants(account_manager_id);
CREATE INDEX idx_tenants_sector_id ON tenants(sector_id);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_risk_score_desc ON tenants(risk_score DESC);
CREATE INDEX idx_tenants_renewal_date ON tenants(renewal_date);

CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_sector_id ON leads(sector_id);
CREATE INDEX idx_leads_expected_close_date ON leads(expected_close_date);
CREATE INDEX idx_leads_status ON leads(status);

CREATE INDEX idx_activities_lead_id ON activities(lead_id);
CREATE INDEX idx_activities_tenant_id ON activities(tenant_id);
CREATE INDEX idx_activities_next_action_date ON activities(next_action_date);
CREATE INDEX idx_activities_type ON activities(type);

CREATE INDEX idx_ai_recommendations_tenant_id ON ai_recommendations(tenant_id);
CREATE INDEX idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX idx_ai_recommendations_type ON ai_recommendations(type);
CREATE INDEX idx_ai_recommendations_created_at_desc ON ai_recommendations(created_at DESC);

CREATE INDEX idx_sync_results_tenant_id ON sync_results(tenant_id);
CREATE INDEX idx_sync_results_sync_run_id ON sync_results(sync_run_id);
CREATE INDEX idx_sync_results_status ON sync_results(status);
CREATE INDEX idx_sync_results_started_at_desc ON sync_results(started_at DESC);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at_desc ON audit_logs(created_at DESC);

CREATE INDEX idx_tenant_embeddings_embedding
ON tenant_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
SELECT current_setting('app.user_role', TRUE);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
SELECT NULLIF(current_setting('app.user_id', TRUE), '')::UUID;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_country_id() RETURNS UUID AS $$
SELECT NULLIF(current_setting('app.country_id', TRUE), '')::UUID;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY tenants_am_policy ON tenants
USING (
  current_user_role() IN ('HEAD_OF_BUSINESS', 'CEO', 'ADMIN')
  OR (current_user_role() = 'COUNTRY_GM' AND country_id = current_country_id())
  OR (current_user_role() = 'ACCOUNT_MANAGER' AND account_manager_id = current_user_id())
);

CREATE POLICY leads_am_policy ON leads
USING (
  current_user_role() IN ('HEAD_OF_BUSINESS', 'CEO', 'ADMIN')
  OR (current_user_role() = 'COUNTRY_GM' AND country_id = current_country_id())
  OR (current_user_role() = 'ACCOUNT_MANAGER' AND owner_id = current_user_id())
);
