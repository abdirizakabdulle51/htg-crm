package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/htgclouds/crm-api/internal/auth"
)

const discoverySystemPrompt = "You are a B2B market intelligence analyst specializing in East African cloud markets. HTG Clouds is a Huawei Cloud partner serving organizations in Somalia, Kenya, Ethiopia, and Djibouti. Your job is to suggest potential cloud customers in a specific sector and country. Base suggestions on known organizations in these markets. Be specific and realistic. Return valid JSON only."

var ErrDiscoveryValidation = errors.New("discovery validation failed")

type DiscoverLeadsRequest struct {
	SectorID  uuid.UUID `json:"sector_id" binding:"required"`
	CountryID uuid.UUID `json:"country_id" binding:"required"`
	Context   string    `json:"context"`
}

type DiscoveryResponse struct {
	Sector    string              `json:"sector"`
	Country   string              `json:"country"`
	Prospects []DiscoveryProspect `json:"prospects"`
}

type DiscoveryProspect struct {
	CompanyName              string   `json:"company_name"`
	Description              string   `json:"description"`
	WhyGoodFit               string   `json:"why_good_fit"`
	RecommendedServices      []string `json:"recommended_services"`
	EstimatedMonthlyValueUSD float64  `json:"estimated_monthly_value_usd"`
	ApproachStrategy         string   `json:"approach_strategy"`
	PotentialContacts        string   `json:"potential_contacts"`
	Confidence               string   `json:"confidence"`
}

type discoveryMarket struct {
	SectorName        string
	SectorDescription string
	CountryName       string
	ExistingNames     []string
}

func (s *Service) DiscoverLeads(ctx context.Context, user auth.UserContext, req DiscoverLeadsRequest) (DiscoveryResponse, error) {
	if len([]rune(req.Context)) > 500 {
		return DiscoveryResponse{}, fmt.Errorf("%w: context must be 500 characters or fewer", ErrDiscoveryValidation)
	}
	cacheKey := fmt.Sprintf("htgcrm:discovery:%s:%s", req.SectorID.String(), req.CountryID.String())
	if s.redis != nil {
		if raw, err := s.redis.Get(ctx, cacheKey).Bytes(); err == nil && len(raw) > 0 {
			var cached DiscoveryResponse
			if json.Unmarshal(raw, &cached) == nil {
				return cached, nil
			}
		}
	}

	market, err := s.discoveryMarket(ctx, req.SectorID, req.CountryID)
	if err != nil {
		return DiscoveryResponse{}, err
	}
	prompt := buildDiscoveryPrompt(market, req.Context)
	raw, err := s.client.Chat(ctx, "gpt-4o", discoverySystemPrompt, prompt, 800, 0.7)
	if err != nil {
		return DiscoveryResponse{}, err
	}
	result, err := parseDiscoveryResponse(raw)
	if err != nil {
		return DiscoveryResponse{}, err
	}
	if result.Sector == "" {
		result.Sector = market.SectorName
	}
	if result.Country == "" {
		result.Country = market.CountryName
	}
	if s.redis != nil {
		if body, err := json.Marshal(result); err == nil {
			_ = s.redis.Set(ctx, cacheKey, body, 24*time.Hour).Err()
		}
	}
	_ = s.logDiscoveryActivity(ctx, user.ID, market, req.Context, result)
	return result, nil
}

func (s *Service) discoveryMarket(ctx context.Context, sectorID, countryID uuid.UUID) (discoveryMarket, error) {
	market := discoveryMarket{}
	if err := s.db.QueryRow(ctx, `SELECT name, COALESCE(description, '') FROM sectors WHERE id = $1 AND is_active = TRUE`, sectorID).Scan(&market.SectorName, &market.SectorDescription); err != nil {
		return market, fmt.Errorf("%w: sector_id does not exist", ErrDiscoveryValidation)
	}
	if err := s.db.QueryRow(ctx, `SELECT name FROM country_offices WHERE id = $1 AND is_active = TRUE`, countryID).Scan(&market.CountryName); err != nil {
		return market, fmt.Errorf("%w: country_id does not exist", ErrDiscoveryValidation)
	}
	names := []string{}
	rows, err := s.db.Query(ctx, `SELECT company_name FROM leads WHERE sector_id = $1 AND country_id = $2`, sectorID, countryID)
	if err != nil {
		return market, err
	}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			rows.Close()
			return market, err
		}
		names = append(names, name)
	}
	rows.Close()
	rows, err = s.db.Query(ctx, `SELECT name FROM tenants WHERE sector_id = $1 AND country_id = $2`, sectorID, countryID)
	if err != nil {
		return market, err
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return market, err
		}
		names = append(names, name)
	}
	market.ExistingNames = names
	return market, rows.Err()
}

func buildDiscoveryPrompt(market discoveryMarket, contextText string) string {
	existing := "none"
	if len(market.ExistingNames) > 0 {
		existing = strings.Join(market.ExistingNames, ", ")
	}
	contextText = strings.TrimSpace(contextText)
	if contextText == "" {
		contextText = "none"
	}
	return fmt.Sprintf(`Find potential cloud customers in this market:
Country: %s
Sector: %s - %s
Already in our pipeline or as customers: %s
Additional context from AM: %s
Suggest 5-8 specific organizations that would benefit from Huawei Cloud services.
For each, explain why they are a good fit, what services they likely need,
and how the AM should approach them.`, market.CountryName, market.SectorName, market.SectorDescription, existing, contextText)
}

func parseDiscoveryResponse(raw string) (DiscoveryResponse, error) {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)
	var result DiscoveryResponse
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return DiscoveryResponse{}, err
	}
	if len(result.Prospects) == 0 {
		return DiscoveryResponse{}, errors.New("discovery response did not include prospects")
	}
	return result, nil
}

func (s *Service) logDiscoveryActivity(ctx context.Context, userID uuid.UUID, market discoveryMarket, contextText string, result DiscoveryResponse) error {
	body, _ := json.Marshal(map[string]any{
		"sector":         market.SectorName,
		"country":        market.CountryName,
		"context":        contextText,
		"prospect_count": len(result.Prospects),
	})
	_, err := s.db.Exec(ctx, `
		INSERT INTO activities (user_id, type, status, subject, body, occurred_at)
		VALUES ($1, 'COACHING'::activity_type, 'COMPLETED'::activity_status, $2, $3, NOW())`,
		userID, "AI lead discovery", string(body))
	return err
}
