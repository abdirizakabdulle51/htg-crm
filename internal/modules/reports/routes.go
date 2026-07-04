package reports

import (
	"github.com/gin-gonic/gin"

	"github.com/htgclouds/crm-api/internal/middleware"
)

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	router.Use(middleware.AuthMiddleware(), middleware.RequireRole(middleware.RoleCountryGM, middleware.RoleHOB, middleware.RoleCEO))
	router.GET("", handler.List)
	router.Any("/*path", handler.List)
}
