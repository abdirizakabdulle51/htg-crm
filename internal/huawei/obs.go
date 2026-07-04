package huawei

import "context"

type OBSMetrics struct {
	StorageTB float64
	EgressGB  float64
}

func (c *Client) ListOBSBuckets(ctx context.Context, accountID, region string) (OBSMetrics, error) {
	// TODO: confirm with HCS administrator (Chen)
	resp, err := c.Do(ctx, "GET", "/hcs/obs/buckets?account_id="+accountID+"&region="+region, nil)
	if resp != nil {
		_ = resp.Body.Close()
	}
	return OBSMetrics{}, err
}
