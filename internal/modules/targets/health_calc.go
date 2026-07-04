package targets

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

func CalculateDailyHealth(ctx context.Context, repo TargetRepository, userID uuid.UUID, now time.Time) (TargetHealth, error) {
	year := now.Year()
	quarter := int((now.Month()-1)/3) + 1

	if cached, err := repo.GetCachedHealth(ctx, userID, year, quarter); err == nil && cached != nil {
		return *cached, nil
	}

	quarterlyTarget, err := repo.GetQuarterlyTarget(ctx, userID, year, quarter)
	if err != nil {
		return TargetHealth{}, err
	}

	quarterStart, quarterEnd := quarterRange(year, quarter)
	elapsedEnd := now
	if elapsedEnd.After(quarterEnd) {
		elapsedEnd = quarterEnd
	}
	if elapsedEnd.Before(quarterStart) {
		elapsedEnd = quarterStart
	}

	workingDaysTotal, err := repo.WorkingDays(ctx, userID, quarterStart, quarterEnd)
	if err != nil {
		return TargetHealth{}, err
	}
	workingDaysElapsed, err := repo.WorkingDays(ctx, userID, quarterStart, elapsedEnd)
	if err != nil {
		return TargetHealth{}, err
	}

	achieved, err := repo.SumWonDeals(ctx, userID, quarterStart, quarterEnd)
	if err != nil {
		return TargetHealth{}, err
	}

	health := TargetHealth{
		UserID:             userID,
		Year:               year,
		Quarter:            quarter,
		QuarterlyTargetUSD: roundMoney(quarterlyTarget.TargetUSD),
		AchievedUSD:        roundMoney(achieved),
		WorkingDaysTotal:   workingDaysTotal,
		WorkingDaysElapsed: workingDaysElapsed,
	}

	if workingDaysTotal == 0 {
		health.Health = "YELLOW"
		health.AIAdvice = fmt.Sprintf("Slightly behind pace by $0. Close your top 3 proposals to get back on track.")
		_ = repo.CacheHealth(ctx, health)
		return health, nil
	}

	expected := quarterlyTarget.TargetUSD * (float64(workingDaysElapsed) / float64(workingDaysTotal))
	gap := achieved - expected
	gapPercent := 0.0
	if expected != 0 {
		gapPercent = (gap / expected) * 100
	}

	remainingDays := workingDaysTotal - workingDaysElapsed
	if remainingDays < 1 {
		remainingDays = 1
	}
	requiredDailyPace := (quarterlyTarget.TargetUSD - achieved) / float64(remainingDays)
	if achieved >= quarterlyTarget.TargetUSD {
		requiredDailyPace = 0
		health.Health = "GREEN"
	} else {
		switch {
		case gapPercent >= 5.0:
			health.Health = "GREEN"
		case gapPercent >= -10.0:
			health.Health = "YELLOW"
		default:
			health.Health = "RED"
		}
	}

	health.ExpectedCumulativeUSD = roundMoney(expected)
	health.GapUSD = roundMoney(gap)
	health.GapPercent = math.Round(gapPercent*10) / 10
	health.WorkingDaysRemaining = remainingDays
	health.RequiredDailyPaceUSD = roundMoney(requiredDailyPace)
	health.AIAdvice = advice(health)

	_ = repo.CacheHealth(ctx, health)
	return health, nil
}

func quarterRange(year, quarter int) (time.Time, time.Time) {
	startMonth := time.Month((quarter-1)*3 + 1)
	start := time.Date(year, startMonth, 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 3, -1)
	return start, end
}

func advice(health TargetHealth) string {
	absGap := math.Abs(health.GapUSD)
	switch health.Health {
	case "RED":
		return fmt.Sprintf(
			"Behind by $%s (%.1f%%). You need $%s/day for %d days to recover Q%d target.",
			formatMoney(absGap),
			health.GapPercent,
			formatMoney(health.RequiredDailyPaceUSD),
			health.WorkingDaysRemaining,
			health.Quarter,
		)
	case "YELLOW":
		return fmt.Sprintf("Slightly behind pace by $%s. Close your top 3 proposals to get back on track.", formatMoney(absGap))
	default:
		return fmt.Sprintf("$%s ahead of pace. Maintain momentum - your Q%d target is achievable.", formatMoney(math.Abs(health.GapUSD)), health.Quarter)
	}
}

func formatMoney(value float64) string {
	rounded := int64(math.Round(value))
	raw := strconv.FormatInt(rounded, 10)
	if len(raw) <= 3 {
		return raw
	}
	var builder strings.Builder
	prefix := len(raw) % 3
	if prefix == 0 {
		prefix = 3
	}
	builder.WriteString(raw[:prefix])
	for i := prefix; i < len(raw); i += 3 {
		builder.WriteString(",")
		builder.WriteString(raw[i : i+3])
	}
	return builder.String()
}

func roundMoney(value float64) float64 {
	return math.Round(value*100) / 100
}
