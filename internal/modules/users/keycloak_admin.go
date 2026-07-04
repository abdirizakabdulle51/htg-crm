package users

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type KeycloakAdminClient struct {
	httpClient   *http.Client
	keycloakURL  string
	realm        string
	clientID     string
	clientSecret string
	mu           sync.Mutex
	token        string
	tokenExpiry  time.Time
}

type KeycloakCreateUserRequest struct {
	Email             string
	Name              string
	Role              string
	CountryOfficeID   uuid.UUID
	TemporaryPassword string
}

func NewKeycloakAdminClient(keycloakURL, realm, clientSecret string) *KeycloakAdminClient {
	return &KeycloakAdminClient{
		httpClient:   &http.Client{Timeout: 20 * time.Second},
		keycloakURL:  strings.TrimRight(keycloakURL, "/"),
		realm:        realm,
		clientID:     "crm-api",
		clientSecret: clientSecret,
	}
}

func (c *KeycloakAdminClient) CreateUser(ctx context.Context, req KeycloakCreateUserRequest) (string, error) {
	nameParts := strings.Fields(req.Name)
	firstName := req.Name
	lastName := ""
	if len(nameParts) > 0 {
		firstName = nameParts[0]
	}
	if len(nameParts) > 1 {
		lastName = strings.Join(nameParts[1:], " ")
	}

	body := map[string]any{
		"username":  req.Email,
		"email":     req.Email,
		"enabled":   true,
		"firstName": firstName,
		"lastName":  lastName,
		"credentials": []map[string]any{{
			"type":      "password",
			"value":     req.TemporaryPassword,
			"temporary": true,
		}},
		"attributes": map[string][]string{
			"country_office_id": []string{req.CountryOfficeID.String()},
			"role":              []string{req.Role},
		},
	}

	resp, err := c.doJSON(ctx, http.MethodPost, c.adminURL("/users"), body)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusNoContent {
		return "", responseError(resp)
	}

	location := resp.Header.Get("Location")
	if location == "" {
		return "", errors.New("keycloak did not return user location")
	}
	parts := strings.Split(strings.TrimRight(location, "/"), "/")
	return parts[len(parts)-1], nil
}

func (c *KeycloakAdminClient) AssignRealmRole(ctx context.Context, keycloakID, role string) error {
	roleResp, err := c.doJSON(ctx, http.MethodGet, c.adminURL("/roles/"+url.PathEscape(role)), nil)
	if err != nil {
		return err
	}
	defer roleResp.Body.Close()
	if roleResp.StatusCode != http.StatusOK {
		return responseError(roleResp)
	}

	var rolePayload map[string]any
	if err := json.NewDecoder(roleResp.Body).Decode(&rolePayload); err != nil {
		return err
	}

	resp, err := c.doJSON(ctx, http.MethodPost, c.adminURL("/users/"+url.PathEscape(keycloakID)+"/role-mappings/realm"), []map[string]any{rolePayload})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		return responseError(resp)
	}
	return nil
}

func (c *KeycloakAdminClient) DisableUser(ctx context.Context, keycloakID string) error {
	resp, err := c.doJSON(ctx, http.MethodPut, c.adminURL("/users/"+url.PathEscape(keycloakID)), map[string]any{"enabled": false})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		return responseError(resp)
	}
	return nil
}

func (c *KeycloakAdminClient) doJSON(ctx context.Context, method, endpoint string, payload any) (*http.Response, error) {
	token, err := c.adminToken(ctx)
	if err != nil {
		return nil, err
	}

	var body io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		body = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return c.httpClient.Do(req)
}

func (c *KeycloakAdminClient) adminToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" && time.Now().Before(c.tokenExpiry) {
		return c.token, nil
	}

	form := url.Values{}
	form.Set("grant_type", "client_credentials")
	form.Set("client_id", c.clientID)
	form.Set("client_secret", c.clientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.keycloakURL+"/realms/"+url.PathEscape(c.realm)+"/protocol/openid-connect/token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", responseError(resp)
	}

	var payload struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}
	if payload.AccessToken == "" {
		return "", errors.New("keycloak admin token response missing access_token")
	}

	c.token = payload.AccessToken
	expiresIn := payload.ExpiresIn - 30
	if expiresIn < 1 {
		expiresIn = payload.ExpiresIn
	}
	c.tokenExpiry = time.Now().Add(time.Duration(expiresIn) * time.Second)
	return c.token, nil
}

func (c *KeycloakAdminClient) adminURL(path string) string {
	return c.keycloakURL + "/admin/realms/" + url.PathEscape(c.realm) + path
}

func responseError(resp *http.Response) error {
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	return fmt.Errorf("keycloak returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
}
