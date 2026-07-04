DROP INDEX IF EXISTS idx_ai_recommendations_cross_sell_dedupe;

ALTER TABLE ai_recommendations
  DROP COLUMN IF EXISTS dismissed_until,
  DROP COLUMN IF EXISTS estimated_monthly_value_usd,
  DROP COLUMN IF EXISTS recommended_service;
