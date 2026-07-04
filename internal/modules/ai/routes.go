package ai

import (
	"github.com/gin-gonic/gin"

	"github.com/htgclouds/crm-api/internal/middleware"
)

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	router.Use(middleware.AuthMiddleware(), middleware.ScopeFilter())
	router.GET("/coach/daily-brief", handler.DailyBrief)
	router.POST("/discover-leads", middleware.RequireRole(middleware.RoleAccountManager, middleware.RoleCountryGM, middleware.RoleHOB, middleware.RoleCEO), handler.DiscoverLeads)
	router.GET("/forecast", middleware.RequireRole(middleware.RoleAccountManager, middleware.RoleCountryGM, middleware.RoleHOB, middleware.RoleCEO), handler.Forecast)
	router.GET("/recommendations", handler.Recommendations)
	router.PATCH("/recommendations/:id", handler.UpdateRecommendation)
}

func RegisterActivityRoutes(router *gin.RouterGroup, handler *Handler) {
	router.Use(middleware.AuthMiddleware(), middleware.ScopeFilter())
	router.GET("/overdue", handler.OverdueActivities)
	router.POST("/:id/ai-analyze", handler.AnalyzeActivityMeeting)
}
