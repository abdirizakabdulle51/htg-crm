package auth

import (
	"context"
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
	ID              uuid.UUID   `json:"sub"`
	Email           string      `json:"email"`
	Role            string      `json:"role"`
	CountryOfficeID uuid.UUID   `json:"country_office_id"`
	Regions         []uuid.UUID `json:"regions"`
	Sectors         []uuid.UUID `json:"sectors"`
}

type cachedJWKS struct {
	set       jwk.Set
	fetchedAt time.Time
}

type KeycloakValidator struct {
	keycloakURL string
	realm       string
	audience    string
	cache       sync.Map
}

func NewKeycloakValidator(keycloakURL, realm, audience string) *KeycloakValidator {
	return &KeycloakValidator{
		keycloakURL: strings.TrimRight(keycloakURL, "/"),
		realm:       realm,
		audience:    audience,
	}
}

func (v *KeycloakValidator) Validate(ctx context.Context, bearerToken string) (UserContext, error) {
	rawToken, err := bearerValue(bearerToken)
	if err != nil {
		return UserContext{}, err
	}

	keySet, err := v.fetchJWKS(ctx)
	if err != nil {
		return UserContext{}, err
	}

	issuer := fmt.Sprintf("%s/realms/%s", v.keycloakURL, v.realm)
	parseOptions := []jwt.ParseOption{
		jwt.WithKeySet(keySet),
		jwt.WithValidate(true),
		jwt.WithIssuer(issuer),
	}
	if v.audience != "" {
		parseOptions = append(parseOptions, jwt.WithAudience(v.audience))
	}

	token, err := jwt.Parse(
		[]byte(rawToken),
		parseOptions...,
	)
	if err != nil {
		return UserContext{}, err
	}

	return userFromToken(token)
}

func (v *KeycloakValidator) JWKSURL() string {
	return fmt.Sprintf("%s/realms/%s/protocol/openid-connect/certs", v.keycloakURL, v.realm)
}

func (v *KeycloakValidator) fetchJWKS(ctx context.Context) (jwk.Set, error) {
	cacheKey := v.JWKSURL()
	if value, ok := v.cache.Load(cacheKey); ok {
		cached := value.(cachedJWKS)
		if time.Since(cached.fetchedAt) <= time.Hour {
			return cached.set, nil
		}
	}

	set, err := jwk.Fetch(ctx, cacheKey)
	if err != nil {
		return nil, err
	}

	v.cache.Store(cacheKey, cachedJWKS{set: set, fetchedAt: time.Now()})
	return set, nil
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
		ID:              userID,
		Email:           stringClaim(token, "email"),
		Role:            role,
		CountryOfficeID: countryOfficeID,
		Regions:         uuidSliceClaim(token, "regions"),
		Sectors:         uuidSliceClaim(token, "sectors"),
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
