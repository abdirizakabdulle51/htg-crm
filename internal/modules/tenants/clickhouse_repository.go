package tenants

import (
	"context"
	"math"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
)

type ClickHouseRepository struct {
	conn clickhouse.Conn
}

func NewClickHouseRepository(conn clickhouse.Conn) *ClickHouseRepository {
	return &ClickHouseRepository{conn: conn}
}

func (r *ClickHouseRepository) DailyUsage(ctx context.Context, tenantID uuid.UUID, days int) ([]UsageSummary, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT date, service_type, metric_name, total_value, total_billing_usd, record_count
		FROM tenant_analytics.daily_usage_summary
		WHERE tenant_id = ? AND date >= today() - ?
		ORDER BY date DESC, service_type, metric_name`, tenantID, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []UsageSummary{}
	for rows.Next() {
		item := UsageSummary{}
		if err := rows.Scan(&item.Date, &item.ServiceType, &item.MetricName, &item.TotalValue, &item.TotalBillingUSD, &item.RecordCount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *ClickHouseRepository) MonthlyGrowth(ctx context.Context, tenantID uuid.UUID) ([]GrowthPoint, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT month, total_billing_usd, service_count
		FROM tenant_analytics.monthly_billing_summary
		WHERE tenant_id = ?
		ORDER BY month ASC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []GrowthPoint{}
	var previous float64
	for rows.Next() {
		item := GrowthPoint{}
		if err := rows.Scan(&item.Month, &item.TotalBillingUSD, &item.ServiceCount); err != nil {
			return nil, err
		}
		if previous > 0 {
			item.MoMPercent = math.Round(((item.TotalBillingUSD-previous)/previous)*1000) / 10
		}
		previous = item.TotalBillingUSD
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *ClickHouseRepository) MonthlyBillingLastTwo(ctx context.Context, tenantID uuid.UUID) (previous, latest float64, err error) {
	rows, err := r.conn.Query(ctx, `
		SELECT month, total_billing_usd
		FROM tenant_analytics.monthly_billing_summary
		WHERE tenant_id = ?
		ORDER BY month DESC
		LIMIT 2`, tenantID)
	if err != nil {
		return 0, 0, err
	}
	defer rows.Close()

	values := []float64{}
	for rows.Next() {
		var month time.Time
		var value float64
		if err := rows.Scan(&month, &value); err != nil {
			return 0, 0, err
		}
		values = append(values, value)
	}
	if err := rows.Err(); err != nil {
		return 0, 0, err
	}
	if len(values) > 0 {
		latest = values[0]
	}
	if len(values) > 1 {
		previous = values[1]
	}
	return previous, latest, nil
}

var _ ClickHouseRepo = (*ClickHouseRepository)(nil)
