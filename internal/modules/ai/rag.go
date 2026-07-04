package ai

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

const DefaultTopK = 8

type RAGStore struct {
	db     *pgxpool.Pool
	client *OpenAIClient
}

func NewRAGStore(db *pgxpool.Pool, client *OpenAIClient) *RAGStore {
	return &RAGStore{db: db, client: client}
}

func (s *RAGStore) Retrieve(ctx context.Context, query string) ([]string, error) {
	return s.RetrieveContext(ctx, query, DefaultTopK)
}

func (s *RAGStore) RetrieveContext(ctx context.Context, query string, topK int) ([]string, error) {
	if topK <= 0 {
		topK = DefaultTopK
	}
	embedding, err := s.client.Embed(ctx, query)
	if err != nil {
		return nil, err
	}
	vector := vectorLiteral(embedding)
	rows, err := s.db.Query(ctx, `
		SELECT chunk_text, 1 - (embedding <=> $1::vector) AS similarity
		FROM tenant_embeddings
		ORDER BY embedding <=> $1::vector
		LIMIT $2`, vector, topK)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	contexts := []string{}
	for rows.Next() {
		var chunk string
		var similarity float64
		if err := rows.Scan(&chunk, &similarity); err != nil {
			return nil, err
		}
		contexts = append(contexts, chunk)
	}
	return contexts, rows.Err()
}

func vectorLiteral(values []float32) string {
	parts := make([]string, 0, len(values))
	for _, value := range values {
		parts = append(parts, fmt.Sprintf("%f", value))
	}
	return "[" + strings.Join(parts, ",") + "]"
}
