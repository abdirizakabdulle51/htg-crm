package huawei

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	httpClient *http.Client
	endpoint   string
	username   string
	password   string
	domainID   string
	token      string
}

type Config struct {
	// TODO: confirm with HCS administrator (Chen)
	Endpoint string
	// TODO: confirm with HCS administrator (Chen)
	Username string
	// TODO: confirm with HCS administrator (Chen)
	Password string
	// TODO: confirm with HCS administrator (Chen)
	DomainID string
}

func NewClient(cfg Config) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		endpoint:   strings.TrimRight(cfg.Endpoint, "/"),
		username:   cfg.Username,
		password:   cfg.Password,
		domainID:   cfg.DomainID,
	}
}

func (c *Client) Do(ctx context.Context, method, path string, body []byte) (*http.Response, error) {
	if c.token == "" {
		if err := c.authenticate(ctx); err != nil {
			return nil, err
		}
	}

	req, err := http.NewRequestWithContext(ctx, method, c.endpoint+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Auth-Token", c.token)
	return c.httpClient.Do(req)
}

func (c *Client) authenticate(ctx context.Context) error {
	payload := map[string]any{
		"auth": map[string]any{
			"identity": map[string]any{
				"methods": []string{"password"},
				"password": map[string]any{
					"user": map[string]any{
						// TODO: confirm with HCS administrator (Chen)
						"name": c.username,
						// TODO: confirm with HCS administrator (Chen)
						"password": c.password,
						// TODO: confirm with HCS administrator (Chen)
						"domain": map[string]string{"id": c.domainID},
					},
				},
			},
			"scope": map[string]any{
				// TODO: confirm with HCS administrator (Chen)
				"domain": map[string]string{"id": c.domainID},
			},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	// TODO: confirm with HCS administrator (Chen)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint+"/v3/auth/tokens", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	c.token = resp.Header.Get("X-Subject-Token")
	return nil
}
