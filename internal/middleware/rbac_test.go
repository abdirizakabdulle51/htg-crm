package middleware

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	jwtv5 "github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwk"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/response"
)

type testJWKS struct {
	privateKey *rsa.PrivateKey
	keyID      string
	issuer     string
	audience   string
	server     *httptest.Server
}

func newTestJWKS(t *testing.T) *testJWKS {
	t.Helper()

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate RSA key: %v", err)
	}

	key, err := jwk.FromRaw(&privateKey.PublicKey)
	if err != nil {
		t.Fatalf("build JWK: %v", err)
	}
	keyID := "test-key"
	if err := key.Set(jwk.KeyIDKey, keyID); err != nil {
		t.Fatalf("set key id: %v", err)
	}
	if err := key.Set(jwk.AlgorithmKey, jwa.RS256); err != nil {
		t.Fatalf("set key algorithm: %v", err)
	}

	set := jwk.NewSet()
	if err := set.AddKey(key); err != nil {
		t.Fatalf("add key: %v", err)
	}
	body, err := json.Marshal(set)
	if err != nil {
		t.Fatalf("marshal jwks: %v", err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	}))

	return &testJWKS{
		privateKey: privateKey,
		keyID:      keyID,
		issuer:     server.URL + "/realms/htg-crm",
		audience:   "crm-api",
		server:     server,
	}
}

func (j *testJWKS) token(t *testing.T, role string, expiresAt time.Time) string {
	t.Helper()

	userID := uuid.New()
	countryID := uuid.New()
	claims := jwtv5.MapClaims{
		"sub":               userID.String(),
		"email":             "user@test.com",
		"iss":               j.issuer,
		"aud":               j.audience,
		"iat":               time.Now().Add(-time.Minute).Unix(),
		"exp":               expiresAt.Unix(),
		"country_office_id": countryID.String(),
		"realm_access": map[string]any{
			"roles": []string{role},
		},
	}

	token := jwtv5.NewWithClaims(jwtv5.SigningMethodRS256, claims)
	token.Header["kid"] = j.keyID
	signed, err := token.SignedString(j.privateKey)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return signed
}

func TestRequireRoleMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwks := newTestJWKS(t)
	defer jwks.server.Close()
	SetKeycloakValidator(auth.NewKeycloakValidator(jwks.server.URL, "htg-crm", jwks.audience))

	validHOB := "Bearer " + jwks.token(t, RoleHOB, time.Now().Add(time.Hour))
	validAM := "Bearer " + jwks.token(t, RoleAccountManager, time.Now().Add(time.Hour))
	expiredHOB := "Bearer " + jwks.token(t, RoleHOB, time.Now().Add(-time.Hour))

	tests := []struct {
		name           string
		authorization  string
		expectedStatus int
		expectedCode   string
	}{
		{name: "am_requesting_hob_only_endpoint", authorization: validAM, expectedStatus: http.StatusForbidden, expectedCode: response.CodeForbidden},
		{name: "hob_requesting_same", authorization: validHOB, expectedStatus: http.StatusOK},
		{name: "missing_authorization_header", expectedStatus: http.StatusUnauthorized, expectedCode: response.CodeUnauthorized},
		{name: "malformed_jwt", authorization: "Bearer not-a-jwt", expectedStatus: http.StatusUnauthorized, expectedCode: response.CodeUnauthorized},
		{name: "expired_jwt", authorization: expiredHOB, expectedStatus: http.StatusUnauthorized, expectedCode: response.CodeUnauthorized},
		{name: "valid_jwt_wrong_role", authorization: validAM, expectedStatus: http.StatusForbidden, expectedCode: response.CodeForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.GET("/hob-only", AuthMiddleware(), RequireRole(RoleHOB), func(c *gin.Context) {
				response.Success(c, gin.H{"ok": true})
			})

			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/hob-only", nil)
			if tt.authorization != "" {
				request.Header.Set("Authorization", tt.authorization)
			}

			router.ServeHTTP(recorder, request)

			if recorder.Code != tt.expectedStatus {
				t.Fatalf("status = %d, want %d, body = %s", recorder.Code, tt.expectedStatus, recorder.Body.String())
			}
			if tt.expectedCode == "" {
				return
			}

			var body struct {
				Error *struct {
					Code string `json:"code"`
				} `json:"error"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
				t.Fatalf("unmarshal response: %v", err)
			}
			if body.Error == nil || body.Error.Code != tt.expectedCode {
				t.Fatalf("error code = %#v, want %s", body.Error, tt.expectedCode)
			}
		})
	}
}
