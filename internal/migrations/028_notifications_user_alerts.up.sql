ALTER TABLE ai_recommendations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ai_recommendations
  DROP CONSTRAINT IF EXISTS ai_recommendations_check,
  ADD CONSTRAINT ai_recommendations_target_check CHECK (tenant_id IS NOT NULL OR lead_id IS NOT NULL OR user_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
