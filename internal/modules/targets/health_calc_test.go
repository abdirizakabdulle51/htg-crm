package targets

import (
	"context"
	"math"
	"testing"
	"time"

	"github.com/google/uuid"
)

type mockTargetRepo struct {
	target   float64
	achieved float64
	elapsed  int
	total    int
}

func (m mockTargetRepo) CreateAnnualTarget(context.Context, CreateTargetRequest, []float64) (*AnnualTarget, error) {
	return nil, nil
}

func (m mockTargetRepo) GetAnnualTarget(context.Context, uuid.UUID, int) (*AnnualTarget, error) {
	return nil, nil
}

func (m mockTargetRepo) GetQuarterlyTarget(context.Context, uuid.UUID, int, int) (*QuarterlyTarget, error) {
	return &QuarterlyTarget{TargetUSD: m.target}, nil
}

func (m mockTargetRepo) UpdateQuarterlyTarget(context.Context, uuid.UUID, float64) (*QuarterlyTarget, error) {
	return nil, nil
}

func (m mockTargetRepo) ListUserTargets(context.Context, uuid.UUID) ([]*AnnualTarget, error) {
	return nil, nil
}

func (m mockTargetRepo) ListTeamTargets(context.Context, string, uuid.UUID) ([]*TeamTarget, error) {
	return nil, nil
}

func (m mockTargetRepo) GetAchievementsByMonth(context.Context, uuid.UUID, int) ([]Achievement, error) {
	return nil, nil
}

func (m mockTargetRepo) SumWonDeals(context.Context, uuid.UUID, time.Time, time.Time) (float64, error) {
	return m.achieved, nil
}

func (m mockTargetRepo) WorkingDays(_ context.Context, _ uuid.UUID, start, end time.Time) (int, error) {
	if end.Sub(start) > 30*24*time.Hour {
		return m.total, nil
	}
	return m.elapsed, nil
}

func (m mockTargetRepo) GetCachedHealth(context.Context, uuid.UUID, int, int) (*TargetHealth, error) {
	return nil, nil
}

func (m mockTargetRepo) CacheHealth(context.Context, TargetHealth) error {
	return nil
}

func (m mockTargetRepo) InvalidateHealth(context.Context, uuid.UUID, int, int) error {
	return nil
}

func TestCalculateDailyHealth(t *testing.T) {
	userID := uuid.New()
	now := time.Date(2026, time.April, 15, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name           string
		target         float64
		achieved       float64
		elapsed        int
		total          int
		expectedHealth string
		expectedGap    float64
	}{
		{name: "zero_elapsed_start_of_q", target: 100000, achieved: 0, elapsed: 0, total: 65, expectedHealth: "YELLOW", expectedGap: 0},
		{name: "exactly_on_pace", target: 100000, achieved: 50000, elapsed: 50, total: 100, expectedHealth: "YELLOW", expectedGap: 0},
		{name: "5pct_ahead_is_green", target: 100000, achieved: 52500, elapsed: 50, total: 100, expectedHealth: "GREEN", expectedGap: 2500},
		{name: "4pct_ahead_still_yellow", target: 100000, achieved: 52000, elapsed: 50, total: 100, expectedHealth: "YELLOW", expectedGap: 2000},
		{name: "10pct_behind_is_yellow", target: 100000, achieved: 45000, elapsed: 50, total: 100, expectedHealth: "YELLOW", expectedGap: -5000},
		{name: "11pct_behind_is_red", target: 100000, achieved: 44500, elapsed: 50, total: 100, expectedHealth: "RED", expectedGap: -5500},
		{name: "target_already_hit", target: 100000, achieved: 100000, elapsed: 50, total: 100, expectedHealth: "GREEN", expectedGap: 50000},
		{name: "over_target", target: 100000, achieved: 120000, elapsed: 50, total: 100, expectedHealth: "GREEN", expectedGap: 70000},
		{name: "last_working_day", target: 100000, achieved: 95000, elapsed: 99, total: 100, expectedHealth: "YELLOW", expectedGap: -4000},
		{name: "total_zero_div_guard", target: 100000, achieved: 0, elapsed: 0, total: 0, expectedHealth: "YELLOW", expectedGap: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := mockTargetRepo{
				target:   tt.target,
				achieved: tt.achieved,
				elapsed:  tt.elapsed,
				total:    tt.total,
			}

			health, err := CalculateDailyHealth(context.Background(), repo, userID, now)
			if err != nil {
				t.Fatalf("CalculateDailyHealth() error = %v", err)
			}

			if health.Health != tt.expectedHealth {
				t.Fatalf("health = %s, want %s", health.Health, tt.expectedHealth)
			}
			if !closeEnough(health.GapUSD, tt.expectedGap) {
				t.Fatalf("gap = %.2f, want %.2f", health.GapUSD, tt.expectedGap)
			}

			if tt.total == 0 {
				if health.RequiredDailyPaceUSD != 0 {
					t.Fatalf("required_daily_pace = %.2f, want 0", health.RequiredDailyPaceUSD)
				}
				return
			}

			if tt.achieved >= tt.target {
				if health.RequiredDailyPaceUSD != 0 {
					t.Fatalf("required_daily_pace = %.2f, want 0", health.RequiredDailyPaceUSD)
				}
				return
			}

			if health.Health == "RED" || health.Health == "YELLOW" {
				remaining := tt.total - tt.elapsed
				if remaining < 1 {
					remaining = 1
				}
				expectedPace := math.Round(((tt.target-tt.achieved)/float64(remaining))*100) / 100
				if !closeEnough(health.RequiredDailyPaceUSD, expectedPace) {
					t.Fatalf("required_daily_pace = %.2f, want %.2f", health.RequiredDailyPaceUSD, expectedPace)
				}
			}
		})
	}
}

func closeEnough(got, want float64) bool {
	return math.Abs(got-want) < 0.01
}
