BEGIN;
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'COACHING';
COMMIT;

BEGIN;
ALTER TABLE activities
  DROP CONSTRAINT IF EXISTS activities_check,
  ADD CONSTRAINT activities_target_or_coaching_check
  CHECK (lead_id IS NOT NULL OR tenant_id IS NOT NULL OR type = 'COACHING');
COMMIT;
