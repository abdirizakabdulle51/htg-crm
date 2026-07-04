package users

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/middleware"
	"github.com/htgclouds/crm-api/internal/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Me(c *gin.Context) {
	userContext, ok := auth.CurrentUser(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "No valid JWT")
		return
	}

	user, err := h.service.Current(c.Request.Context(), userContext.ID)
	if err != nil {
		writeError(c, err, "Unable to load profile")
		return
	}
	response.Success(c, user)
}

func (h *Handler) CreateCountryOffice(c *gin.Context) {
	var req CreateCountryOfficeRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateCountryOffice(c.Request.Context(), req)
	if err != nil {
		writeError(c, err, "Unable to create country office")
		return
	}
	response.Success(c, item)
}

func (h *Handler) ListCountryOffices(c *gin.Context) {
	items, err := h.service.ListCountryOffices(c.Request.Context())
	if err != nil {
		writeError(c, err, "Unable to list country offices")
		return
	}
	response.Success(c, gin.H{"country_offices": items})
}

func (h *Handler) UpdateCountryOffice(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var req UpdateCountryOfficeRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.UpdateCountryOffice(c.Request.Context(), id, req)
	if err != nil {
		writeError(c, err, "Unable to update country office")
		return
	}
	response.Success(c, item)
}

func (h *Handler) CreateRegion(c *gin.Context) {
	var req CreateRegionRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateRegion(c.Request.Context(), req)
	if err != nil {
		writeError(c, err, "Unable to create region")
		return
	}
	response.Success(c, item)
}

func (h *Handler) ListRegions(c *gin.Context) {
	filters := RegionFilters{Type: c.Query("type")}
	if raw := c.Query("country_office_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "country_office_id must be a UUID")
			return
		}
		filters.CountryOfficeID = id
	}
	items, err := h.service.ListRegions(c.Request.Context(), filters)
	if err != nil {
		writeError(c, err, "Unable to list regions")
		return
	}
	response.Success(c, gin.H{"regions": items})
}

func (h *Handler) CreateSector(c *gin.Context) {
	var req CreateSectorRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateSector(c.Request.Context(), req)
	if err != nil {
		writeError(c, err, "Unable to create sector")
		return
	}
	response.Success(c, item)
}

func (h *Handler) ListSectors(c *gin.Context) {
	items, err := h.service.ListSectors(c.Request.Context())
	if err != nil {
		writeError(c, err, "Unable to list sectors")
		return
	}
	response.Success(c, gin.H{"sectors": items})
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if !bind(c, &req) {
		return
	}
	user, err := h.service.CreateUser(c.Request.Context(), req)
	if err != nil {
		writeError(c, err, "Unable to create user")
		return
	}
	response.Success(c, user)
}

func (h *Handler) ListUsers(c *gin.Context) {
	params := middleware.GetPagination(c)
	filters, ok := userFilters(c)
	if !ok {
		return
	}
	items, total, err := h.service.ListUsers(c.Request.Context(), filters, params)
	if err != nil {
		writeError(c, err, "Unable to list users")
		return
	}
	response.SuccessList(c, items, total, params.Page, params.Limit)
}

func (h *Handler) UpdateUser(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var req UpdateUserRequest
	if !bind(c, &req) {
		return
	}
	user, err := h.service.UpdateUser(c.Request.Context(), id, req)
	if err != nil {
		writeError(c, err, "Unable to update user")
		return
	}
	response.Success(c, user)
}

func (h *Handler) ReplaceUserRegions(c *gin.Context) {
	h.replaceIDs(c, h.service.ReplaceRegions)
}

func (h *Handler) ReplaceUserSectors(c *gin.Context) {
	h.replaceIDs(c, h.service.ReplaceSectors)
}

func (h *Handler) DeactivateUser(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	if err := h.service.Deactivate(c.Request.Context(), id); err != nil {
		writeError(c, err, "Unable to deactivate user")
		return
	}
	response.Success(c, gin.H{"id": id, "is_active": false})
}

func (h *Handler) replaceIDs(c *gin.Context, replace func(context.Context, uuid.UUID, []uuid.UUID) error) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var req ReplaceIDsRequest
	if !bind(c, &req) {
		return
	}
	if err := replace(c.Request.Context(), id, req.IDs); err != nil {
		writeError(c, err, "Unable to replace assignments")
		return
	}
	response.Success(c, gin.H{"id": id})
}

func bind(c *gin.Context, dest any) bool {
	if err := c.ShouldBindJSON(dest); err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "Request body failed validation")
		return false
	}
	return true
}

func parseID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "id must be a UUID")
		return uuid.Nil, false
	}
	return id, true
}

func userFilters(c *gin.Context) (UserFilters, bool) {
	filters := UserFilters{Role: c.Query("role")}
	if raw := c.Query("country_office_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "country_office_id must be a UUID")
			return filters, false
		}
		filters.CountryOfficeID = id
	}
	if raw := c.Query("is_active"); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "is_active must be true or false")
			return filters, false
		}
		filters.IsActive = &value
	}
	return filters, true
}

func writeError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		response.Error(c, http.StatusNotFound, response.CodeNotFound, "Resource does not exist")
	default:
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, fallback)
	}
}
