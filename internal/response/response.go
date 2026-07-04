package response

import (
	"math"
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	CodeUnauthorized    = "UNAUTHORIZED"
	CodeForbidden       = "FORBIDDEN"
	CodeNotFound        = "NOT_FOUND"
	CodeValidationError = "VALIDATION_ERROR"
	CodeConflict        = "CONFLICT"
	CodeInternalError   = "INTERNAL_ERROR"
)

type envelope struct {
	Data  any            `json:"data"`
	Error *errorPayload  `json:"error"`
	Meta  any            `json:"meta,omitempty"`
}

type errorPayload struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details"`
}

type paginationMeta struct {
	Total      int `json:"total"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalPages int `json:"total_pages"`
}

func Success(c *gin.Context, data any) {
	c.JSON(http.StatusOK, envelope{
		Data:  data,
		Error: nil,
		Meta:  map[string]any{},
	})
}

func SuccessList(c *gin.Context, data any, total, page, limit int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(limit)))
	}

	c.JSON(http.StatusOK, envelope{
		Data:  data,
		Error: nil,
		Meta: paginationMeta{
			Total:      total,
			Page:       page,
			Limit:      limit,
			TotalPages: totalPages,
		},
	})
}

func Error(c *gin.Context, status int, code, message string) {
	c.JSON(status, envelope{
		Data: nil,
		Error: &errorPayload{
			Code:    code,
			Message: message,
			Details: map[string]any{},
		},
	})
}
