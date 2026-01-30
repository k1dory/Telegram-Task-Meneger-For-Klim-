package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/telegram-task-manager/backend/internal/config"
)

func NewPostgresPool(ctx context.Context, cfg *config.DatabaseConfig) (*pgxpool.Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.ConnectionString())
	if err != nil {
		return nil, fmt.Errorf("failed to parse database config: %w", err)
	}

	poolConfig.MaxConns = cfg.MaxConns
	poolConfig.MinConns = cfg.MinConns
	poolConfig.MaxConnLifetime = cfg.MaxConnLifetime
	poolConfig.MaxConnIdleTime = cfg.MaxConnIdleTime

	// Health check configuration
	poolConfig.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return pool, nil
}

// HealthCheck checks database connectivity
func HealthCheck(ctx context.Context, pool *pgxpool.Pool) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	return pool.Ping(ctx)
}

// Stats returns pool statistics
type PoolStats struct {
	TotalConns   int32 `json:"total_conns"`
	AcquiredConns int32 `json:"acquired_conns"`
	IdleConns    int32 `json:"idle_conns"`
	MaxConns     int32 `json:"max_conns"`
}

func GetPoolStats(pool *pgxpool.Pool) PoolStats {
	stats := pool.Stat()
	return PoolStats{
		TotalConns:    stats.TotalConns(),
		AcquiredConns: stats.AcquiredConns(),
		IdleConns:     stats.IdleConns(),
		MaxConns:      stats.MaxConns(),
	}
}
