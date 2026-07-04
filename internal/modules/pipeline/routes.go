package pipeline

import (
	"github.com/gin-gonic/gin"

	"github.com/htgclouds/crm-api/internal/middleware"
)

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	router.Use(middleware.AuthMiddleware(), middleware.ScopeFilter())
	router.GET("/overview", handler.Overview)
	router.GET("/forecast", handler.Forecast)
}

func RegisterLeadRoutes(router *gin.RouterGroup, handler *Handler) {
	router.Use(middleware.AuthMiddleware(), middleware.ScopeFilter())
	router.POST("", handler.Create)
	router.GET("", handler.List)
	router.GET("/:id", handler.Profile)
	router.PUT("/:id", handler.Update)
	router.PATCH("/:id/stage", handler.AdvanceStage)
	router.POST("/:id/activities", handler.CreateActivity)
	router.GET("/:id/activities", handler.ListActivities)
	router.POST("/:id/contacts", handler.CreateContact)
}
