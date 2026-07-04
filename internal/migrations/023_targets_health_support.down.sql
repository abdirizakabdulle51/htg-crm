DROP INDEX IF EXISTS idx_leads_won_owner_date;
DROP INDEX IF EXISTS idx_quarterly_targets_manual;

ALTER TABLE leads DROP COLUMN IF EXISTS won_date;
ALTER TABLE leads DROP COLUMN IF EXISTS potential_value_usd;

ALTER TABLE quarterly_targets DROP COLUMN IF EXISTS is_manually_set;
