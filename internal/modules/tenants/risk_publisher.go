package tenants

import (
	"context"

	"github.com/google/uuid"

	"github.com/htgclouds/crm-api/internal/queue"
)

const riskAlertQueue = "htgcrm.ai.risk_alert"

type RabbitRiskPublisher struct {
	publisher *queue.Publisher
}

func NewRabbitRiskPublisher(publisher *queue.Publisher) *RabbitRiskPublisher {
	return &RabbitRiskPublisher{publisher: publisher}
}

func (p *RabbitRiskPublisher) PublishRiskAlert(ctx context.Context, tenantID uuid.UUID, score int) error {
	if p == nil || p.publisher == nil {
		return nil
	}
	return p.publisher.PublishQueueJSON(ctx, riskAlertQueue, map[string]any{
		"tenant_id": tenantID,
		"score":     score,
	})
}

type NoopRiskPublisher struct{}

func (NoopRiskPublisher) PublishRiskAlert(ctx context.Context, tenantID uuid.UUID, score int) error {
	return nil
}

var _ RiskPublisher = (*RabbitRiskPublisher)(nil)
var _ RiskPublisher = NoopRiskPublisher{}
