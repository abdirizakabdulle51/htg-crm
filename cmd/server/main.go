package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"

	"github.com/htgclouds/crm-api/internal/auth"
	"github.com/htgclouds/crm-api/internal/cache"
	"github.com/htgclouds/crm-api/internal/config"
	"github.com/htgclouds/crm-api/internal/database"
	"github.com/htgclouds/crm-api/internal/huawei"
	appmiddleware "github.com/htgclouds/crm-api/internal/middleware"
	aimodule "github.com/htgclouds/crm-api/internal/modules/ai"
	notificationsmodule "github.com/htgclouds/crm-api/internal/modules/notifications"
	pipelinemodule "github.com/htgclouds/crm-api/internal/modules/pipeline"
	reportsmodule "github.com/htgclouds/crm-api/internal/modules/reports"
	targetsmodule "github.com/htgclouds/crm-api/internal/modules/targets"
	tenantsmodule "github.com/htgclouds/crm-api/internal/modules/tenants"
	usersmodule "github.com/htgclouds/crm-api/internal/modules/users"
	"github.com/htgclouds/crm-api/internal/queue"
	"github.com/htgclouds/crm-api/internal/response"
	"github.com/htgclouds/crm-api/internal/targets"
	"github.com/htgclouds/crm-api/internal/workers"
)

func main() {
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("load_config")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	redisClient, err := cache.NewRedis(ctx, cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		logger.Fatal().Err(err).Msg("connect_redis")
	}
	defer redisClient.Close()

	postgresPool, err := database.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Fatal().Err(err).Msg("connect_postgres")
	}
	defer postgresPool.Close()

	clickHouseConn, err := database.NewClickHouse(ctx, database.ClickHouseConfig{
		Addr:     cfg.ClickHouseAddr,
		Database: cfg.ClickHouseDB,
		Username: cfg.ClickHouseUser,
		Password: cfg.ClickHousePass,
	})
	if err != nil {
		logger.Fatal().Err(err).Msg("connect_clickhouse")
	}
	defer clickHouseConn.Close()

	rabbitPublisher, err := queue.NewRabbitMQ(cfg.RabbitMQURL)
	if err != nil {
		logger.Fatal().Err(err).Msg("connect_rabbitmq")
	}
	defer rabbitPublisher.Close()

	validator := auth.NewKeycloakValidator(cfg.KeycloakURL, cfg.KeycloakRealm, cfg.KeycloakAudience)
	appmiddleware.SetKeycloakValidator(validator)
	appmiddleware.SetAuditStore(postgresPool, logger)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(appmiddleware.Logging(logger))
	router.Use(appmiddleware.CORS(cfg.AllowedOrigins()))

	api := router.Group("/api/v1")
	api.GET("/health", func(c *gin.Context) {
		healthCtx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		payload := gin.H{
			"status":    "ok",
			"version":   "1.0.0",
			"db":        "ok",
			"redis":     "ok",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		}

		status := http.StatusOK
		if err := postgresPool.Ping(healthCtx); err != nil {
			payload["status"] = "degraded"
			payload["db"] = "down"
			status = http.StatusServiceUnavailable
		}
		if err := redisClient.Ping(healthCtx).Err(); err != nil {
			payload["status"] = "degraded"
			payload["redis"] = "down"
			status = http.StatusServiceUnavailable
		}

		if status == http.StatusServiceUnavailable {
			c.JSON(status, payload)
			return
		}
		c.JSON(status, payload)
	})
	api.Use(appmiddleware.RateLimit(redisClient))
	api.Use(appmiddleware.AuditMiddleware())
	api.Use(appmiddleware.Pagination())

	usersRepository := usersmodule.NewRepository(postgresPool)
	keycloakAdmin := usersmodule.NewKeycloakAdminClient(cfg.KeycloakURL, cfg.KeycloakRealm, cfg.KeycloakAdminClientSecret)
	notificationService := notificationsmodule.NewService(postgresPool, notificationsmodule.Config{
		SMTPHost:       cfg.SMTPHost,
		SMTPPort:       cfg.SMTPPort,
		SMTPUser:       cfg.SMTPUser,
		SMTPPass:       cfg.SMTPPass,
		SMTPFrom:       cfg.SMTPFrom,
		PushWebhookURL: cfg.PushWebhookURL,
	})
	usersHandler := usersmodule.NewHandler(usersmodule.NewService(usersRepository, keycloakAdmin, notificationService))
	targetsRepository := targetsmodule.NewRepository(postgresPool, redisClient)
	targetsHandler := targetsmodule.NewHandler(targetsmodule.NewService(targetsRepository))
	pipelineHandler := pipelinemodule.NewHandler(pipelinemodule.NewService(pipelinemodule.NewRepository(postgresPool, rabbitPublisher), redisClient, notificationService))
	tenantsRepository := tenantsmodule.NewRepository(postgresPool, tenantsmodule.NewRabbitRiskPublisher(rabbitPublisher))
	tenantsHandler := tenantsmodule.NewHandler(tenantsmodule.NewService(tenantsRepository, tenantsmodule.NewClickHouseRepository(clickHouseConn)))
	openAIClient := aimodule.NewOpenAIClient(cfg.OpenAIAPIKey, cfg.OpenAIModel)
	aiHandler := aimodule.NewHandler(aimodule.NewService(openAIClient, aimodule.NewRAGStore(postgresPool, openAIClient), postgresPool, redisClient, targetsRepository))
	reportsHandler := reportsmodule.NewHandler(reportsmodule.NewService(reportsmodule.NewRepository()))

	usersmodule.RegisterRoutes(api, usersHandler)
	targets.RegisterRoutes(api, postgresPool)
	targetsmodule.RegisterRoutes(api.Group("/targets"), targetsHandler)
	pipelinemodule.RegisterRoutes(api.Group("/pipeline"), pipelineHandler)
	pipelinemodule.RegisterLeadRoutes(api.Group("/leads"), pipelineHandler)
	tenantsmodule.RegisterRoutes(api.Group("/tenants"), tenantsHandler)
	aimodule.RegisterRoutes(api.Group("/ai"), aiHandler)
	aimodule.RegisterActivityRoutes(api.Group("/activities"), aiHandler)
	reportsmodule.RegisterRoutes(api.Group("/reports"), reportsHandler)

	router.GET("/healthz", func(c *gin.Context) {
		response.Success(c, gin.H{"status": "ok"})
	})
	router.GET("/ws/dashboard", appmiddleware.AuthMiddleware(), dashboardWebSocket(logger))

	hcsClient := huawei.NewClient(huawei.Config{
		Endpoint: cfg.HCSEndpoint,
		Username: cfg.HCSUsername,
		Password: cfg.HCSPassword,
		DomainID: cfg.HCSDomainID,
	})
	usageSyncWorker := workers.NewUsageSyncWorker(postgresPool, clickHouseConn, hcsClient, rabbitPublisher, notificationService, logger, workers.UsageSyncConfig{
		AdminEmail: cfg.SMTPAdminEmail,
	})
	workers.StartUsageSync(ctx, logger, usageSyncWorker)
	aiAnalysisWorker := workers.NewAIAnalysisWorker(postgresPool, clickHouseConn, openAIClient, rabbitPublisher, redisClient, logger, workers.AIAnalysisWorkerConfig{
		AMQPURL: cfg.RabbitMQURL,
	})
	workers.StartAIAnalysis(ctx, logger, aiAnalysisWorker)
	workers.StartDailyCoach(ctx, logger, notificationService)
	embeddingWorker := workers.NewEmbeddingWorker(postgresPool, clickHouseConn, openAIClient, logger, workers.EmbeddingWorkerConfig{
		AMQPURL: cfg.RabbitMQURL,
	})
	workers.StartEmbeddingRefresh(ctx, logger, embeddingWorker)

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		logger.Info().Str("addr", cfg.HTTPAddr).Msg("server_listening")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("server_failed")
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("server_shutdown")
	}
}

func dashboardWebSocket(logger zerolog.Logger) gin.HandlerFunc {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			logger.Error().Err(err).Msg("websocket_upgrade")
			return
		}
		defer conn.Close()

		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-c.Request.Context().Done():
				return
			case <-ticker.C:
				if err := conn.WriteJSON(gin.H{"type": "kpi_tick", "timestamp": time.Now().UTC()}); err != nil {
					return
				}
			}
		}
	}
}
