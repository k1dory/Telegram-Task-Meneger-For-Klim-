package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/telegram-task-manager/backend/internal/config"
	"github.com/telegram-task-manager/backend/internal/handler"
	"github.com/telegram-task-manager/backend/internal/repository/postgres"
	"github.com/telegram-task-manager/backend/internal/scheduler"
	"github.com/telegram-task-manager/backend/internal/service"
	"github.com/telegram-task-manager/backend/pkg/database"
	"github.com/telegram-task-manager/backend/pkg/telegram"
)

func main() {
	// Load .env file if exists
	_ = godotenv.Load()

	// Setup logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Validate required config
	if cfg.Telegram.BotToken == "" {
		logger.Error("TELEGRAM_BOT_TOKEN is required")
		os.Exit(1)
	}

	// Setup database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dbPool, err := database.NewPostgresPool(ctx, &cfg.Database)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer dbPool.Close()

	logger.Info("connected to database")

	// Initialize repositories
	userRepo := postgres.NewUserRepository(dbPool)
	folderRepo := postgres.NewFolderRepository(dbPool)
	boardRepo := postgres.NewBoardRepository(dbPool)
	itemRepo := postgres.NewItemRepository(dbPool)
	reminderRepo := postgres.NewReminderRepository(dbPool)
	activityRepo := postgres.NewActivityLogRepository(dbPool)
	habitRepo := postgres.NewHabitCompletionRepository(dbPool)

	// Initialize Telegram components
	telegramBot := telegram.NewBot(cfg.Telegram.BotToken)
	initDataValidator := telegram.NewInitDataValidator(cfg.Telegram.BotToken)

	// Verify bot token
	botInfo, err := telegramBot.GetMe()
	if err != nil {
		logger.Error("failed to verify bot token", "error", err)
		os.Exit(1)
	}
	logger.Info("telegram bot verified", "username", botInfo.Username)

	// Initialize services
	authService := service.NewAuthService(userRepo, initDataValidator, cfg.JWT.Secret, cfg.JWT.ExpirationHours)
	folderService := service.NewFolderService(folderRepo, activityRepo)
	boardService := service.NewBoardService(boardRepo, folderRepo, activityRepo)
	itemService := service.NewItemService(itemRepo, boardRepo, reminderRepo, activityRepo, habitRepo)
	analyticsService := service.NewAnalyticsService(userRepo, folderRepo, boardRepo, itemRepo)
	notificationService := service.NewNotificationService(
		telegramBot,
		userRepo,
		itemRepo,
		reminderRepo,
		cfg.Telegram.AppURL,
		logger,
	)

	// Initialize scheduler
	reminderScheduler := scheduler.NewReminderScheduler(
		notificationService,
		userRepo,
		itemRepo,
		reminderRepo,
		logger,
	)

	if err := reminderScheduler.Start(); err != nil {
		logger.Error("failed to start scheduler", "error", err)
		os.Exit(1)
	}
	defer reminderScheduler.Stop()

	// Initialize handlers
	middleware := handler.NewMiddleware(authService, logger)
	authHandler := handler.NewAuthHandler(authService)
	folderHandler := handler.NewFolderHandler(folderService)
	boardHandler := handler.NewBoardHandler(boardService)
	itemHandler := handler.NewItemHandler(itemService, analyticsService)

	// Setup Gin
	gin.SetMode(cfg.Server.Mode)
	router := gin.New()

	// Global middleware
	router.Use(middleware.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.CORS())
	router.Use(middleware.ErrorHandler())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		if err := database.HealthCheck(c.Request.Context(), dbPool); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "unhealthy",
				"error":  err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
			"db":     database.GetPoolStats(dbPool),
		})
	})

	// API routes
	api := router.Group("/api")
	{
		// Auth routes (public)
		auth := api.Group("/auth")
		{
			auth.POST("/telegram", authHandler.AuthenticateTelegram)

			// Protected auth routes
			authProtected := auth.Group("")
			authProtected.Use(middleware.AuthRequired())
			{
				authProtected.GET("/me", authHandler.GetCurrentUser)
				authProtected.PUT("/settings", authHandler.UpdateSettings)
				authProtected.POST("/refresh", authHandler.RefreshToken)
			}
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthRequired())
		{
			// Folders
			folders := protected.Group("/folders")
			{
				folders.GET("", folderHandler.ListFolders)
				folders.POST("", folderHandler.CreateFolder)
				folders.PUT("/reorder", folderHandler.ReorderFolders)
				folders.GET("/:id", folderHandler.GetFolder)
				folders.PUT("/:id", folderHandler.UpdateFolder)
				folders.DELETE("/:id", folderHandler.DeleteFolder)

				// Boards within folder
				folders.GET("/:folderId/boards", boardHandler.ListBoards)
				folders.POST("/:folderId/boards", boardHandler.CreateBoard)
				folders.PUT("/:folderId/boards/reorder", boardHandler.ReorderBoards)
			}

			// Boards
			boards := protected.Group("/boards")
			{
				boards.GET("/:id", boardHandler.GetBoard)
				boards.PUT("/:id", boardHandler.UpdateBoard)
				boards.DELETE("/:id", boardHandler.DeleteBoard)

				// Items within board
				boards.GET("/:boardId/items", itemHandler.ListItems)
				boards.POST("/:boardId/items", itemHandler.CreateItem)
				boards.PUT("/:boardId/items/reorder", itemHandler.ReorderItems)
			}

			// Items
			items := protected.Group("/items")
			{
				items.GET("/:id", itemHandler.GetItem)
				items.PUT("/:id", itemHandler.UpdateItem)
				items.DELETE("/:id", itemHandler.DeleteItem)
				items.PUT("/:id/complete", itemHandler.CompleteItem)
				items.PUT("/:id/move", itemHandler.MoveItem)
				items.POST("/:id/reminder", itemHandler.SetReminder)

				// Habit tracking
				items.POST("/:id/habit/complete", itemHandler.CompleteHabit)
				items.GET("/:id/habit/completions", itemHandler.GetHabitCompletions)
			}

			// Analytics
			analytics := protected.Group("/analytics")
			{
				analytics.GET("/overview", itemHandler.GetAnalyticsOverview)
				analytics.GET("/completion", itemHandler.GetCompletionStats)
			}
		}
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Start server in goroutine
	go func() {
		logger.Info("starting server", "port", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server forced to shutdown", "error", err)
	}

	logger.Info("server exited")
	fmt.Println("Goodbye!")
}
