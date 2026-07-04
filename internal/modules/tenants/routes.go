package tenants

import (
	"github.com/gin-gonic/gin"

	"github.com/htgclouds/crm-api/internal/middleware"
)

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	router.Use(middleware.AuthMiddleware(), middleware.ScopeFilter())

	router.GET("", handler.List)
	router.POST("", middleware.RequireRole(middleware.RoleAccountManager, middleware.RoleCountryGM, middleware.RoleHOB), handler.Create)
	router.GET("/at-risk", handler.AtRisk)
	router.GET("/renewals", handler.Renewals)

	router.GET("/:id", handler.Profile)
	router.PUT("/:id", middleware.RequireRole(middleware.RoleAccountManager, middleware.RoleCountryGM, middleware.RoleHOB), handler.Update)
	router.POST("/:id/refresh-risk", handler.RefreshRisk)

	router.GET("/:id/services", handler.ListServices)
	router.POST("/:id/services", middleware.RequireRole(middleware.RoleAccountManager, middleware.RoleCountryGM, middleware.RoleHOB), handler.CreateService)
	router.PUT("/:id/services/:service_id", middleware.RequireRole(middleware.RoleAccountManager, middleware.RoleCountryGM, middleware.RoleHOB), handler.UpdateService)

	router.GET("/:id/usage", handler.Usage)
	router.GET("/:id/growth", handler.Growth)

	router.GET("/:id/contacts", handler.ListContacts)
	router.POST("/:id/contacts", middleware.RequireRole(middleware.RoleAccountManager, middleware.RoleCountryGM, middleware.RoleHOB), handler.CreateContact)

	router.GET("/:id/contracts", handler.ListContracts)
	router.POST("/:id/contracts", middleware.RequireRole(middleware.RoleAccountManager, middleware.RoleCountryGM, middleware.RoleHOB), handler.CreateContract)

	router.GET("/:id/activities", handler.ListActivities)
}
