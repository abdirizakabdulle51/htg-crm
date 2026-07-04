package users

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/htgclouds/crm-api/internal/middleware"
)

type PaginationParams = middleware.PaginationParams

type User struct {
	ID              uuid.UUID   `json:"id"`
	KeycloakID      string      `json:"keycloak_id"`
	Email           string      `json:"email"`
	FullName        string      `json:"name"`
	Role            string      `json:"role"`
	CountryOfficeID uuid.UUID   `json:"country_office_id"`
	Phone           string      `json:"phone,omitempty"`
	IsActive        bool        `json:"is_active"`
	Regions         []uuid.UUID `json:"regions,omitempty"`
	Sectors         []uuid.UUID `json:"sectors,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

type CountryOffice struct {
	ID           uuid.UUID `json:"id"`
	Code         string    `json:"code"`
	Name         string    `json:"name"`
	Timezone     string    `json:"timezone"`
	CurrencyCode string    `json:"currency_code"`
	IsActive     bool      `json:"is_active"`
}

type Region struct {
	ID              uuid.UUID `json:"id"`
	CountryOfficeID uuid.UUID `json:"country_office_id"`
	Name            string    `json:"name"`
	Code            string    `json:"code"`
	Type            string    `json:"type,omitempty"`
	IsActive        bool      `json:"is_active"`
}

type Sector struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	IsActive    bool      `json:"is_active"`
}

type UserFilters struct {
	Role            string
	CountryOfficeID uuid.UUID
	IsActive        *bool
}

type RegionFilters struct {
	CountryOfficeID uuid.UUID
	Type            string
}

type UserUpdates struct {
	Email           *string
	FullName        *string
	Role            *string
	CountryOfficeID *uuid.UUID
	Phone           *string
	IsActive        *bool
}

type CreateUserRequest struct {
	Email           string    `json:"email" binding:"required,email"`
	Name            string    `json:"name" binding:"required"`
	Role            string    `json:"role" binding:"required"`
	CountryOfficeID uuid.UUID `json:"country_office_id" binding:"required"`
	Phone           string    `json:"phone"`
}

type UpdateUserRequest struct {
	Email           *string    `json:"email"`
	Name            *string    `json:"name"`
	Role            *string    `json:"role"`
	CountryOfficeID *uuid.UUID `json:"country_office_id"`
	Phone           *string    `json:"phone"`
	IsActive        *bool      `json:"is_active"`
}

type ReplaceIDsRequest struct {
	IDs []uuid.UUID `json:"ids" binding:"required"`
}

type CreateCountryOfficeRequest struct {
	Code         string `json:"code" binding:"required"`
	Name         string `json:"name" binding:"required"`
	Timezone     string `json:"timezone" binding:"required"`
	CurrencyCode string `json:"currency_code" binding:"required"`
}

type UpdateCountryOfficeRequest struct {
	Code         *string `json:"code"`
	Name         *string `json:"name"`
	Timezone     *string `json:"timezone"`
	CurrencyCode *string `json:"currency_code"`
	IsActive     *bool   `json:"is_active"`
}

type CreateRegionRequest struct {
	CountryOfficeID uuid.UUID `json:"country_office_id" binding:"required"`
	Name            string    `json:"name" binding:"required"`
	Code            string    `json:"code" binding:"required"`
	Type            string    `json:"type"`
}

type CreateSectorRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type UserRepository interface {
	Create(ctx context.Context, user *User) (*User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindAll(ctx context.Context, filters UserFilters, params PaginationParams) ([]*User, int, error)
	Update(ctx context.Context, id uuid.UUID, updates UserUpdates) (*User, error)
	SetRegions(ctx context.Context, id uuid.UUID, regions []uuid.UUID) error
	SetSectors(ctx context.Context, id uuid.UUID, sectors []uuid.UUID) error
	Deactivate(ctx context.Context, id uuid.UUID) error
}
