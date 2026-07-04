package tenants

import (
	"context"
	"math"
	"time"

	"github.com/google/uuid"
)

func ComputeAndSaveRiskScore(ctx context.Context, repo TenantRepository, chRepo ClickHouseRepo, tenantID uuid.UUID) (int, error) {
	now := time.Now().UTC()
	inputs, err := repo.RiskInputs(ctx, tenantID, now)
	if err != nil {
		return 0, err
	}
	if chRepo != nil {
		previous, latest, err := chRepo.MonthlyBillingLastTwo(ctx, tenantID)
		if err != nil {
			return 0, err
		}
		inputs.PreviousBillingUSD = previous
		inputs.LatestBillingUSD = latest
	}

	score := 0
	score += min(inputs.OverdueContracts*20, 40)
	if inputs.PreviousBillingUSD > 0 && ((inputs.PreviousBillingUSD-inputs.LatestBillingUSD)/inputs.PreviousBillingUSD) > 0.20 {
		score += 25
	}
	if inputs.ComplaintNoteCount > 5 {
		score += 15
	}
	if inputs.ActiveContractExpSoon && !inputs.ActivityLast14Days {
		score += 30
	}
	if !inputs.ActivityLast60Days {
		score += 10
	}

	score = min(score, 100)
	previous, err := repo.UpdateRiskScore(ctx, tenantID, score)
	if err != nil {
		return 0, err
	}

	if publisher, ok := repo.(interface {
		PublishRiskAlert(context.Context, uuid.UUID, int) error
	}); ok && previous < 70 && score >= 70 {
		_ = publisher.PublishRiskAlert(ctx, tenantID, score)
	}

	return score, nil
}

func riskBand(score int) string {
	switch {
	case score >= 70:
		return "high"
	case score >= 40:
		return "medium"
	default:
		return "low"
	}
}

func min(a, b int) int {
	return int(math.Min(float64(a), float64(b)))
}
