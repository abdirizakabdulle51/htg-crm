package tenants

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
	service *ServiceLayer
}

func NewHandler(service *ServiceLayer) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	params := middleware.GetPagination(c)
	filters, ok := tenantFilters(c)
	if !ok {
		return
	}
	if shouldReturn, empty := applyGMCountryFilter(c, &filters); !shouldReturn {
		if empty {
			response.SuccessList(c, []*Tenant{}, 0, params.Page, params.Limit)
		}
		return
	}
	items, total, err := h.service.List(c.Request.Context(), filters, params)
	if err != nil {
		writeError(c, err, "Unable to list tenants")
		return
	}
	response.SuccessList(c, items, total, params.Page, params.Limit)
}

func (h *Handler) Profile(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	profile, err := h.service.Profile(c.Request.Context(), id)
	if err != nil {
		writeError(c, err, "Unable to load tenant profile")
		return
	}
	response.Success(c, profile)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateTenantRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		writeError(c, err, "Unable to create tenant")
		return
	}
	response.Success(c, item)
}

func (h *Handler) Update(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req UpdateTenantRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.Update(c.Request.Context(), id, req)
	if err != nil {
		writeError(c, err, "Unable to update tenant")
		return
	}
	response.Success(c, item)
}

func (h *Handler) ListServices(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	items, err := h.service.ListServices(c.Request.Context(), id)
	if err != nil {
		writeError(c, err, "Unable to list services")
		return
	}
	response.Success(c, gin.H{"services": items})
}

func (h *Handler) CreateService(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req CreateServiceRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateService(c.Request.Context(), id, req)
	if err != nil {
		writeError(c, err, "Unable to create service")
		return
	}
	response.Success(c, item)
}

func (h *Handler) UpdateService(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	serviceID, ok := parseIDParam(c, "service_id")
	if !ok {
		return
	}
	var req CreateServiceRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.UpdateService(c.Request.Context(), id, serviceID, req)
	if err != nil {
		writeError(c, err, "Unable to update service")
		return
	}
	response.Success(c, item)
}

func (h *Handler) Usage(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	days := intQuery(c, "days", 30)
	items, err := h.service.Usage(c.Request.Context(), id, days)
	if err != nil {
		writeError(c, err, "Unable to load usage")
		return
	}
	response.Success(c, gin.H{"usage": items})
}

func (h *Handler) Growth(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	items, err := h.service.Growth(c.Request.Context(), id)
	if err != nil {
		writeError(c, err, "Unable to load growth")
		return
	}
	response.Success(c, gin.H{"growth": items})
}

func (h *Handler) ListContacts(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	params := middleware.GetPagination(c)
	items, total, err := h.service.ListContacts(c.Request.Context(), id, params)
	if err != nil {
		writeError(c, err, "Unable to list contacts")
		return
	}
	response.SuccessList(c, items, total, params.Page, params.Limit)
}

func (h *Handler) CreateContact(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req CreateContactRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateContact(c.Request.Context(), id, req)
	if err != nil {
		writeError(c, err, "Unable to create contact")
		return
	}
	response.Success(c, item)
}

func (h *Handler) ListContracts(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	params := middleware.GetPagination(c)
	items, total, err := h.service.ListContracts(c.Request.Context(), id, params)
	if err != nil {
		writeError(c, err, "Unable to list contracts")
		return
	}
	response.SuccessList(c, items, total, params.Page, params.Limit)
}

func (h *Handler) CreateContract(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req CreateContractRequest
	if !bind(c, &req) {
		return
	}
	item, err := h.service.CreateContract(c.Request.Context(), id, req)
	if err != nil {
		writeError(c, err, "Unable to create contract")
		return
	}
	response.Success(c, item)
}

func (h *Handler) ListActivities(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
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

func (h *Handler) RefreshRisk(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	score, err := h.service.RefreshRisk(c.Request.Context(), id)
	if err != nil {
		writeError(c, err, "Unable to refresh risk")
		return
	}
	response.Success(c, gin.H{"tenant_id": id, "risk_score": score, "risk_band": riskBand(score)})
}

func (h *Handler) AtRisk(c *gin.Context) {
	params := middleware.GetPagination(c)
	items, total, err := h.service.AtRisk(c.Request.Context(), params)
	if err != nil {
		writeError(c, err, "Unable to list at-risk tenants")
		return
	}
	response.SuccessList(c, items, total, params.Page, params.Limit)
}

func (h *Handler) Renewals(c *gin.Context) {
	params := middleware.GetPagination(c)
	days := intQuery(c, "days", 30)
	items, total, err := h.service.Renewals(c.Request.Context(), days, params)
	if err != nil {
		writeError(c, err, "Unable to list renewals")
		return
	}
	response.SuccessList(c, items, total, params.Page, params.Limit)
}

func tenantFilters(c *gin.Context) (TenantFilters, bool) {
	var filters TenantFilters
	var ok bool
	if filters.CountryID, ok = optionalUUID(c, "country_id"); !ok {
		return filters, false
	}
	if filters.SectorID, ok = optionalUUID(c, "sector_id"); !ok {
		return filters, false
	}
	if filters.AccountManagerID, ok = optionalUUID(c, "account_manager_id"); !ok {
		return filters, false
	}
	filters.Status = c.Query("status")
	filters.Search = c.Query("search")
	if raw := c.Query("min_risk_score"); raw != "" {
		value, err := strconv.Atoi(raw)
		if err != nil {
			response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "min_risk_score must be an integer")
			return filters, false
		}
		filters.MinRiskScore = &value
	}
	return filters, true
}

func applyGMCountryFilter(c *gin.Context, filters *TenantFilters) (shouldReturn bool, empty bool) {
	user, ok := c.Get(auth.UserContextKey)
	if !ok {
		return true, false
	}
	userCtx, ok := user.(auth.UserContext)
	if !ok || userCtx.Role != middleware.RoleCountryGM {
		return true, false
	}

	filters.CountryID = userCtx.CountryOfficeID
	return true, false
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

func parseIDParam(c *gin.Context, key string) (uuid.UUID, bool) {
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
	default:
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, fallback)
	}
}
