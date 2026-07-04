package pipeline

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/middleware"
)

var (
	ErrForbidden  = errors.New("forbidden")
	ErrValidation = errors.New("validation")
)

type Service struct {
	repository Repository
	redis      *redis.Client
	notify     NotificationService
}

func NewService(repository Repository, redisClient *redis.Client, notifyServices ...NotificationService) *Service {
	notify := NotificationService(NoopNotificationService{})
	if len(notifyServices) > 0 && notifyServices[0] != nil {
		notify = notifyServices[0]
	}
	return &Service{repository: repository, redis: redisClient, notify: notify}
}

func (s *Service) Create(ctx context.Context, user auth.UserContext, req CreateLeadRequest) (*Lead, error) {
	if err := s.canEditLeadData(ctx, user, req.OwnerID, req.CountryID); err != nil {
		return nil, err
	}
	return s.repository.Create(ctx, req)
}

func (s *Service) List(ctx context.Context, filters LeadFilters, params PaginationParams) ([]*Lead, int, error) {
	return s.repository.List(ctx, filters, params)
}

func (s *Service) Profile(ctx context.Context, id uuid.UUID) (*LeadProfile, error) {
	return s.repository.Profile(ctx, id)
}

func (s *Service) Update(ctx context.Context, user auth.UserContext, id uuid.UUID, req UpdateLeadRequest) (*Lead, error) {
	lead, err := s.repository.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := canEditLead(user, lead); err != nil {
		return nil, err
	}
	return s.repository.Update(ctx, id, req)
}

func (s *Service) AdvanceStage(ctx context.Context, user auth.UserContext, id uuid.UUID, req StageChangeRequest) (*StageChangeResult, error) {
	lead, err := s.repository.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := canEditLead(user, lead); err != nil {
		return nil, err
	}
	if req.Stage != lead.StageNumber+1 && req.Stage != StageLost && req.Stage != StageDormant {
		return nil, fmt.Errorf("%w: stage must advance by one or move directly to lost/dormant", ErrValidation)
	}
	if req.Stage < lead.StageNumber {
		return nil, fmt.Errorf("%w: stage decreases are forbidden", ErrValidation)
	}
	if req.Stage == StageLost && (req.Reason == "" || req.Competitor == "") {
		return nil, fmt.Errorf("%w: reason and competitor are required for lost leads", ErrValidation)
	}

	result := &StageChangeResult{}
	if req.Stage == StageDormant {
		lastActivityAt, err := s.repository.LastActivityAt(ctx, id)
		if err != nil {
			return nil, err
		}
		if lastActivityAt != nil && lastActivityAt.After(time.Now().AddDate(0, 0, -90)) {
			result.Warning = "Dormant stage selected while the last activity is less than 90 days old."
		}
	}
	updated, err := s.repository.AdvanceStage(ctx, lead, req, user, s.notify)
	if err != nil {
		return nil, err
	}
	result.Lead = updated
	return result, nil
}

func (s *Service) CreateActivity(ctx context.Context, user auth.UserContext, leadID uuid.UUID, req CreateActivityRequest) (*Activity, error) {
	lead, err := s.repository.FindByID(ctx, leadID)
	if err != nil {
		return nil, err
	}
	if err := canEditLead(user, lead); err != nil {
		return nil, err
	}
	return s.repository.CreateActivity(ctx, leadID, user.ID, req)
}

func (s *Service) ListActivities(ctx context.Context, leadID uuid.UUID, params PaginationParams) ([]*Activity, int, error) {
	if _, err := s.repository.FindByID(ctx, leadID); err != nil {
		return nil, 0, err
	}
	return s.repository.ListActivities(ctx, leadID, params)
}

func (s *Service) CreateContact(ctx context.Context, user auth.UserContext, leadID uuid.UUID, req CreateContactRequest) (*Contact, error) {
	lead, err := s.repository.FindByID(ctx, leadID)
	if err != nil {
		return nil, err
	}
	if err := canEditLead(user, lead); err != nil {
		return nil, err
	}
	return s.repository.CreateContact(ctx, leadID, req)
}

func (s *Service) Overview(ctx context.Context) (*Overview, error) {
	cacheKey := "htgcrm:pipeline:" + scopeKey(ctx) + ":overview"
	if s.redis != nil {
		if raw, err := s.redis.Get(ctx, cacheKey).Bytes(); err == nil {
			cached := &Overview{}
			if json.Unmarshal(raw, cached) == nil {
				return cached, nil
			}
		}
	}
	overview, err := s.repository.Overview(ctx)
	if err != nil {
		return nil, err
	}
	if s.redis != nil {
		if body, err := json.Marshal(overview); err == nil {
			_ = s.redis.Set(ctx, cacheKey, body, 5*time.Minute).Err()
		}
	}
	return overview, nil
}

func (s *Service) Forecast(ctx context.Context, months int) (*Forecast, error) {
	if months < 1 {
		months = 3
	}
	return s.repository.Forecast(ctx, months)
}

func (s *Service) canEditLeadData(ctx context.Context, user auth.UserContext, ownerID, countryID uuid.UUID) error {
	switch user.Role {
	case middleware.RoleAccountManager:
		if ownerID != user.ID {
			return ErrForbidden
		}
	case middleware.RoleCountryGM:
		if countryID != user.CountryOfficeID {
			return ErrForbidden
		}
	case middleware.RoleHOB, middleware.RoleCEO, middleware.RoleAdmin:
		return nil
	default:
		return ErrForbidden
	}
	return nil
}

func canEditLead(user auth.UserContext, lead *Lead) error {
	switch user.Role {
	case middleware.RoleAccountManager:
		if lead.OwnerID == user.ID {
			return nil
		}
	case middleware.RoleCountryGM:
		if lead.CountryID == user.CountryOfficeID {
			return nil
		}
	case middleware.RoleHOB, middleware.RoleCEO, middleware.RoleAdmin:
		return nil
	}
	return ErrForbidden
}

func scopeKey(ctx context.Context) string {
	if userID, ok := middleware.FilterUserID(ctx); ok {
		return "user:" + userID.String()
	}
	if countryID, ok := middleware.FilterCountryID(ctx); ok {
		return "country:" + countryID.String()
	}
	return "all"
}
