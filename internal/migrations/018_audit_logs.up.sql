CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  ip_address INET,
  user_agent TEXT,
  before_state JSONB,
  after_state JSONB,
  payload_after TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
