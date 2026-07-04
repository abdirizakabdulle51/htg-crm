package ai

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Recommendations(c *gin.Context) {
	items, err := h.service.Recommendations(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Unable to generate recommendations")
		return
	}
	response.Success(c, gin.H{"recommendations": items})
}

func (h *Handler) UpdateRecommendation(c *gin.Context) {
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "Request body failed validation")
		return
	}
	if err := h.service.UpdateRecommendationStatus(c.Request.Context(), c.Param("id"), req.Status); err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Unable to update recommendation")
		return
	}
	response.Success(c, gin.H{"id": c.Param("id"), "status": req.Status})
}

func (h *Handler) DailyBrief(c *gin.Context) {
	user, ok := auth.CurrentUser(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "No valid JWT")
		return
	}
	brief, err := h.service.DailyBrief(c.Request.Context(), user, time.Now().UTC())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Unable to generate daily brief")
		return
	}
	response.Success(c, brief)
}

func (h *Handler) AnalyzeActivityMeeting(c *gin.Context) {
	user, ok := auth.CurrentUser(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "No valid JWT")
		return
	}
	activityID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "activity id must be a UUID")
		return
	}
	output, err := h.service.AnalyzeMeeting(c.Request.Context(), activityID, user)
	if err != nil {
		switch {
		case errors.Is(err, ErrMeetingNotFound):
			response.Error(c, http.StatusNotFound, response.CodeNotFound, "Activity does not exist")
		case errors.Is(err, ErrMeetingValidation):
			response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, err.Error())
		case errors.Is(err, ErrMeetingForbidden):
			response.Error(c, http.StatusForbidden, response.CodeForbidden, "Valid JWT but insufficient role")
		case errors.Is(err, ErrAIUnavailable):
			response.Error(c, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "AI analysis is temporarily unavailable")
		default:
			response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Unable to analyze meeting")
		}
		return
	}
	response.Success(c, output)
}

func (h *Handler) DiscoverLeads(c *gin.Context) {
	user, ok := auth.CurrentUser(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "No valid JWT")
		return
	}
	var req DiscoverLeadsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "Request body failed validation")
		return
	}
	result, err := h.service.DiscoverLeads(c.Request.Context(), user, req)
	if err != nil {
		if errors.Is(err, ErrDiscoveryValidation) {
			response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, err.Error())
			return
		}
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Unable to discover leads")
		return
	}
	response.Success(c, result)
}

func (h *Handler) Forecast(c *gin.Context) {
	user, ok := auth.CurrentUser(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "No valid JWT")
		return
	}
	forecast, err := h.service.RevenueForecast(c.Request.Context(), user, c.DefaultQuery("scope", "quarter"), time.Now().UTC())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Unable to generate revenue forecast")
		return
	}
	response.Success(c, forecast)
}

func (h *Handler) OverdueActivities(c *gin.Context) {
	user, ok := auth.CurrentUser(c)
	if !ok {
		response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "No valid JWT")
		return
	}
	items, err := h.service.OverdueActivities(c.Request.Context(), user.ID, c.DefaultQuery("limit", "10"))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Unable to load overdue activities")
		return
	}
	response.Success(c, gin.H{"activities": items})
}
