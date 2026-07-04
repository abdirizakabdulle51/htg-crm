package workers

import (
	"context"
	"time"

	"github.com/rs/zerolog"
)

func runEvery(ctx context.Context, logger zerolog.Logger, name string, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	logger.Info().Str("worker", name).Msg("worker_started")

	for {
		select {
		case <-ctx.Done():
			logger.Info().Str("worker", name).Msg("worker_stopped")
			return
		case <-ticker.C:
			logger.Info().Str("worker", name).Msg("worker_tick")
		}
	}
}
