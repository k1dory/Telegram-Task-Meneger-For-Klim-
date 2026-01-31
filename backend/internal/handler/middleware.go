package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/service"
)

const (
	AuthorizationHeader = "Authorization"
	BearerPrefix        = "Bearer "
	UserIDKey           = "user_id"
	UsernameKey         = "username"
)

type Middleware struct {
	authService *service.AuthService
	logger      *slog.Logger
}

func NewMiddleware(authService *service.AuthService, logger *slog.Logger) *Middleware {
	return &Middleware{
		authService: authService,
		logger:      logger,
	}
}

// AuthRequired middleware checks for valid JWT token
func (m *Middleware) AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader(AuthorizationHeader)

		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "authorization header required",
			})
			return
		}

		if !strings.HasPrefix(authHeader, BearerPrefix) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid authorization header format",
			})
			return
		}

		token := strings.TrimPrefix(authHeader, BearerPrefix)

		claims, err := m.authService.ValidateToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid or expired token",
			})
			return
		}

		// Set user info in context
		c.Set(UserIDKey, claims.UserID)
		c.Set(UsernameKey, claims.Username)

		c.Next()
	}
}

// GetUserID extracts user ID from context
func GetUserID(c *gin.Context) (int64, error) {
	userID, exists := c.Get(UserIDKey)
	if !exists {
		return 0, errors.New("user ID not found in context")
	}

	id, ok := userID.(int64)
	if !ok {
		return 0, errors.New("invalid user ID type")
	}

	return id, nil
}

// Logger middleware logs requests
func (m *Middleware) Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		if query != "" {
			path = path + "?" + query
		}

		m.logger.Info("request",
			"method", c.Request.Method,
			"path", path,
			"status", status,
			"latency", latency,
			"client_ip", c.ClientIP(),
			"user_id", c.GetInt64(UserIDKey),
		)
	}
}

// Recovery middleware recovers from panics
func (m *Middleware) Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				m.logger.Error("panic recovered",
					"error", err,
					"path", c.Request.URL.Path,
				)

				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error": "internal server error",
				})
			}
		}()

		c.Next()
	}
}

// CORS middleware handles Cross-Origin Resource Sharing
func (m *Middleware) CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// ErrorHandler middleware handles errors
func (m *Middleware) ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) > 0 {
			err := c.Errors.Last().Err

			var appErr *domain.AppError
			if errors.As(err, &appErr) {
				c.JSON(appErr.Code, gin.H{
					"error":   appErr.Message,
					"details": appErr.Details,
				})
				return
			}

			switch {
			case errors.Is(err, domain.ErrNotFound):
				c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
			case errors.Is(err, domain.ErrUnauthorized):
				c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			case errors.Is(err, domain.ErrForbidden):
				c.JSON(http.StatusForbidden, gin.H{"error": "access forbidden"})
			case errors.Is(err, domain.ErrInvalidInput):
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
			case errors.Is(err, domain.ErrInvalidInitData):
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid telegram init data"})
			case errors.Is(err, domain.ErrExpiredInitData):
				c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram init data expired"})
			default:
				m.logger.Error("unhandled error", "error", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			}
		}
	}
}

// RateLimiter simple in-memory rate limiter (for production use Redis)
type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	// Start cleanup goroutine
	go rl.cleanup()
	return rl
}

// cleanup periodically removes stale entries to prevent unbounded memory growth
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		windowStart := now.Add(-rl.window)
		for key, times := range rl.requests {
			var valid []time.Time
			for _, t := range times {
				if t.After(windowStart) {
					valid = append(valid, t)
				}
			}
			if len(valid) == 0 {
				delete(rl.requests, key)
			} else {
				rl.requests[key] = valid
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	// Clean old requests for this key
	var validRequests []time.Time
	for _, t := range rl.requests[key] {
		if t.After(windowStart) {
			validRequests = append(validRequests, t)
		}
	}

	if len(validRequests) >= rl.limit {
		rl.requests[key] = validRequests
		return false
	}

	rl.requests[key] = append(validRequests, now)
	return true
}

func (m *Middleware) RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	limiter := NewRateLimiter(limit, window)

	return func(c *gin.Context) {
		key := c.ClientIP()

		// Use user ID if authenticated (proper int64 to string conversion)
		if userID, err := GetUserID(c); err == nil {
			key = "user:" + strconv.FormatInt(userID, 10)
		}

		if !limiter.Allow(key) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded",
			})
			return
		}

		c.Next()
	}
}
