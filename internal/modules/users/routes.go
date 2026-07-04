package users

import (
	"github.com/gin-gonic/gin"

	"github.com/htgclouds/crm-api/internal/middleware"
)

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	router.GET("/me", middleware.AuthMiddleware(), handler.Me)

	admin := router.Group("/admin")
	admin.Use(middleware.AuthMiddleware(), middleware.RequireRole(middleware.RoleAdmin, middleware.RoleHOB))

	admin.POST("/country-offices", handler.CreateCountryOffice)
	admin.GET("/country-offices", handler.ListCountryOffices)
	admin.PUT("/country-offices/:id", handler.UpdateCountryOffice)

	admin.POST("/regions", handler.CreateRegion)
	admin.GET("/regions", handler.ListRegions)

	admin.POST("/sectors", handler.CreateSector)
	admin.GET("/sectors", handler.ListSectors)

	admin.POST("/users", handler.CreateUser)
	admin.GET("/users", handler.ListUsers)
	admin.PUT("/users/:id", handler.UpdateUser)
	admin.PATCH("/users/:id/regions", handler.ReplaceUserRegions)
	admin.PATCH("/users/:id/sectors", handler.ReplaceUserSectors)
	admin.POST("/users/:id/deactivate", handler.DeactivateUser)
}
