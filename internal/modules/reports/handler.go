package reports

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/htgclouds/crm-api/internal/middleware"
	"github.com/htgclouds/crm-api/internal/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	params := middleware.GetPagination(c)
	items, total, err := h.service.List(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Unable to list reports")
		return
	}
	response.SuccessList(c, items, total, params.Page, params.Limit)
}
