DROP INDEX IF EXISTS idx_contacts_lead_id;
DROP INDEX IF EXISTS idx_activities_lead_created_at;
DROP INDEX IF EXISTS idx_leads_stage_number;

ALTER TABLE leads
  DROP COLUMN IF EXISTS won_date,
  DROP COLUMN IF EXISTS competitor,
  DROP COLUMN IF EXISTS lost_reason,
  DROP COLUMN IF EXISTS stage_number;
