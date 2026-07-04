package workers

import (
	"context"
	"time"

	"github.com/htgclouds/crm-api/internal/modules/notifications"
	"github.com/rs/zerolog"
)

func StartDailyCoach(ctx context.Context, logger zerolog.Logger, renewalRepos ...notifications.RenewalReminderRepository) {
	// TODO: confirm with HCS administrator (Chen)
	go runEvery(ctx, logger, "daily_coach", 24*time.Hour)
	for _, repo := range renewalRepos {
		go runRenewalReminders(ctx, logger, repo)
	}
}

func runRenewalReminders(ctx context.Context, logger zerolog.Logger, repo notifications.RenewalReminderRepository) {
	for {
		wait := time.Until(nextUTC9(time.Now().UTC()))
		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
			if err := notifications.SendRenewalReminders(ctx, repo); err != nil {
				logger.Error().Err(err).Msg("renewal_reminders_failed")
			} else {
				logger.Info().Msg("renewal_reminders_sent")
			}
		}
	}
}

func nextUTC9(now time.Time) time.Time {
	next := time.Date(now.Year(), now.Month(), now.Day(), 9, 0, 0, 0, time.UTC)
	if !next.After(now) {
		next = next.Add(24 * time.Hour)
	}
	return next
}
