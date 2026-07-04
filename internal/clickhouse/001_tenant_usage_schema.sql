CREATE DATABASE IF NOT EXISTS tenant_analytics;

CREATE TABLE IF NOT EXISTS tenant_analytics.tenant_usage (
  tenant_id UUID,
  service_type LowCardinality(String),
  metric_name LowCardinality(String),
  value Float64,
  unit LowCardinality(String),
  billing_amount_usd Float64,
  currency LowCardinality(String) DEFAULT 'USD',
  huawei_resource_id String DEFAULT '',
  recorded_at DateTime,
  date Date MATERIALIZED toDate(recorded_at),
  year_month UInt32 MATERIALIZED toYYYYMM(recorded_at)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, service_type, recorded_at)
TTL date + INTERVAL 3 YEAR
SETTINGS index_granularity = 8192;

-- metric_name values per service_type:
-- VM: instance_count, vcpu_total, ram_gb_total
-- OBJECT_STORAGE: storage_tb, requests_millions, egress_gb
-- BLOCK_STORAGE: provisioned_tb
-- BACKUP: backup_gb, job_count, success_rate
-- DATABASE: instance_count, storage_gb, iops_avg
-- KUBERNETES: node_count, pod_count
-- DISASTER_RECOVERY: protected_vms, rto_minutes, rpo_minutes

CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_analytics.daily_usage_summary
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, service_type, metric_name, date)
AS SELECT
  tenant_id,
  service_type,
  metric_name,
  date,
  sum(value) AS total_value,
  sum(billing_amount_usd) AS total_billing_usd,
  count() AS record_count
FROM tenant_analytics.tenant_usage
GROUP BY tenant_id, service_type, metric_name, date;

CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_analytics.monthly_billing_summary
ENGINE = SummingMergeTree()
PARTITION BY toYear(month)
ORDER BY (tenant_id, month)
AS SELECT
  tenant_id,
  toStartOfMonth(date) AS month,
  sum(billing_amount_usd) AS total_billing_usd,
  count(DISTINCT service_type) AS service_count
FROM tenant_analytics.tenant_usage
GROUP BY tenant_id, month;
