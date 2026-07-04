package users

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"

	"github.com/google/uuid"
)

type KeycloakAdmin interface {
	CreateUser(ctx context.Context, req KeycloakCreateUserRequest) (string, error)
	AssignRealmRole(ctx context.Context, keycloakID, role string) error
	DisableUser(ctx context.Context, keycloakID string) error
}

type EmailService interface {
	SendWelcome(ctx context.Context, email, name, temporaryPassword string) error
}

type Service struct {
	repository *Repository
	keycloak   KeycloakAdmin
	email      EmailService
}

func NewService(repository *Repository, keycloak KeycloakAdmin, email EmailService) *Service {
	return &Service{repository: repository, keycloak: keycloak, email: email}
}

func (s *Service) Current(ctx context.Context, id uuid.UUID) (*User, error) {
	return s.repository.FindByID(ctx, id)
}

func (s *Service) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
	if strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Role) == "" || req.CountryOfficeID == uuid.Nil {
		return nil, errors.New("email, name, role, and country_office_id are required")
	}

	user := &User{
		ID:              uuid.New(),
		KeycloakID:      uuid.NewString(),
		Email:           strings.ToLower(strings.TrimSpace(req.Email)),
		FullName:        strings.TrimSpace(req.Name),
		Role:            strings.TrimSpace(req.Role),
		CountryOfficeID: req.CountryOfficeID,
		Phone:           req.Phone,
	}

	created, err := s.repository.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	tempPassword, err := temporaryPassword()
	if err != nil {
		return nil, err
	}

	keycloakID, err := s.keycloak.CreateUser(ctx, KeycloakCreateUserRequest{
		Email:             created.Email,
		Name:              created.FullName,
		Role:              created.Role,
		CountryOfficeID:   created.CountryOfficeID,
		TemporaryPassword: tempPassword,
	})
	if err != nil {
		return nil, err
	}

	if err := s.keycloak.AssignRealmRole(ctx, keycloakID, created.Role); err != nil {
		return nil, err
	}

	created, err = s.repository.UpdateKeycloakID(ctx, created.ID, keycloakID)
	if err != nil {
		return nil, err
	}

	_ = s.email.SendWelcome(ctx, created.Email, created.FullName, tempPassword)
	return created, nil
}

func (s *Service) ListUsers(ctx context.Context, filters UserFilters, params PaginationParams) ([]*User, int, error) {
	return s.repository.FindAll(ctx, filters, params)
}

func (s *Service) UpdateUser(ctx context.Context, id uuid.UUID, req UpdateUserRequest) (*User, error) {
	return s.repository.Update(ctx, id, UserUpdates{
		Email:           req.Email,
		FullName:        req.Name,
		Role:            req.Role,
		CountryOfficeID: req.CountryOfficeID,
		Phone:           req.Phone,
		IsActive:        req.IsActive,
	})
}

func (s *Service) ReplaceRegions(ctx context.Context, id uuid.UUID, regions []uuid.UUID) error {
	return s.repository.SetRegions(ctx, id, regions)
}

func (s *Service) ReplaceSectors(ctx context.Context, id uuid.UUID, sectors []uuid.UUID) error {
	return s.repository.SetSectors(ctx, id, sectors)
}

func (s *Service) Deactivate(ctx context.Context, id uuid.UUID) error {
	user, err := s.repository.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.repository.Deactivate(ctx, id); err != nil {
		return err
	}
	return s.keycloak.DisableUser(ctx, user.KeycloakID)
}

func (s *Service) CreateCountryOffice(ctx context.Context, req CreateCountryOfficeRequest) (*CountryOffice, error) {
	return s.repository.CreateCountryOffice(ctx, req)
}

func (s *Service) ListCountryOffices(ctx context.Context) ([]*CountryOffice, error) {
	return s.repository.ListCountryOffices(ctx)
}

func (s *Service) UpdateCountryOffice(ctx context.Context, id uuid.UUID, req UpdateCountryOfficeRequest) (*CountryOffice, error) {
	return s.repository.UpdateCountryOffice(ctx, id, req)
}

func (s *Service) CreateRegion(ctx context.Context, req CreateRegionRequest) (*Region, error) {
	return s.repository.CreateRegion(ctx, req)
}

func (s *Service) ListRegions(ctx context.Context, filters RegionFilters) ([]*Region, error) {
	return s.repository.ListRegions(ctx, filters)
}

func (s *Service) CreateSector(ctx context.Context, req CreateSectorRequest) (*Sector, error) {
	return s.repository.CreateSector(ctx, req)
}

func (s *Service) ListSectors(ctx context.Context) ([]*Sector, error) {
	return s.repository.ListSectors(ctx)
}

func temporaryPassword() (string, error) {
	buf := make([]byte, 18)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

type NoopEmailService struct{}

func (NoopEmailService) SendWelcome(ctx context.Context, email, name, temporaryPassword string) error {
	return nil
}
