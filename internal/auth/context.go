package auth

import "github.com/gin-gonic/gin"

func CurrentUser(c *gin.Context) (UserContext, bool) {
	value, ok := c.Get(UserContextKey)
	if !ok {
		return UserContext{}, false
	}
	user, ok := value.(UserContext)
	return user, ok
}
