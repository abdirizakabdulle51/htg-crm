package workers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rabbitmq/amqp091-go"
	"github.com/rs/zerolog"
	"golang.org/x/sync/errgroup"

	"github.com/htgclouds/crm-api/internal/modules/ai"
)

const (
	embeddingQueue       = "htgcrm.ai.embedding_refresh"
	embeddingConcurrency = 20
	maxChunkRunes        = 2000
)

type EmbeddingWorker struct {
	postgres   *pgxpool.Pool
	clickhouse clickhouse.Conn
	amqpURL    string
	openai     *ai.OpenAIClient
	logger     zerolog.Logger
}

type EmbeddingWorkerConfig struct {
	AMQPURL string
}

type embeddingMessage struct {
	EntityType string    `json:"entity_type"`
	EntityID   uuid.UUID `json:"entity_id"`
}

type tenantChunk struct {
	TenantID   uuid.UUID
	SourceType string
	SourceID   *uuid.UUID
	Text       string
	Hash       string
}

func NewEmbeddingWorker(postgres *pgxpool.Pool, clickhouseConn clickhouse.Conn, openaiClient *ai.OpenAIClient, logger zerolog.Logger, cfg EmbeddingWorkerConfig) *EmbeddingWorker {
	return &EmbeddingWorker{
		postgres:   postgres,
		clickhouse: clickhouseConn,
		openai:     openaiClient,
		logger:     logger,
		amqpURL:    cfg.AMQPURL,
	}
}

func StartEmbeddingRefresh(ctx context.Context, logger zerolog.Logger, workers ...*EmbeddingWorker) {
	if len(workers) == 0 || workers[0] == nil {
		go runEvery(ctx, logger, "embedding_refresh", time.Hour)
		return
	}
	go workers[0].Consume(ctx)
}

func (w *EmbeddingWorker) Consume(ctx context.Context) {
	if w.amqpURL == "" {
		w.logger.Warn().Msg("embedding_refresh_amqp_url_missing")
		return
	}
	go w.consumeNightlySyncComplete(ctx)
	conn, err := amqp091.Dial(w.amqpURL)
	if err != nil {
		w.logger.Error().Err(err).Msg("embedding_refresh_connect_failed")
		return
	}
	defer conn.Close()
	ch, err := conn.Channel()
	if err != nil {
		w.logger.Error().Err(err).Msg("embedding_refresh_channel_failed")
		return
	}
	defer ch.Close()
	q, err := ch.QueueDeclare(embeddingQueue, true, false, false, false, nil)
	if err != nil {
		w.logger.Error().Err(err).Msg("embedding_refresh_queue_declare_failed")
		return
	}
	deliveries, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		w.logger.Error().Err(err).Msg("embedding_refresh_consume_failed")
		return
	}
	for {
		select {
		case <-ctx.Done():
			return
		case delivery, ok := <-deliveries:
			if !ok {
				return
			}
			var msg embeddingMessage
			if err := json.Unmarshal(delivery.Body, &msg); err != nil {
				w.logger.Error().Err(err).Msg("embedding_refresh_bad_message")
				_ = delivery.Nack(false, false)
				continue
			}
			if msg.EntityType == "tenant" {
				err = w.RefreshTenant(ctx, msg.EntityID)
			} else {
				err = fmt.Errorf("unsupported embedding entity_type %q", msg.EntityType)
			}
			if err != nil {
				w.logger.Error().Err(err).Str("entity_id", msg.EntityID.String()).Msg("embedding_refresh_failed")
				_ = delivery.Nack(false, true)
				continue
			}
			_ = delivery.Ack(false)
		}
	}
}

func (w *EmbeddingWorker) consumeNightlySyncComplete(ctx context.Context) {
	conn, err := amqp091.Dial(w.amqpURL)
	if err != nil {
		w.logger.Error().Err(err).Msg("nightly_sync_complete_connect_failed")
		return
	}
	defer conn.Close()
	ch, err := conn.Channel()
	if err != nil {
		w.logger.Error().Err(err).Msg("nightly_sync_complete_channel_failed")
		return
	}
	defer ch.Close()
	q, err := ch.QueueDeclare(nightlySyncQueue, true, false, false, false, nil)
	if err != nil {
		w.logger.Error().Err(err).Msg("nightly_sync_complete_queue_declare_failed")
		return
	}
	deliveries, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		w.logger.Error().Err(err).Msg("nightly_sync_complete_consume_failed")
		return
	}
	for {
		select {
		case <-ctx.Done():
			return
		case delivery, ok := <-deliveries:
			if !ok {
				return
			}
			if err := w.RefreshAllTenants(ctx); err != nil {
				w.logger.Error().Err(err).Msg("nightly_embedding_refresh_failed")
				_ = delivery.Nack(false, true)
				continue
			}
			_ = delivery.Ack(false)
		}
	}
}

func (w *EmbeddingWorker) RefreshAllTenants(ctx context.Context) error {
	rows, err := w.postgres.Query(ctx, `SELECT id FROM tenants WHERE status IN ('ACTIVE'::tenant_status, 'AT_RISK'::tenant_status, 'PROSPECT'::tenant_status)`)
	if err != nil {
		return err
	}
	defer rows.Close()
	ids := []uuid.UUID{}
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	group, groupCtx := errgroup.WithContext(ctx)
	group.SetLimit(embeddingConcurrency)
	for _, id := range ids {
		id := id
		group.Go(func() error {
			return w.RefreshTenant(groupCtx, id)
		})
	}
	return group.Wait()
}

func (w *EmbeddingWorker) RefreshTenant(ctx context.Context, tenantID uuid.UUID) error {
	chunks, err := w.buildTenantChunks(ctx, tenantID)
	if err != nil {
		return err
	}
	group, groupCtx := errgroup.WithContext(ctx)
	group.SetLimit(embeddingConcurrency)
	for _, chunk := range chunks {
		chunk := chunk
		group.Go(func() error {
			exists, err := w.embeddingExists(groupCtx, chunk.TenantID, chunk.Hash)
			if err != nil || exists {
				return err
			}
			vector, err := embedWithRetry(groupCtx, w.openai, chunk.Text)
			if err != nil {
				return err
			}
			return w.upsertEmbedding(groupCtx, chunk, vector)
		})
	}
	return group.Wait()
}

func (w *EmbeddingWorker) buildTenantChunks(ctx context.Context, tenantID uuid.UUID) ([]tenantChunk, error) {
	profile, err := w.profileChunk(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	usage, err := w.usageChunk(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	activities, err := w.activityChunk(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	contacts, err := w.contactChunk(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	raw := []struct {
		source string
		text   string
	}{
		{"tenant_profile", profile},
		{"usage_summary", usage},
		{"recent_activities", activities},
		{"contacts", contacts},
	}
	chunks := []tenantChunk{}
	for _, item := range raw {
		text := trimChunk(item.text)
		if strings.TrimSpace(text) == "" {
			continue
		}
		sum := sha256.Sum256([]byte(text))
		chunks = append(chunks, tenantChunk{
			TenantID:   tenantID,
			SourceType: item.source,
			Text:       text,
			Hash:       hex.EncodeToString(sum[:]),
		})
	}
	return chunks, nil
}

func (w *EmbeddingWorker) profileChunk(ctx context.Context, tenantID uuid.UUID) (string, error) {
	var name, sector, country, status, amName string
	var region, renewalDate *string
	var monthlyRevenue float64
	err := w.postgres.QueryRow(ctx, `
		SELECT t.name, s.name, r.name, c.name, u.full_name, t.status::text, t.mrr_usd, t.renewal_date::text
		FROM tenants t
		JOIN sectors s ON s.id = t.sector_id
		JOIN country_offices c ON c.id = t.country_id
		JOIN users u ON u.id = t.account_manager_id
		LEFT JOIN regions r ON r.id = t.region_id
		WHERE t.id = $1`, tenantID).
		Scan(&name, &sector, &region, &country, &amName, &status, &monthlyRevenue, &renewalDate)
	if err != nil {
		return "", err
	}
	services, err := w.activeServices(ctx, tenantID)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s is a %s company in %s, %s.\nAccount manager: %s. Status: %s.\nServices: %s.\nTotal monthly revenue: $%.2f.\nContract renewal: %s.",
		name, sector, strPtr(region, "unknown region"), country, amName, status, services, monthlyRevenue, strPtr(renewalDate, "not set")), nil
}

func (w *EmbeddingWorker) activeServices(ctx context.Context, tenantID uuid.UUID) (string, error) {
	rows, err := w.postgres.Query(ctx, `SELECT service_name, monthly_usd FROM tenant_services WHERE tenant_id = $1 AND status = 'ACTIVE'::service_status ORDER BY service_name`, tenantID)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	parts := []string{}
	for rows.Next() {
		var name string
		var monthly float64
		if err := rows.Scan(&name, &monthly); err != nil {
			return "", err
		}
		parts = append(parts, fmt.Sprintf("%s ($%.2f/month)", name, monthly))
	}
	if len(parts) == 0 {
		return "none", rows.Err()
	}
	return strings.Join(parts, ", "), rows.Err()
}

func (w *EmbeddingWorker) usageChunk(ctx context.Context, tenantID uuid.UUID) (string, error) {
	if w.clickhouse == nil {
		return "", nil
	}
	rows, err := w.clickhouse.Query(ctx, `
		SELECT service_type, metric_name, sum(total_value)
		FROM tenant_analytics.daily_usage_summary
		WHERE tenant_id = ? AND date >= today() - 30
		GROUP BY service_type, metric_name
		ORDER BY service_type, metric_name`, tenantID)
	if err != nil {
		return "", nil
	}
	defer rows.Close()
	parts := []string{}
	for rows.Next() {
		var serviceType, metricName string
		var value float64
		if err := rows.Scan(&serviceType, &metricName, &value); err != nil {
			return "", err
		}
		parts = append(parts, fmt.Sprintf("%s: %s: %.2f", serviceType, metricName, value))
	}
	previous, latest := 0.0, 0.0
	monthRows, err := w.clickhouse.Query(ctx, `
		SELECT total_billing_usd
		FROM tenant_analytics.monthly_billing_summary
		WHERE tenant_id = ?
		ORDER BY month DESC
		LIMIT 2`, tenantID)
	if err == nil {
		values := []float64{}
		for monthRows.Next() {
			var value float64
			if err := monthRows.Scan(&value); err != nil {
				monthRows.Close()
				return "", err
			}
			values = append(values, value)
		}
		monthRows.Close()
		if len(values) > 0 {
			latest = values[0]
		}
		if len(values) > 1 {
			previous = values[1]
		}
	}
	growth := 0.0
	if previous > 0 {
		growth = ((latest - previous) / previous) * 100
	}
	if len(parts) == 0 {
		return "", rows.Err()
	}
	return fmt.Sprintf("Last 30 days usage: %s.\nMonth-over-month growth: %+.1f%% in total billing.", strings.Join(parts, ", "), growth), rows.Err()
}

func (w *EmbeddingWorker) activityChunk(ctx context.Context, tenantID uuid.UUID) (string, error) {
	rows, err := w.postgres.Query(ctx, `
		SELECT created_at, type::text, subject, COALESCE(body, '')
		FROM activities
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT 5`, tenantID)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	parts := []string{}
	for rows.Next() {
		var createdAt time.Time
		var activityType, subject, body string
		if err := rows.Scan(&createdAt, &activityType, &subject, &body); err != nil {
			return "", err
		}
		parts = append(parts, fmt.Sprintf("%s: %s - %s. Notes: %s.", createdAt.Format("2006-01-02"), activityType, subject, firstRunes(body, 200)))
	}
	if len(parts) == 0 {
		return "", rows.Err()
	}
	return strings.Join(parts, "\n"), rows.Err()
}

func (w *EmbeddingWorker) contactChunk(ctx context.Context, tenantID uuid.UUID) (string, error) {
	rows, err := w.postgres.Query(ctx, `SELECT full_name, COALESCE(title, ''), is_primary FROM contacts WHERE tenant_id = $1 ORDER BY is_primary DESC, full_name`, tenantID)
	if err != nil {
		return "", err
	}
	defer rows.Close()
	parts := []string{}
	for rows.Next() {
		var name, title string
		var primary bool
		if err := rows.Scan(&name, &title, &primary); err != nil {
			return "", err
		}
		contactType := "secondary"
		if primary {
			contactType = "primary"
		}
		parts = append(parts, fmt.Sprintf("%s (%s, %s)", name, title, contactType))
	}
	if len(parts) == 0 {
		return "", rows.Err()
	}
	return "Key contacts: " + strings.Join(parts, ", ") + ".", rows.Err()
}

func (w *EmbeddingWorker) embeddingExists(ctx context.Context, tenantID uuid.UUID, hash string) (bool, error) {
	var exists bool
	err := w.postgres.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM tenant_embeddings WHERE tenant_id = $1 AND content_hash = $2)`, tenantID, hash).Scan(&exists)
	return exists, err
}

func (w *EmbeddingWorker) upsertEmbedding(ctx context.Context, chunk tenantChunk, embedding []float32) error {
	_, err := w.postgres.Exec(ctx, `
		INSERT INTO tenant_embeddings (tenant_id, source_type, source_id, content, chunk_text, content_hash, embedding)
		VALUES ($1, $2, $3, $4, $4, $5, $6::vector)
		ON CONFLICT (content_hash) DO UPDATE SET
			embedding = excluded.embedding,
			chunk_text = excluded.chunk_text,
			content = excluded.content,
			updated_at = NOW()`,
		chunk.TenantID, chunk.SourceType, chunk.SourceID, chunk.Text, chunk.Hash, aiVectorLiteral(embedding))
	return err
}

func embedWithRetry(ctx context.Context, client *ai.OpenAIClient, text string) ([]float32, error) {
	var lastErr error
	for i, delay := range []time.Duration{time.Second, 2 * time.Second, 4 * time.Second} {
		embedding, err := client.Embed(ctx, text)
		if err == nil {
			return embedding, nil
		}
		lastErr = err
		if !errors.Is(err, ai.ErrRateLimited) || i == 2 {
			return nil, err
		}
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil, ctx.Err()
		case <-timer.C:
		}
	}
	return nil, lastErr
}

func trimChunk(text string) string {
	text = strings.TrimSpace(text)
	if len([]rune(text)) <= maxChunkRunes {
		return text
	}
	return firstRunes(text, maxChunkRunes)
}

func firstRunes(text string, limit int) string {
	runes := []rune(text)
	if len(runes) <= limit {
		return text
	}
	return string(runes[:limit])
}

func strPtr(value *string, fallback string) string {
	if value == nil || *value == "" {
		return fallback
	}
	return *value
}

func aiVectorLiteral(values []float32) string {
	parts := make([]string, 0, len(values))
	for _, value := range values {
		parts = append(parts, fmt.Sprintf("%f", value))
	}
	return "[" + strings.Join(parts, ",") + "]"
}
