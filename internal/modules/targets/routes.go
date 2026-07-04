package targets

import (
	"github.com/gin-gonic/gin"

	"github.com/htgclouds/crm-api/internal/middleware"
)

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	router.POST("/annual", middleware.AuthMiddleware(), middleware.RequireRole(middleware.RoleCountryGM, middleware.RoleHOB, middleware.RoleCEO), handler.Create)
	router.GET("/mine", middleware.AuthMiddleware(), handler.Mine)
	router.GET("/health", middleware.AuthMiddleware(), handler.MyHealth)
	router.GET("/health/:user_id", middleware.AuthMiddleware(), middleware.RequireRole(middleware.RoleCountryGM, middleware.RoleHOB, middleware.RoleCEO), handler.UserHealth)
	router.GET("/team", middleware.AuthMiddleware(), middleware.RequireRole(middleware.RoleCountryGM, middleware.RoleHOB, middleware.RoleCEO), handler.Team)
	router.GET("/achievements/:user_id/:year", middleware.AuthMiddleware(), middleware.RequireRole(middleware.RoleCountryGM, middleware.RoleHOB, middleware.RoleCEO), handler.Achievements)
	router.PUT("/quarterly/:id", middleware.AuthMiddleware(), middleware.RequireRole(middleware.RoleCountryGM, middleware.RoleHOB, middleware.RoleCEO), handler.UpdateQuarter)
	router.GET("/:user_id/:year", middleware.AuthMiddleware(), handler.GetUserYear)
}
