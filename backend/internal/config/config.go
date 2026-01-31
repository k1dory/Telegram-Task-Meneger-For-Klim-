package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Telegram TelegramConfig
	JWT      JWTConfig
}

type ServerConfig struct {
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	Mode         string // "debug", "release", "test"
}

type DatabaseConfig struct {
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxConns        int32
	MinConns        int32
	MaxConnLifetime time.Duration
	MaxConnIdleTime time.Duration
}

type TelegramConfig struct {
	BotToken string
	AppURL   string
}

type JWTConfig struct {
	Secret          string
	ExpirationHours int
}

func Load() (*Config, error) {
	dbConfig := loadDatabaseConfig()

	// JWT_SECRET is required in production
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		// Only allow default in debug mode
		if getEnv("GIN_MODE", "debug") != "debug" {
			return nil, fmt.Errorf("JWT_SECRET environment variable is required in production")
		}
		jwtSecret = "dev-only-secret-do-not-use-in-production"
	}

	return &Config{
		Server: ServerConfig{
			Port:         getEnv("API_PORT", "8080"),
			ReadTimeout:  getDurationEnv("SERVER_READ_TIMEOUT", 10*time.Second),
			WriteTimeout: getDurationEnv("SERVER_WRITE_TIMEOUT", 10*time.Second),
			Mode:         getEnv("GIN_MODE", "debug"),
		},
		Database: dbConfig,
		Telegram: TelegramConfig{
			BotToken: getEnv("TELEGRAM_BOT_TOKEN", ""),
			AppURL:   getEnv("TELEGRAM_MINI_APP_URL", ""),
		},
		JWT: JWTConfig{
			Secret:          jwtSecret,
			ExpirationHours: getIntEnv("JWT_EXPIRATION_HOURS", 720), // 30 days
		},
	}, nil
}

// loadDatabaseConfig parses DATABASE_URL if available, otherwise uses individual env vars
func loadDatabaseConfig() DatabaseConfig {
	config := DatabaseConfig{
		MaxConns:        int32(getIntEnv("DB_MAX_CONNS", 25)),
		MinConns:        int32(getIntEnv("DB_MIN_CONNS", 5)),
		MaxConnLifetime: getDurationEnv("DB_MAX_CONN_LIFETIME", time.Hour),
		MaxConnIdleTime: getDurationEnv("DB_MAX_CONN_IDLE_TIME", 30*time.Minute),
	}

	// Try DATABASE_URL first (used by docker-compose)
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		if parsed, err := url.Parse(dbURL); err == nil {
			config.Host = parsed.Hostname()
			config.Port = parsed.Port()
			if config.Port == "" {
				config.Port = "5432"
			}
			config.User = parsed.User.Username()
			config.Password, _ = parsed.User.Password()
			config.DBName = strings.TrimPrefix(parsed.Path, "/")
			config.SSLMode = parsed.Query().Get("sslmode")
			if config.SSLMode == "" {
				config.SSLMode = "disable"
			}
			return config
		}
	}

	// Fall back to individual env vars
	config.Host = getEnv("POSTGRES_HOST", "localhost")
	config.Port = getEnv("POSTGRES_PORT", "5432")
	config.User = getEnv("POSTGRES_USER", "taskmanager")
	config.Password = getEnv("POSTGRES_PASSWORD", "postgres")
	config.DBName = getEnv("POSTGRES_DB", "taskmanager")
	config.SSLMode = getEnv("DB_SSL_MODE", "disable")

	return config
}

func (c *DatabaseConfig) ConnectionString() string {
	return "postgres://" + c.User + ":" + c.Password + "@" + c.Host + ":" + c.Port + "/" + c.DBName + "?sslmode=" + c.SSLMode
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getSliceEnv(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}
