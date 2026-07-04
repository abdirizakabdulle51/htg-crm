ALTER TABLE ai_recommendations
  ADD COLUMN IF NOT EXISTS recommended_service TEXT,
  ADD COLUMN IF NOT EXISTS estimated_monthly_value_usd NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS dismissed_until DATE;

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_cross_sell_dedupe
ON ai_recommendations(tenant_id, recommended_service, type, status);
