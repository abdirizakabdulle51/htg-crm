package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

const UserContextKey = "user"

type ContextKey struct{}

type UserContext struct {
	ID                uuid.UUID   `json:"sub"`
	KeycloakSubject   uuid.UUID   `json:"keycloak_subject"`
	Email             string      `json:"email"`
	PreferredUsername string      `json:"preferred_username"`
	Role              string      `json:"role"`
	CountryOfficeID   uuid.UUID   `json:"country_office_id"`
	Regions           []uuid.UUID `json:"regions"`
	Sectors           []uuid.UUID `json:"sectors"`
}

type cachedJWKS struct {
	set       jwk.Set
	fetchedAt time.Time
}

type KeycloakValidator struct {
	keycloakURL string
	realm       string
	issuer      string
	jwksURL     string
	audience    string
	cache       sync.Map
}

func NewKeycloakValidator(keycloakURL, realm, audience string) *KeycloakValidator {
	keycloakURL = strings.TrimRight(keycloakURL, "/")
	issuer := fmt.Sprintf("%s/realms/%s", keycloakURL, realm)
	return &KeycloakValidator{
		keycloakURL: keycloakURL,
		realm:       realm,
		issuer:      issuer,
		jwksURL:     fmt.Sprintf("%s/protocol/openid-connect/certs", issuer),
		audience:    audience,
	}
}

func NewKeycloakValidatorWithIssuer(keycloakURL, realm, issuer, jwksURL, audience string) *KeycloakValidator {
	validator := NewKeycloakValidator(keycloakURL, realm, audience)
	if strings.TrimSpace(issuer) != "" {
		validator.issuer = strings.TrimRight(strings.TrimSpace(issuer), "/")
	}
	if strings.TrimSpace(jwksURL) != "" {
		validator.jwksURL = strings.TrimSpace(jwksURL)
	} else {
		validator.jwksURL = fmt.Sprintf("%s/protocol/openid-connect/certs", validator.issuer)
	}
	return validator
}

func (v *KeycloakValidator) Validate(ctx context.Context, bearerToken string) (UserContext, error) {
	rawToken, err := bearerValue(bearerToken)
	if err != nil {
		return UserContext{}, err
	}

	token, err := v.parseToken(ctx, rawToken, false)
	if err != nil {
		token, err = v.parseToken(ctx, rawToken, true)
	}
	if err != nil {
		return UserContext{}, err
	}

	return userFromToken(token)
}

func (v *KeycloakValidator) parseToken(ctx context.Context, rawToken string, refreshKeys bool) (jwt.Token, error) {
	keySet, err := v.fetchJWKS(ctx, refreshKeys)
	if err != nil {
		return nil, err
	}

	parseOptions := []jwt.ParseOption{
		jwt.WithKeySet(keySet),
		jwt.WithValidate(true),
		jwt.WithIssuer(v.issuer),
	}
	if v.audience != "" {
		parseOptions = append(parseOptions, jwt.WithAudience(v.audience))
	}

	return jwt.Parse(
		[]byte(rawToken),
		parseOptions...,
	)
}

func (v *KeycloakValidator) JWKSURL() string {
	return v.jwksURL
}

func (v *KeycloakValidator) ExpectedIssuer() string {
	return v.issuer
}

func (v *KeycloakValidator) TokenIssuerAndKeyID(bearerToken string) (string, string) {
	rawToken, err := bearerValue(bearerToken)
	if err != nil {
		return "", ""
	}

	parts := strings.Split(rawToken, ".")
	if len(parts) < 2 {
		return "", ""
	}

	var header struct {
		KeyID string `json:"kid"`
	}
	_ = decodeJWTPart(parts[0], &header)

	var claims struct {
		Issuer string `json:"iss"`
	}
	_ = decodeJWTPart(parts[1], &claims)

	return claims.Issuer, header.KeyID
}

func (v *KeycloakValidator) fetchJWKS(ctx context.Context, forceRefresh bool) (jwk.Set, error) {
	cacheKey := v.JWKSURL()
	if !forceRefresh {
		if value, ok := v.cache.Load(cacheKey); ok {
			cached := value.(cachedJWKS)
			if time.Since(cached.fetchedAt) <= time.Hour {
				return cached.set, nil
			}
		}
	}

	if value, ok := v.cache.Load(cacheKey); ok {
		cached := value.(cachedJWKS)
		if !forceRefresh && time.Since(cached.fetchedAt) <= time.Hour {
			return cached.set, nil
		}
	}

	fetchCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	set, err := jwk.Fetch(fetchCtx, cacheKey)
	if err != nil {
		return nil, err
	}

	v.cache.Store(cacheKey, cachedJWKS{set: set, fetchedAt: time.Now()})
	return set, nil
}

func decodeJWTPart(part string, target any) error {
	decoded, err := base64.RawURLEncoding.DecodeString(part)
	if err != nil {
		return err
	}
	return json.Unmarshal(decoded, target)
}

func bearerValue(header string) (string, error) {
	if header == "" {
		return "", errors.New("missing authorization header")
	}

	value := strings.TrimSpace(header)
	token, found := strings.CutPrefix(value, "Bearer ")
	if !found || strings.TrimSpace(token) == "" {
		return "", errors.New("missing bearer token")
	}

	return strings.TrimSpace(token), nil
}

func userFromToken(token jwt.Token) (UserContext, error) {
	subject := token.Subject()
	if subject == "" {
		return UserContext{}, errors.New("token missing subject")
	}

	userID, err := uuid.Parse(subject)
	if err != nil {
		return UserContext{}, fmt.Errorf("invalid subject uuid: %w", err)
	}

	role, err := firstRealmRole(token)
	if err != nil {
		return UserContext{}, err
	}

	countryOfficeID, err := uuidClaim(token, "country_office_id")
	if err != nil {
		return UserContext{}, err
	}

	return UserContext{
		ID:                userID,
		KeycloakSubject:   userID,
		Email:             stringClaim(token, "email"),
		PreferredUsername: stringClaim(token, "preferred_username"),
		Role:              role,
		CountryOfficeID:   countryOfficeID,
		Regions:           uuidSliceClaim(token, "regions"),
		Sectors:           uuidSliceClaim(token, "sectors"),
	}, nil
}

func firstRealmRole(token jwt.Token) (string, error) {
	value, ok := token.Get("realm_access")
	if !ok {
		return "", errors.New("token missing realm roles")
	}

	realmAccess, ok := value.(map[string]any)
	if !ok {
		return "", errors.New("invalid realm_access claim")
	}

	rawRoles, ok := realmAccess["roles"].([]any)
	if ok && len(rawRoles) > 0 {
		role, ok := rawRoles[0].(string)
		if !ok || role == "" {
			return "", errors.New("invalid realm role")
		}
		return role, nil
	}

	stringRoles, ok := realmAccess["roles"].([]string)
	if !ok || len(stringRoles) == 0 {
		return "", errors.New("token has no realm roles")
	}

	return stringRoles[0], nil
}

func stringClaim(token jwt.Token, name string) string {
	value, ok := token.Get(name)
	if !ok {
		return ""
	}
	if typed, ok := value.(string); ok {
		return typed
	}
	return ""
}

func uuidClaim(token jwt.Token, name string) (uuid.UUID, error) {
	value := stringClaim(token, name)
	if value == "" {
		return uuid.Nil, nil
	}
	return uuid.Parse(value)
}

func uuidSliceClaim(token jwt.Token, name string) []uuid.UUID {
	value, ok := token.Get(name)
	if !ok {
		return nil
	}

	rawItems, ok := value.([]any)
	if ok {
		items := make([]uuid.UUID, 0, len(rawItems))
		for _, rawItem := range rawItems {
			item, ok := rawItem.(string)
			if !ok {
				continue
			}
			parsed, err := uuid.Parse(item)
			if err == nil {
				items = append(items, parsed)
			}
		}
		return items
	}

	stringItems, ok := value.([]string)
	if !ok {
		return nil
	}

	items := make([]uuid.UUID, 0, len(stringItems))
	for _, item := range stringItems {
		parsed, err := uuid.Parse(item)
		if err == nil {
			items = append(items, parsed)
		}
	}
	return items
}

func WithUserContext(ctx context.Context, user UserContext) context.Context {
	return context.WithValue(ctx, ContextKey{}, user)
}
