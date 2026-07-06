package targets

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type AnnualTarget struct {
	ID              uuid.UUID         `json:"id"`
	UserID          uuid.UUID         `json:"user_id"`
	Year            int               `json:"year"`
	AnnualTargetUSD float64           `json:"annual_target_usd"`
	Quarters        []QuarterlyTarget `json:"quarters,omitempty"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

type QuarterlyTarget struct {
	ID            uuid.UUID `json:"id"`
	SalesTargetID uuid.UUID `json:"sales_target_id"`
	UserID        uuid.UUID `json:"-"`
	Year          int       `json:"-"`
	Quarter       int       `json:"quarter"`
	TargetUSD     float64   `json:"quarterly_target_usd"`
	AchievedUSD   float64   `json:"achieved_usd"`
	IsManuallySet bool      `json:"is_manually_set"`
}

type TargetHealth struct {
	UserID                uuid.UUID `json:"user_id"`
	Year                  int       `json:"year"`
	Quarter               int       `json:"quarter"`
	QuarterlyTargetUSD    float64   `json:"quarterly_target_usd"`
	AchievedUSD           float64   `json:"achieved_usd"`
	ExpectedCumulativeUSD float64   `json:"expected_cumulative_usd"`
	GapUSD                float64   `json:"gap_usd"`
	GapPercent            float64   `json:"gap_percent"`
	Health                string    `json:"health"`
	WorkingDaysTotal      int       `json:"working_days_total"`
	WorkingDaysElapsed    int       `json:"working_days_elapsed"`
	WorkingDaysRemaining  int       `json:"working_days_remaining"`
	RequiredDailyPaceUSD  float64   `json:"required_daily_pace_usd"`
	AIAdvice              string    `json:"ai_advice"`
}

type Achievement struct {
	Month       int     `json:"month"`
	AchievedUSD float64 `json:"achieved_usd"`
}

type TeamTarget struct {
	UserID          uuid.UUID `json:"user_id"`
	Email           string    `json:"email"`
	Name            string    `json:"name"`
	CountryOfficeID uuid.UUID `json:"country_office_id"`
	Country         string    `json:"country"`
	AnnualTargetUSD float64   `json:"annual_target_usd"`
	AchievedUSD     float64   `json:"achieved_usd"`
}

type CreateTargetRequest struct {
	UserID          uuid.UUID `json:"user_id" binding:"required"`
	Year            int       `json:"year" binding:"required"`
	AnnualTargetUSD float64   `json:"annual_target_usd" binding:"required"`
}

type UpdateQuarterRequest struct {
	TargetUSD float64 `json:"quarterly_target_usd" binding:"required"`
}

type TargetRepository interface {
	CreateAnnualTarget(ctx context.Context, req CreateTargetRequest, quarters []float64) (*AnnualTarget, error)
	GetAnnualTarget(ctx context.Context, userID uuid.UUID, year int) (*AnnualTarget, error)
	GetQuarterlyTarget(ctx context.Context, userID uuid.UUID, year, quarter int) (*QuarterlyTarget, error)
	UpdateQuarterlyTarget(ctx context.Context, id uuid.UUID, targetUSD float64) (*QuarterlyTarget, error)
	ListUserTargets(ctx context.Context, userID uuid.UUID) ([]*AnnualTarget, error)
	ListTeamTargets(ctx context.Context, requesterRole string, requesterCountryID uuid.UUID) ([]*TeamTarget, error)
	GetAchievementsByMonth(ctx context.Context, userID uuid.UUID, year int) ([]Achievement, error)
	SumWonDeals(ctx context.Context, userID uuid.UUID, start, end time.Time) (float64, error)
	WorkingDays(ctx context.Context, userID uuid.UUID, start, end time.Time) (int, error)
	GetCachedHealth(ctx context.Context, userID uuid.UUID, year, quarter int) (*TargetHealth, error)
	CacheHealth(ctx context.Context, health TargetHealth) error
	InvalidateHealth(ctx context.Context, userID uuid.UUID, year, quarter int) error
}
