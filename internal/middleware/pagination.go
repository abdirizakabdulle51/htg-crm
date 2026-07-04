package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/htgclouds/crm-api/internal/response"
)

const PaginationContextKey = "pagination"

type PaginationParams struct {
	Page  int
	Limit int
	Sort  string
	Order string
}

func Pagination() gin.HandlerFunc {
	return func(c *gin.Context) {
		page, ok := parseIntQuery(c, "page", 1, 1, 0)
		if !ok {
			return
		}

		limit, ok := parseIntQuery(c, "limit", 20, 1, 100)
		if !ok {
			return
		}

		order := strings.ToLower(strings.TrimSpace(c.DefaultQuery("order", "desc")))
		if order != "asc" && order != "desc" {
			response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, "order must be either asc or desc")
			c.Abort()
			return
		}

		sort := strings.TrimSpace(c.DefaultQuery("sort", "created_at"))
		if sort == "" {
			sort = "created_at"
		}

		c.Set(PaginationContextKey, PaginationParams{
			Page:  page,
			Limit: limit,
			Sort:  sort,
			Order: order,
		})
		c.Next()
	}
}

func GetPagination(c *gin.Context) PaginationParams {
	if value, exists := c.Get(PaginationContextKey); exists {
		if params, ok := value.(PaginationParams); ok {
			return params
		}
	}
	return PaginationParams{Page: 1, Limit: 20, Sort: "created_at", Order: "desc"}
}

func parseIntQuery(c *gin.Context, key string, fallback, minValue, maxValue int) (int, bool) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return fallback, true
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value < minValue || (maxValue > 0 && value > maxValue) {
		message := key + " must be"
		if maxValue > 0 {
			message += " between " + strconv.Itoa(minValue) + " and " + strconv.Itoa(maxValue)
		} else {
			message += " greater than or equal to " + strconv.Itoa(minValue)
		}
		response.Error(c, http.StatusUnprocessableEntity, response.CodeValidationError, message)
		c.Abort()
		return 0, false
	}

	return value, true
}
