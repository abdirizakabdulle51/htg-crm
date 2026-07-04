ALTER TABLE activities
  DROP CONSTRAINT IF EXISTS activities_target_or_coaching_check,
  ADD CONSTRAINT activities_check CHECK (lead_id IS NOT NULL OR tenant_id IS NOT NULL);
