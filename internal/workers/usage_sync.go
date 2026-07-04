package workers

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"golang.org/x/sync/errgroup"

	"github.com/htgclouds/crm-api/internal/huawei"
	"github.com/htgclouds/crm-api/internal/modules/notifications"
	"github.com/htgclouds/crm-api/internal/queue"
)

const (
	usageSyncSource      = "USAGE"
	usageSyncConcurrency = 10
	usageInsertBatchSize = 1000
	nightlySyncQueue     = "htgcrm.ai.nightly_sync_complete"
)

type UsageSyncWorker struct {
	postgres      *pgxpool.Pool
	clickhouse    clickhouse.Conn
	hcsClient     *huawei.Client
	publisher     *queue.Publisher
	notifications interface {
		SendEmail(email, subject, htmlBody string) error
	}
	adminEmail string
	logger     zerolog.Logger
}

type UsageSyncConfig struct {
	AdminEmail string
}

type usageTenant struct {
	ID           uuid.UUID
	Name         string
	HCSAccountID string
	Region       string
	CountryID    uuid.UUID
}

type UsageRecord struct {
	TenantID         uuid.UUID
	ServiceType      string
	MetricName       string
	Value            float64
	Unit             string
	BillingAmountUSD float64
	Currency         string
	HCSResourceID    string
	RecordedAt       time.Time
}

func NewUsageSyncWorker(postgres *pgxpool.Pool, clickhouseConn clickhouse.Conn, hcsClient *huawei.Client, publisher *queue.Publisher, notificationService *notifications.Service, logger zerolog.Logger, cfg UsageSyncConfig) *UsageSyncWorker {
	return &UsageSyncWorker{
		postgres:      postgres,
		clickhouse:    clickhouseConn,
		hcsClient:     hcsClient,
		publisher:     publisher,
		notifications: notificationService,
		adminEmail:    cfg.AdminEmail,
		logger:        logger,
	}
}

func StartUsageSync(ctx context.Context, logger zerolog.Logger, workers ...*UsageSyncWorker) {
	if len(workers) == 0 || workers[0] == nil {
		// TODO: confirm with HCS administrator (Chen)
		go runEvery(ctx, logger, "usage_sync", 24*time.Hour)
		return
	}
	go runUsageSyncDaily(ctx, logger, workers[0])
}

func RunUsageSync(ctx context.Context, worker *UsageSyncWorker) error {
	return worker.Run(ctx)
}

func (w *UsageSyncWorker) Run(ctx context.Context) error {
	syncRunID := uuid.New()
	startedAt := time.Now().UTC()
	w.logger.Info().Str("sync_run_id", syncRunID.String()).Time("started_at", startedAt).Msg("Starting usage sync run")

	tenants, err := w.fetchUsageTenants(ctx)
	if err != nil {
		return err
	}
	if len(tenants) == 0 {
		w.logger.Info().Str("sync_run_id", syncRunID.String()).Msg("No tenants with HCS accounts")
		return nil
	}

	var mu sync.Mutex
	successes := 0
	failures := 0
	group, groupCtx := errgroup.WithContext(ctx)
	group.SetLimit(usageSyncConcurrency)

	for _, tenant := range tenants {
		tenant := tenant
		group.Go(func() error {
			if err := w.processTenant(groupCtx, syncRunID, tenant); err != nil {
				mu.Lock()
				failures++
				mu.Unlock()
				w.logger.Error().Err(err).Str("sync_run_id", syncRunID.String()).Str("tenant_id", tenant.ID.String()).Msg("tenant_usage_sync_failed")
				return nil
			}
			mu.Lock()
			successes++
			mu.Unlock()
			return nil
		})
	}
	if err := group.Wait(); err != nil {
		return err
	}

	total, persistedFailures, err := w.syncTotals(ctx, syncRunID)
	if err != nil {
		total = successes + failures
		persistedFailures = failures
	}
	if total > 0 && float64(persistedFailures) > float64(total)*0.1 {
		message := fmt.Sprintf("Sync run %s had %d/%d failures", syncRunID.String(), persistedFailures, total)
		w.logger.Error().Str("sync_run_id", syncRunID.String()).Int("failures", persistedFailures).Int("total", total).Msg(message)
		w.sendAdminAlert(message)
	}

	if w.publisher != nil {
		if err := w.publisher.PublishQueueJSON(ctx, nightlySyncQueue, map[string]any{"sync_run_id": syncRunID}); err != nil {
			return err
		}
	}

	w.logger.Info().Str("sync_run_id", syncRunID.String()).Int("successes", successes).Int("failures", failures).Msg("usage_sync_complete")
	return nil
}

func (w *UsageSyncWorker) processTenant(ctx context.Context, syncRunID uuid.UUID, tenant usageTenant) error {
	resultID := uuid.New()
	if _, err := w.postgres.Exec(ctx, `
		INSERT INTO sync_results (id, sync_run_id, tenant_id, source, status, started_at)
		VALUES ($1, $2, $3, $4, 'RUNNING'::sync_status, NOW())`,
		resultID, syncRunID, tenant.ID, usageSyncSource); err != nil {
		return err
	}

	records, err := retry(ctx, 3, func() ([]UsageRecord, error) {
		return w.collectTenantUsage(ctx, tenant)
	})
	if err != nil {
		_ = w.markSyncFailed(ctx, resultID, err)
		return err
	}

	if err := w.insertUsageRecords(ctx, records); err != nil {
		_ = w.markSyncFailed(ctx, resultID, err)
		return err
	}

	_, err = w.postgres.Exec(ctx, `
		UPDATE sync_results
		SET status = 'SUCCESS'::sync_status, records_processed = $1, finished_at = NOW()
		WHERE id = $2`,
		len(records), resultID)
	return err
}

func (w *UsageSyncWorker) fetchUsageTenants(ctx context.Context) ([]usageTenant, error) {
	rows, err := w.postgres.Query(ctx, `
		SELECT id, name, hcs_account_id, huawei_region, country_id
		FROM tenants
		WHERE status IN ('ACTIVE'::tenant_status, 'AT_RISK'::tenant_status)
			AND hcs_account_id IS NOT NULL AND hcs_account_id != ''`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tenants := []usageTenant{}
	for rows.Next() {
		tenant := usageTenant{}
		if err := rows.Scan(&tenant.ID, &tenant.Name, &tenant.HCSAccountID, &tenant.Region, &tenant.CountryID); err != nil {
			return nil, err
		}
		tenants = append(tenants, tenant)
	}
	return tenants, rows.Err()
}

func (w *UsageSyncWorker) collectTenantUsage(ctx context.Context, tenant usageTenant) ([]UsageRecord, error) {
	if w.hcsClient == nil {
		return nil, errors.New("HCS client is not configured")
	}
	recordedAt := time.Now().UTC()
	ecsMetrics, err := w.hcsClient.ListECSInstances(ctx, tenant.HCSAccountID, tenant.Region)
	if err != nil {
		return nil, err
	}
	obsMetrics, err := w.hcsClient.ListOBSBuckets(ctx, tenant.HCSAccountID, tenant.Region)
	if err != nil {
		return nil, err
	}
	rdsMetrics, err := w.hcsClient.ListRDSInstances(ctx, tenant.HCSAccountID, tenant.Region)
	if err != nil {
		return nil, err
	}
	billing, err := w.hcsClient.QueryBSSBills(ctx, tenant.HCSAccountID, recordedAt.AddDate(0, 0, -1))
	if err != nil {
		return nil, err
	}

	records := []UsageRecord{
		newUsageRecord(tenant.ID, "VM", "instance_count", float64(ecsMetrics.InstanceCount), "count", recordedAt),
		newUsageRecord(tenant.ID, "VM", "vcpu_total", ecsMetrics.VCPUTotal, "vcpu", recordedAt),
		newUsageRecord(tenant.ID, "VM", "ram_gb_total", ecsMetrics.RAMGBTotal, "GB", recordedAt),
		newUsageRecord(tenant.ID, "OBJECT_STORAGE", "storage_tb", obsMetrics.StorageTB, "TB", recordedAt),
		newUsageRecord(tenant.ID, "OBJECT_STORAGE", "egress_gb", obsMetrics.EgressGB, "GB", recordedAt),
		newUsageRecord(tenant.ID, "DATABASE", "instance_count", float64(rdsMetrics.InstanceCount), "count", recordedAt),
		newUsageRecord(tenant.ID, "DATABASE", "storage_gb", rdsMetrics.StorageGB, "GB", recordedAt),
	}
	for _, bill := range billing {
		currency := bill.Currency
		if currency == "" {
			currency = "USD"
		}
		record := newUsageRecord(tenant.ID, bill.ServiceType, "billing_amount", bill.AmountUSD, currency, recordedAt)
		record.BillingAmountUSD = bill.AmountUSD
		record.Currency = currency
		records = append(records, record)
	}
	return records, nil
}

func (w *UsageSyncWorker) insertUsageRecords(ctx context.Context, records []UsageRecord) error {
	for start := 0; start < len(records); start += usageInsertBatchSize {
		end := start + usageInsertBatchSize
		if end > len(records) {
			end = len(records)
		}
		batch, err := w.clickhouse.PrepareBatch(ctx, `
			INSERT INTO tenant_analytics.tenant_usage
			(tenant_id, service_type, metric_name, value, unit, billing_amount_usd, currency, huawei_resource_id, recorded_at)`)
		if err != nil {
			return err
		}
		for _, record := range records[start:end] {
			if err := batch.Append(record.TenantID, record.ServiceType, record.MetricName, record.Value, record.Unit, record.BillingAmountUSD, record.Currency, record.HCSResourceID, record.RecordedAt); err != nil {
				return err
			}
		}
		if err := batch.Send(); err != nil {
			return err
		}
	}
	return nil
}

func (w *UsageSyncWorker) markSyncFailed(ctx context.Context, resultID uuid.UUID, syncErr error) error {
	_, err := w.postgres.Exec(ctx, `
		UPDATE sync_results
		SET status = 'FAILED'::sync_status, error_message = $1, finished_at = NOW()
		WHERE id = $2`,
		syncErr.Error(), resultID)
	return err
}

func (w *UsageSyncWorker) syncTotals(ctx context.Context, syncRunID uuid.UUID) (total, failures int, err error) {
	err = w.postgres.QueryRow(ctx, `
		SELECT count(*), count(*) FILTER (WHERE status = 'FAILED'::sync_status)
		FROM sync_results WHERE sync_run_id = $1`, syncRunID).Scan(&total, &failures)
	return total, failures, err
}

func (w *UsageSyncWorker) sendAdminAlert(message string) {
	if w.notifications == nil || w.adminEmail == "" {
		return
	}
	if err := w.notifications.SendEmail(w.adminEmail, "Usage sync failures", message); err != nil {
		w.logger.Error().Err(err).Msg("usage_sync_admin_alert_failed")
	}
}

func retry[T any](ctx context.Context, attempts int, fn func() (T, error)) (T, error) {
	var zero T
	var lastErr error
	for i := 0; i < attempts; i++ {
		value, err := fn()
		if err == nil {
			return value, nil
		}
		lastErr = err
		delay := time.Duration(1<<uint(i+1)) * time.Second
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return zero, ctx.Err()
		case <-timer.C:
		}
	}
	return zero, lastErr
}

func runUsageSyncDaily(ctx context.Context, logger zerolog.Logger, worker *UsageSyncWorker) {
	for {
		wait := time.Until(nextUTC1(time.Now().UTC()))
		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
			if err := worker.Run(ctx); err != nil {
				logger.Error().Err(err).Msg("usage_sync_run_failed")
			}
		}
	}
}

func nextUTC1(now time.Time) time.Time {
	next := time.Date(now.Year(), now.Month(), now.Day(), 1, 0, 0, 0, time.UTC)
	if !next.After(now) {
		next = next.Add(24 * time.Hour)
	}
	return next
}

func newUsageRecord(tenantID uuid.UUID, serviceType, metricName string, value float64, unit string, recordedAt time.Time) UsageRecord {
	return UsageRecord{
		TenantID:         tenantID,
		ServiceType:      serviceType,
		MetricName:       metricName,
		Value:            value,
		Unit:             unit,
		BillingAmountUSD: 0,
		Currency:         "USD",
		HCSResourceID:    "",
		RecordedAt:       recordedAt,
	}
}
