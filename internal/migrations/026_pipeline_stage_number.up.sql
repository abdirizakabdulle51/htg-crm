ALTER TYPE lead_stage ADD VALUE IF NOT EXISTS 'DORMANT';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'PROPOSAL';

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS stage_number INT NOT NULL DEFAULT 1 CHECK (stage_number BETWEEN 1 AND 11),
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS competitor TEXT,
  ADD COLUMN IF NOT EXISTS won_date DATE;

CREATE INDEX IF NOT EXISTS idx_leads_stage_number ON leads(stage_number);
CREATE INDEX IF NOT EXISTS idx_activities_lead_created_at ON activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);
