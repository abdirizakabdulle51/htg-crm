CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type ai_recommendation_type NOT NULL,
  status ai_recommendation_status NOT NULL DEFAULT 'NEW',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (tenant_id IS NOT NULL OR lead_id IS NOT NULL)
);

CREATE TRIGGER trg_ai_recommendations_updated_at
BEFORE UPDATE ON ai_recommendations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
