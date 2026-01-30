package telegram

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/telegram-task-manager/backend/internal/domain"
)

const (
	// InitData is valid for 24 hours
	InitDataValidDuration = 24 * time.Hour
)

var (
	ErrInvalidHash     = errors.New("invalid hash")
	ErrExpiredInitData = errors.New("init data expired")
	ErrMissingUser     = errors.New("user data missing")
)

type InitDataValidator struct {
	botToken string
}

func NewInitDataValidator(botToken string) *InitDataValidator {
	return &InitDataValidator{
		botToken: botToken,
	}
}

// ValidateInitData validates Telegram Mini App init data
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
func (v *InitDataValidator) ValidateInitData(initData string) (*domain.TelegramUser, error) {
	// Parse the query string
	values, err := url.ParseQuery(initData)
	if err != nil {
		return nil, fmt.Errorf("failed to parse init data: %w", err)
	}

	// Extract hash
	hash := values.Get("hash")
	if hash == "" {
		return nil, ErrInvalidHash
	}

	// Check auth_date for expiration
	authDateStr := values.Get("auth_date")
	if authDateStr == "" {
		return nil, ErrExpiredInitData
	}

	authDate, err := strconv.ParseInt(authDateStr, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid auth_date: %w", err)
	}

	// Check if init data is expired
	if time.Now().Unix()-authDate > int64(InitDataValidDuration.Seconds()) {
		return nil, ErrExpiredInitData
	}

	// Build data-check-string
	// Remove hash from values and sort remaining parameters
	values.Del("hash")

	var keys []string
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var dataCheckParts []string
	for _, key := range keys {
		dataCheckParts = append(dataCheckParts, fmt.Sprintf("%s=%s", key, values.Get(key)))
	}
	dataCheckString := strings.Join(dataCheckParts, "\n")

	// Calculate secret key: HMAC-SHA256(bot_token, "WebAppData")
	secretKeyHMAC := hmac.New(sha256.New, []byte("WebAppData"))
	secretKeyHMAC.Write([]byte(v.botToken))
	secretKey := secretKeyHMAC.Sum(nil)

	// Calculate hash: HMAC-SHA256(data_check_string, secret_key)
	dataHMAC := hmac.New(sha256.New, secretKey)
	dataHMAC.Write([]byte(dataCheckString))
	calculatedHash := hex.EncodeToString(dataHMAC.Sum(nil))

	// Compare hashes
	if !hmac.Equal([]byte(calculatedHash), []byte(hash)) {
		return nil, ErrInvalidHash
	}

	// Parse user data
	userJSON := values.Get("user")
	if userJSON == "" {
		return nil, ErrMissingUser
	}

	var user domain.TelegramUser
	if err := json.Unmarshal([]byte(userJSON), &user); err != nil {
		return nil, fmt.Errorf("failed to parse user data: %w", err)
	}

	return &user, nil
}

// ParseInitData parses init data without validation (for testing purposes)
func ParseInitData(initData string) (*domain.TelegramUser, error) {
	values, err := url.ParseQuery(initData)
	if err != nil {
		return nil, fmt.Errorf("failed to parse init data: %w", err)
	}

	userJSON := values.Get("user")
	if userJSON == "" {
		return nil, ErrMissingUser
	}

	var user domain.TelegramUser
	if err := json.Unmarshal([]byte(userJSON), &user); err != nil {
		return nil, fmt.Errorf("failed to parse user data: %w", err)
	}

	return &user, nil
}
