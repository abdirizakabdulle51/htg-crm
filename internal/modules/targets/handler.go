package targets

import (
	"errors"
	"net/http"
	"strconv"
	"time"

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
	var req CreateTargetRequest
	if !bind(c, &req) {
		return
	}
	target, err := h.service.CreateAnnualTarget(c.Request.Context(), req)
	if err != nil {
		writeError(c, err, "Unable to create target")
		return
	}
	response.Success(c, target)
}

func (h *Handler) Mine(c *gin.Context) {
	user := c.MustGet(auth.UserContextKey).(auth.UserContext)
	targets, err := h.service.Mine(c.Request.Context(), user.ID)
	if err != nil {
		writeError(c, err, "Unable to load targets")
		return
	}
	response.Success(c, gin.H{"targets": targets})
}

func (h *Handler) GetUserYear(c *gin.Context) {
	requester := c.MustGet(auth.UserContextKey).(auth.UserContext)
	userID, year, ok := userYearParams(c)
	if !ok {
		return
	}
	if !canViewTarget(requester, userID) {
		response.Error(c, http.StatusForbidden, response.CodeForbidden, "Valid JWT but insufficient role")
		return
	}

	target, err := h.service.GetUserTarget(c.Request.Context(), userID, year)
	if err != nil {
		writeError(c, err, "Unable to load target")
		return
	}
	response.Success(c, target)
}

func (h *Handler) UpdateQuarter(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "id must be a UUID")
		return
	}
	var req UpdateQuarterRequest
	if !bind(c, &req) {
		return
	}
	quarter, err := h.service.UpdateQuarter(c.Request.Context(), id, req.TargetUSD)
	if err != nil {
		writeError(c, err, "Unable to update quarter")
		return
	}
	response.Success(c, quarter)
}

func (h *Handler) MyHealth(c *gin.Context) {
	user := c.MustGet(auth.UserContextKey).(auth.UserContext)
	h.writeHealth(c, user.ID)
}

func (h *Handler) UserHealth(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "user_id must be a UUID")
		return
	}
	h.writeHealth(c, userID)
}

func (h *Handler) Team(c *gin.Context) {
	user := c.MustGet(auth.UserContextKey).(auth.UserContext)
	targets, err := h.service.Team(c.Request.Context(), user.Role, user.CountryOfficeID)
	if err != nil {
		writeError(c, err, "Unable to load team targets")
		return
	}
	response.Success(c, gin.H{"team": targets})
}

func (h *Handler) Achievements(c *gin.Context) {
	userID, year, ok := userYearParams(c)
	if !ok {
		return
	}
	items, err := h.service.Achievements(c.Request.Context(), userID, year)
	if err != nil {
		writeError(c, err, "Unable to load achievements")
		return
	}
	response.Success(c, gin.H{"achievements": items})
}

func (h *Handler) writeHealth(c *gin.Context, userID uuid.UUID) {
	health, err := h.service.Health(c.Request.Context(), userID, time.Now())
	if err != nil {
		writeError(c, err, "Unable to calculate target health")
		return
	}
	response.Success(c, health)
}

func bind(c *gin.Context, dest any) bool {
	if err := c.ShouldBindJSON(dest); err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "Request body failed validation")
		return false
	}
	return true
}

func userYearParams(c *gin.Context) (uuid.UUID, int, bool) {
	userID, err := uuid.Parse(c.Param("user_id"))
	if err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "user_id must be a UUID")
		return uuid.Nil, 0, false
	}
	year, err := strconv.Atoi(c.Param("year"))
	if err != nil || year < 2000 {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "year must be valid")
		return uuid.Nil, 0, false
	}
	return userID, year, true
}

func canViewTarget(user auth.UserContext, targetUserID uuid.UUID) bool {
	switch user.Role {
	case middleware.RoleAccountManager:
		return user.ID == targetUserID
	case middleware.RoleCountryGM, middleware.RoleHOB, middleware.RoleCEO:
		return true
	default:
		return false
	}
}

func writeError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		response.Error(c, http.StatusNotFound, response.CodeNotFound, "Resource does not exist")
	default:
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, fallback)
	}
}
