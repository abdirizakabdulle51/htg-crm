package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/response"
)

func RateLimit(redisClient *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := "anonymous"
		if user, ok := auth.CurrentUser(c); ok && user.ID.String() != "" {
			key = user.ID.String()
		}

		redisKey := "ratelimit:" + key
		count, err := redisClient.Incr(c.Request.Context(), redisKey).Result()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Rate limiter unavailable")
			c.Abort()
			return
		}
		if count == 1 {
			redisClient.Expire(c.Request.Context(), redisKey, time.Minute)
		}
		if count > 100 {
			response.Error(c, http.StatusTooManyRequests, "RATE_LIMITED", "Rate limit exceeded")
			c.Abort()
			return
		}

		c.Next()
	}
}
