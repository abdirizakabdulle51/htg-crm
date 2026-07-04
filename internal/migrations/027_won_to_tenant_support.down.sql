DROP INDEX IF EXISTS idx_tenants_lead_id_unique;

ALTER TABLE tenants
  DROP COLUMN IF EXISTS huawei_region,
  DROP COLUMN IF EXISTS hcs_account_id,
  DROP COLUMN IF EXISTS created_by;
