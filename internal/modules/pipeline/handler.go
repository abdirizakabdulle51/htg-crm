package pipeline

import (
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

func (h *Handler) Create(c *gin.Context) {
	user, _ := auth.CurrentUser(c)
	var req CreateLeadRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.Create(c.Request.Context(), user, req)
	if err != nil {
		writeError(c, err, "Unable to create lead")
		return
	}
	response.Success(c, item)
}

func (h *Handler) List(c *gin.Context) {
	params := middleware.GetPagination(c)
	filters, ok := leadFilters(c)
	if !ok {
		return
	}
	items, total, err := h.service.List(c.Request.Context(), filters, params)
	if err != nil {
		writeError(c, err, "Unable to list leads")
		return
	}
	response.SuccessList(c, items, total, params.Page, params.Limit)
}

func (h *Handler) Profile(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	item, err := h.service.Profile(c.Request.Context(), id)
	if err != nil {
		writeError(c, err, "Unable to load lead")
		return
	}
	response.Success(c, item)
}

func (h *Handler) Update(c *gin.Context) {
	user, _ := auth.CurrentUser(c)
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateLeadRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.Update(c.Request.Context(), user, id, req)
	if err != nil {
		writeError(c, err, "Unable to update lead")
		return
	}
	response.Success(c, item)
}

func (h *Handler) AdvanceStage(c *gin.Context) {
	user, _ := auth.CurrentUser(c)
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req StageChangeRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.AdvanceStage(c.Request.Context(), user, id, req)
	if err != nil {
		writeError(c, err, "Unable to advance stage")
		return
	}
	response.Success(c, item)
}

func (h *Handler) CreateActivity(c *gin.Context) {
	user, _ := auth.CurrentUser(c)
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req CreateActivityRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateActivity(c.Request.Context(), user, id, req)
	if err != nil {
		writeError(c, err, "Unable to create activity")
		return
	}
	response.Success(c, item)
}

func (h *Handler) ListActivities(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	params := middleware.GetPagination(c)
	items, total, err := h.service.ListActivities(c.Request.Context(), id, params)
	if err != nil {
		writeError(c, err, "Unable to list activities")
		return
	}
	response.SuccessList(c, items, total, params.Page, params.Limit)
}

func (h *Handler) CreateContact(c *gin.Context) {
	user, _ := auth.CurrentUser(c)
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req CreateContactRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateContact(c.Request.Context(), user, id, req)
	if err != nil {
		writeError(c, err, "Unable to create contact")
		return
	}
	response.Success(c, item)
}

func (h *Handler) Overview(c *gin.Context) {
	item, err := h.service.Overview(c.Request.Context())
	if err != nil {
		writeError(c, err, "Unable to load pipeline overview")
		return
	}
	response.Success(c, item)
}

func (h *Handler) Forecast(c *gin.Context) {
	months := intQuery(c, "months", 3)
	item, err := h.service.Forecast(c.Request.Context(), months)
	if err != nil {
		writeError(c, err, "Unable to load forecast")
		return
	}
	response.Success(c, item)
}

func leadFilters(c *gin.Context) (LeadFilters, bool) {
	filters := LeadFilters{}
	if raw := c.Query("stage"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil {
			response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "stage must be an integer")
			return filters, false
		}
		filters.Stage = &value
	}
	var ok bool
	if filters.SectorID, ok = optionalUUID(c, "sector_id"); !ok {
		return filters, false
	}
	if filters.CountryID, ok = optionalUUID(c, "country_id"); !ok {
		return filters, false
	}
	if filters.OwnerID, ok = optionalUUID(c, "owner_id"); !ok {
		return filters, false
	}
	if filters.MinValue, ok = optionalFloat(c, "min_value"); !ok {
		return filters, false
	}
	if filters.MaxValue, ok = optionalFloat(c, "max_value"); !ok {
		return filters, false
	}
	if raw := c.Query("is_hot"); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "is_hot must be true or false")
			return filters, false
		}
		filters.IsHot = &value
	}
	return filters, true
}

func optionalUUID(c *gin.Context, key string) (uuid.UUID, bool) {
	raw := c.Query(key)
	if raw == "" {
		return uuid.Nil, true
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, key+" must be a UUID")
		return uuid.Nil, false
	}
	return id, true
}

func optionalFloat(c *gin.Context, key string) (*float64, bool) {
	raw := c.Query(key)
	if raw == "" {
		return nil, true
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, key+" must be numeric")
		return nil, false
	}
	return &value, true
}

func parseID(c *gin.Context, key string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(key))
	if err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, key+" must be a UUID")
		return uuid.Nil, false
	}
	return id, true
}

func intQuery(c *gin.Context, key string, fallback int) int {
	raw := c.Query(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 1 {
		return fallback
	}
	return value
}

func bind(c *gin.Context, dest any) bool {
	if err := c.ShouldBindJSON(dest); err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "Request body failed validation")
		return false
	}
	return true
}

func writeError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		response.Error(c, http.StatusNotFound, response.CodeNotFound, "Resource does not exist")
	case errors.Is(err, ErrForbidden):
		response.Error(c, http.StatusForbidden, response.CodeForbidden, "Valid JWT but insufficient role")
	case errors.Is(err, ErrValidation):
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, err.Error())
	default:
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, fallback)
	}
}
