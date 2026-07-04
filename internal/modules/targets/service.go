package targets

import (
	"context"
	"math"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repository TargetRepository
}

func NewService(repository TargetRepository) *Service {
	return &Service{repository: repository}
}

func (s *Service) CreateAnnualTarget(ctx context.Context, req CreateTargetRequest) (*AnnualTarget, error) {
	return s.repository.CreateAnnualTarget(ctx, req, initialQuarterSplit(req.AnnualTargetUSD))
}

func (s *Service) Mine(ctx context.Context, userID uuid.UUID) ([]*AnnualTarget, error) {
	return s.repository.ListUserTargets(ctx, userID)
}

func (s *Service) GetUserTarget(ctx context.Context, userID uuid.UUID, year int) (*AnnualTarget, error) {
	return s.repository.GetAnnualTarget(ctx, userID, year)
}

func (s *Service) UpdateQuarter(ctx context.Context, id uuid.UUID, targetUSD float64) (*QuarterlyTarget, error) {
	quarter, err := s.repository.UpdateQuarterlyTarget(ctx, id, targetUSD)
	if err != nil {
		return nil, err
	}
	_ = s.repository.InvalidateHealth(ctx, quarter.UserID, quarter.Year, quarter.Quarter)
	return quarter, nil
}

func (s *Service) Health(ctx context.Context, userID uuid.UUID, now time.Time) (TargetHealth, error) {
	return CalculateDailyHealth(ctx, s.repository, userID, now)
}

func (s *Service) Team(ctx context.Context, requesterRole string, requesterCountryID uuid.UUID) ([]*TeamTarget, error) {
	return s.repository.ListTeamTargets(ctx, requesterRole, requesterCountryID)
}

func (s *Service) Achievements(ctx context.Context, userID uuid.UUID, year int) ([]Achievement, error) {
	return s.repository.GetAchievementsByMonth(ctx, userID, year)
}

func initialQuarterSplit(annual float64) []float64 {
	q1 := math.Round(annual * 0.22)
	q2 := math.Round(annual * 0.23)
	q3 := math.Round(annual * 0.25)
	q4 := math.Round(annual - q1 - q2 - q3)
	return []float64{q1, q2, q3, q4}
}
