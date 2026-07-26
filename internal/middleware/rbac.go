package middleware

import (
	"bytes"
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/response"
)

const (
	RoleAccountManager = "ACCOUNT_MANAGER"
	RoleCountryGM      = "COUNTRY_GM"
	RoleHOB            = "HEAD_OF_BUSINESS"
	RoleCEO            = "CEO"
	RoleAdmin          = "ADMIN"
)

type filterUserIDKey struct{}
type filterCountryIDKey struct{}

var (
	keycloakValidator *auth.KeycloakValidator
	userResolver      UserResolverFunc
	auditPool         *pgxpool.Pool
	auditLogger       zerolog.Logger
)

type UserResolverFunc func(ctx context.Context, keycloakID uuid.UUID) (auth.UserContext, bool, error)

func SetKeycloakValidator(validator *auth.KeycloakValidator) {
	keycloakValidator = validator
}

func SetUserResolver(resolver UserResolverFunc) {
	userResolver = resolver
}

func SetAuditStore(pool *pgxpool.Pool, logger zerolog.Logger) {
	auditPool = pool
	auditLogger = logger
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if keycloakValidator == nil {
			response.Error(c, http.StatusInternalServerError, response.CodeInternalError, "Auth validator is not configured")
			c.Abort()
			return
		}

		userCtx, err := keycloakValidator.Validate(c.Request.Context(), c.GetHeader("Authorization"))
		if err != nil {
			tokenIssuer, keyID := keycloakValidator.TokenIssuerAndKeyID(c.GetHeader("Authorization"))
			log.Error().
				Err(err).
				Str("expected_iss", keycloakValidator.ExpectedIssuer()).
				Str("token_iss", tokenIssuer).
				Str("jwks_url", keycloakValidator.JWKSURL()).
				Str("kid", keyID).
				Msg("jwt validation failed")
			response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "No valid JWT")
			c.Abort()
			return
		}

		if userResolver != nil {
			keycloakID := userCtx.KeycloakSubject
			if keycloakID == uuid.Nil {
				keycloakID = userCtx.ID
			}

			resolvedUser, active, err := userResolver(c.Request.Context(), keycloakID)
			if err != nil {
				response.Error(c, http.StatusUnauthorized, response.CodeUnauthorized, "No valid JWT")
				c.Abort()
				return
			}
			if !active {
				response.Error(c, http.StatusForbidden, response.CodeForbidden, "CRM user is inactive")
				c.Abort()
				return
			}
			if resolvedUser.KeycloakSubject == uuid.Nil {
				resolvedUser.KeycloakSubject = keycloakID
			}
			userCtx = resolvedUser
		}

		c.Set(auth.UserContextKey, userCtx)
		c.Request = c.Request.WithContext(auth.WithUserContext(c.Request.Context(), userCtx))
		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	required := map[string]struct{}{}
	for _, role := range roles {
		required[role] = struct{}{}
	}

	return func(c *gin.Context) {
		user := c.MustGet(auth.UserContextKey).(auth.UserContext)
		if _, ok := required[user.Role]; ok {
			c.Next()
			return
		}

		response.Error(c, http.StatusForbidden, response.CodeForbidden, "Valid JWT but insufficient role")
		c.Abort()
	}
}

func ScopeFilter() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.MustGet(auth.UserContextKey).(auth.UserContext)

		switch user.Role {
		case RoleAccountManager:
			c.Set("filter_user_id", user.ID)
			c.Request = c.Request.WithContext(context.WithValue(c.Request.Context(), filterUserIDKey{}, user.ID))
		case RoleCountryGM:
			c.Set("filter_country_id", user.CountryOfficeID)
			c.Request = c.Request.WithContext(context.WithValue(c.Request.Context(), filterCountryIDKey{}, user.CountryOfficeID))
		}

		c.Next()
	}
}

func FilterUserID(ctx context.Context) (uuid.UUID, bool) {
	value, ok := ctx.Value(filterUserIDKey{}).(uuid.UUID)
	return value, ok
}

func FilterCountryID(ctx context.Context) (uuid.UUID, bool) {
	value, ok := ctx.Value(filterCountryIDKey{}).(uuid.UUID)
	return value, ok
}

func AuditMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		recorder := &bodyRecorder{
			ResponseWriter: c.Writer,
			body:           bytes.NewBuffer(nil),
		}
		c.Writer = recorder

		c.Next()

		if !shouldAudit(c.Request.Method, c.Writer.Status()) {
			return
		}

		user, ok := auth.CurrentUser(c)
		if !ok || auditPool == nil {
			return
		}

		event := auditEvent{
			UserID:       user.ID,
			Action:       c.Request.Method + " " + c.Request.URL.Path,
			EntityType:   entityType(c.Request.URL.Path),
			EntityID:     entityID(c),
			PayloadAfter: truncate(recorder.body.Bytes(), 32*1024),
			CreatedAt:    time.Now().UTC(),
		}

		go writeAudit(event)
	}
}

type bodyRecorder struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *bodyRecorder) Write(data []byte) (int, error) {
	_, _ = w.body.Write(data)
	return w.ResponseWriter.Write(data)
}

type auditEvent struct {
	UserID       uuid.UUID
	Action       string
	EntityType   string
	EntityID     uuid.UUID
	PayloadAfter []byte
	CreatedAt    time.Time
}

func shouldAudit(method string, status int) bool {
	if status < 200 || status >= 300 {
		return false
	}
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

func entityType(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for _, part := range parts {
		if part == "" || part == "api" || part == "v1" {
			continue
		}
		return part
	}
	return "unknown"
}

func entityID(c *gin.Context) uuid.UUID {
	for _, name := range []string{"id", "tenant_id", "lead_id"} {
		if value := c.Param(name); value != "" {
			parsed, err := uuid.Parse(value)
			if err == nil {
				return parsed
			}
		}
	}
	return uuid.Nil
}

func truncate(body []byte, limit int) []byte {
	if len(body) <= limit {
		return body
	}
	return body[:limit]
}

func writeAudit(event auditEvent) {
	ctx := auth.WithUserContext(context.Background(), auth.UserContext{ID: event.UserID, Role: RoleAdmin})

	_, err := auditPool.Exec(
		ctx,
		`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, payload_after, created_at)
		VALUES ($1, $2, $3, NULLIF($4, $5)::uuid, $6, $7)`,
		event.UserID,
		event.Action,
		event.EntityType,
		event.EntityID.String(),
		uuid.Nil.String(),
		string(event.PayloadAfter),
		event.CreatedAt,
	)
	if err != nil {
		auditLogger.Error().Err(err).Msg("write_audit_log")
	}
}
