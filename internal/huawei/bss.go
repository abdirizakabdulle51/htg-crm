package huawei

import (
	"context"
	"encoding/json"
	"time"
)

type BSSBillingRecord struct {
	ServiceType string
	AmountUSD   float64
	Currency    string
}

func (c *Client) QueryBSSBills(ctx context.Context, accountID string, billDate time.Time) ([]BSSBillingRecord, error) {
	body, err := json.Marshal(map[string]any{
		"account_id":         accountID,
		"bill_date":          billDate.Format("2006-01-02"),
		"cloud_service_type": "",
	})
	if err != nil {
		return nil, err
	}
	// TODO: confirm with HCS administrator (Chen)
	resp, err := c.Do(ctx, "POST", "/hcs/bss/bills/query", body)
	if resp != nil {
		_ = resp.Body.Close()
	}
	return nil, err
}
