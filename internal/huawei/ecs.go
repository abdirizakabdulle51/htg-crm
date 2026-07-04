package huawei

import "context"

type ECSMetrics struct {
	InstanceCount int
	VCPUTotal     float64
	RAMGBTotal    float64
}

func (c *Client) ListECSInstances(ctx context.Context, accountID, region string) (ECSMetrics, error) {
	// TODO: confirm with HCS administrator (Chen)
	resp, err := c.Do(ctx, "GET", "/hcs/ecs/servers?account_id="+accountID+"&region="+region, nil)
	if resp != nil {
		_ = resp.Body.Close()
	}
	return ECSMetrics{}, err
}
