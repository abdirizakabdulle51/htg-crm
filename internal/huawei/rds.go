package huawei

import "context"

type RDSMetrics struct {
	InstanceCount int
	StorageGB     float64
}

func (c *Client) ListRDSInstances(ctx context.Context, accountID, region string) (RDSMetrics, error) {
	// TODO: confirm with HCS administrator (Chen)
	resp, err := c.Do(ctx, "GET", "/hcs/rds/instances?account_id="+accountID+"&region="+region, nil)
	if resp != nil {
		_ = resp.Body.Close()
	}
	return RDSMetrics{}, err
}
