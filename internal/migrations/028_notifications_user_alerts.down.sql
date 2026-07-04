DROP INDEX IF EXISTS idx_ai_recommendations_user_id;

ALTER TABLE ai_recommendations
  DROP CONSTRAINT IF EXISTS ai_recommendations_target_check,
  ADD CONSTRAINT ai_recommendations_check CHECK (tenant_id IS NOT NULL OR lead_id IS NOT NULL);

ALTER TABLE ai_recommendations
  DROP COLUMN IF EXISTS user_id;
