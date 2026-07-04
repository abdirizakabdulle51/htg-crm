CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  status activity_status NOT NULL DEFAULT 'OPEN',
  subject TEXT NOT NULL,
  body TEXT,
  occurred_at TIMESTAMPTZ,
  next_action_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (lead_id IS NOT NULL OR tenant_id IS NOT NULL)
);

CREATE TRIGGER trg_activities_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
