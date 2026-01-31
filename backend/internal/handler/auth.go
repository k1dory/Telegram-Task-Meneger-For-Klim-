package handler

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// AuthenticateTelegram handles POST /api/auth/telegram
// @Summary Authenticate with Telegram
// @Description Validates Telegram Mini App initData and returns JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body domain.TelegramAuthRequest true "Telegram init data"
// @Success 200 {object} domain.AuthResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/auth/telegram [post]
func (h *AuthHandler) AuthenticateTelegram(c *gin.Context) {
	var req domain.TelegramAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		slog.Error("[AUTH] Failed to bind JSON request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	// Log initData details (truncated for security)
	initDataLen := len(req.InitData)
	initDataPreview := ""
	if initDataLen > 100 {
		initDataPreview = req.InitData[:100] + "..."
	} else {
		initDataPreview = req.InitData
	}
	slog.Info("[AUTH] Received auth request",
		"initData_length", initDataLen,
		"initData_preview", initDataPreview,
	)

	response, err := h.authService.AuthenticateWithTelegram(c.Request.Context(), req.InitData)
	if err != nil {
		slog.Error("[AUTH] Authentication failed",
			"error", err.Error(),
			"error_type", err,
			"initData_length", initDataLen,
		)
		switch err {
		case domain.ErrInvalidInitData:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid telegram init data"})
		case domain.ErrExpiredInitData:
			c.JSON(http.StatusUnauthorized, gin.H{"error": "telegram init data expired"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "authentication failed"})
		}
		return
	}

	slog.Info("[AUTH] Authentication successful",
		"user_id", response.User.ID,
		"username", response.User.Username,
		"token_length", len(response.Token),
	)

	c.JSON(http.StatusOK, response)
}

// GetCurrentUser handles GET /api/auth/me
// @Summary Get current user
// @Description Returns the current authenticated user
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} domain.User
// @Failure 401 {object} map[string]string
// @Router /api/auth/me [get]
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.authService.GetCurrentUser(c.Request.Context(), userID)
	if err != nil {
		if err == domain.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateSettings handles PUT /api/auth/settings
// @Summary Update user settings
// @Description Updates the current user's settings
// @Tags auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body domain.UserSettings true "User settings"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/auth/settings [put]
func (h *AuthHandler) UpdateSettings(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req domain.UserSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := h.authService.UpdateUserSettings(c.Request.Context(), userID, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "settings updated"})
}

// RefreshToken handles POST /api/auth/refresh
// @Summary Refresh JWT token
// @Description Returns a new JWT token
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	token, err := h.authService.RefreshToken(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to refresh token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}
