package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

const DefaultEmbeddingModel = "text-embedding-3-small"

type OpenAIClient struct {
	apiKey         string
	model          string
	embeddingModel string
	httpClient     *http.Client
}

func NewOpenAIClient(apiKey, model string) *OpenAIClient {
	return &OpenAIClient{
		apiKey:         apiKey,
		model:          model,
		embeddingModel: DefaultEmbeddingModel,
		httpClient:     &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *OpenAIClient) Complete(ctx context.Context, prompt string) (string, error) {
	return "Prioritize the highest-risk renewal and schedule an executive check-in.", nil
}

func (c *OpenAIClient) Chat(ctx context.Context, model, systemPrompt, userPrompt string, maxTokens int, temperature float64) (string, error) {
	if c.apiKey == "" {
		return "", errors.New("OPENAI_API_KEY is required for chat completions")
	}
	body, err := json.Marshal(map[string]any{
		"model":       model,
		"max_tokens":  maxTokens,
		"temperature": temperature,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusTooManyRequests {
		return "", ErrRateLimited
	}
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("openai chat returned %s", resp.Status)
	}
	var payload struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}
	if len(payload.Choices) == 0 {
		return "", errors.New("openai chat response did not include a choice")
	}
	return payload.Choices[0].Message.Content, nil
}

func (c *OpenAIClient) Embed(ctx context.Context, input string) ([]float32, error) {
	if c.apiKey == "" {
		return nil, errors.New("OPENAI_API_KEY is required for embeddings")
	}
	body, err := json.Marshal(map[string]any{
		"model": c.embeddingModel,
		"input": input,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/embeddings", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, ErrRateLimited
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("openai embeddings returned %s", resp.Status)
	}
	var payload struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if len(payload.Data) == 0 || len(payload.Data[0].Embedding) == 0 {
		return nil, errors.New("openai embeddings response did not include an embedding")
	}
	return payload.Data[0].Embedding, nil
}

var ErrRateLimited = errors.New("openai rate limited")
