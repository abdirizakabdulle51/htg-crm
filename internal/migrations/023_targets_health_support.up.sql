ALTER TABLE quarterly_targets ADD COLUMN IF NOT EXISTS is_manually_set BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS potential_value_usd NUMERIC(14,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_date DATE;

UPDATE leads SET potential_value_usd = value_usd WHERE potential_value_usd IS NULL;

CREATE INDEX IF NOT EXISTS idx_quarterly_targets_manual ON quarterly_targets(is_manually_set);
CREATE INDEX IF NOT EXISTS idx_leads_won_owner_date ON leads(owner_id, won_date) WHERE stage = 'WON';
