package service

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/repository"
	"github.com/telegram-task-manager/backend/pkg/telegram"
)

type AuthService struct {
	userRepo      repository.UserRepository
	validator     *telegram.InitDataValidator
	jwtSecret     string
	jwtExpiration time.Duration
}

func NewAuthService(
	userRepo repository.UserRepository,
	validator *telegram.InitDataValidator,
	jwtSecret string,
	jwtExpirationHours int,
) *AuthService {
	return &AuthService{
		userRepo:      userRepo,
		validator:     validator,
		jwtSecret:     jwtSecret,
		jwtExpiration: time.Duration(jwtExpirationHours) * time.Hour,
	}
}

type JWTClaims struct {
	UserID    int64  `json:"user_id"`
	Username  string `json:"username"`
	FirstName string `json:"first_name"`
	jwt.RegisteredClaims
}

// AuthenticateWithTelegram validates Telegram init data and returns JWT token
func (s *AuthService) AuthenticateWithTelegram(ctx context.Context, initData string) (*domain.AuthResponse, error) {
	// Validate init data
	telegramUser, err := s.validator.ValidateInitData(initData)
	if err != nil {
		if errors.Is(err, telegram.ErrInvalidHash) {
			return nil, domain.ErrInvalidInitData
		}
		if errors.Is(err, telegram.ErrExpiredInitData) {
			return nil, domain.ErrExpiredInitData
		}
		return nil, err
	}

	// Create or update user
	user := &domain.User{
		ID:                  telegramUser.ID,
		Username:            telegramUser.Username,
		FirstName:           telegramUser.FirstName,
		LastName:            telegramUser.LastName,
		LanguageCode:        telegramUser.LanguageCode,
		NotificationEnabled: true,
		ReminderHours:       []int{6, 8, 12},
		LastActiveAt:        func() *time.Time { t := time.Now(); return &t }(),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Get full user data
	user, err = s.userRepo.GetByID(ctx, telegramUser.ID)
	if err != nil {
		return nil, err
	}

	// Add Telegram-specific data (not stored in DB)
	user.IsPremium = telegramUser.IsPremium
	user.PhotoURL = telegramUser.PhotoURL

	// Generate JWT token
	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

// ValidateToken validates JWT token and returns claims
func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, domain.ErrUnauthorized
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, domain.ErrUnauthorized
	}

	return claims, nil
}

// GetCurrentUser returns the current user by ID
func (s *AuthService) GetCurrentUser(ctx context.Context, userID int64) (*domain.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Update last active timestamp
	_ = s.userRepo.UpdateLastActive(ctx, userID)

	return user, nil
}

// UpdateUserSettings updates user settings
func (s *AuthService) UpdateUserSettings(ctx context.Context, userID int64, settings *domain.UserSettings) error {
	return s.userRepo.UpdateSettings(ctx, userID, settings)
}

func (s *AuthService) generateToken(user *domain.User) (string, error) {
	now := time.Now()

	claims := JWTClaims{
		UserID:    user.ID,
		Username:  user.Username,
		FirstName: user.FirstName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.jwtExpiration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "telegram-task-manager",
			Subject:   strconv.FormatInt(user.ID, 10),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

// RefreshToken generates a new token for an existing user
func (s *AuthService) RefreshToken(ctx context.Context, userID int64) (string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", err
	}

	return s.generateToken(user)
}
