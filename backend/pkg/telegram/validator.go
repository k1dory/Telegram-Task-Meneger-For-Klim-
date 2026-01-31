package telegram

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
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
	slog.Info("[VALIDATOR] Starting initData validation", "initData_length", len(initData))

	// Parse the query string
	values, err := url.ParseQuery(initData)
	if err != nil {
		slog.Error("[VALIDATOR] Failed to parse query string", "error", err)
		return nil, fmt.Errorf("failed to parse init data: %w", err)
	}

	// Log all parameters (without sensitive data)
	paramKeys := make([]string, 0, len(values))
	for k := range values {
		paramKeys = append(paramKeys, k)
	}
	slog.Info("[VALIDATOR] Parsed parameters", "keys", paramKeys)

	// Extract hash
	hash := values.Get("hash")
	if hash == "" {
		slog.Error("[VALIDATOR] No hash in initData")
		return nil, ErrInvalidHash
	}
	hashPrefix := hash
	if len(hashPrefix) > 16 {
		hashPrefix = hashPrefix[:16]
	}
	slog.Info("[VALIDATOR] Found hash", "hash_length", len(hash), "hash_prefix", hashPrefix)

	// Check auth_date for expiration
	authDateStr := values.Get("auth_date")
	if authDateStr == "" {
		slog.Error("[VALIDATOR] No auth_date in initData")
		return nil, ErrExpiredInitData
	}

	authDate, err := strconv.ParseInt(authDateStr, 10, 64)
	if err != nil {
		slog.Error("[VALIDATOR] Invalid auth_date format", "auth_date", authDateStr, "error", err)
		return nil, fmt.Errorf("invalid auth_date: %w", err)
	}

	nowUnix := time.Now().Unix()
	age := nowUnix - authDate
	maxAge := int64(InitDataValidDuration.Seconds())
	slog.Info("[VALIDATOR] Checking expiration",
		"auth_date", authDate,
		"now", nowUnix,
		"age_seconds", age,
		"max_age_seconds", maxAge,
		"expired", age > maxAge,
	)

	// Check if init data is expired
	if age > maxAge {
		slog.Error("[VALIDATOR] InitData expired", "age_hours", float64(age)/3600.0)
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
	slog.Info("[VALIDATOR] Built data check string", "length", len(dataCheckString), "keys_count", len(keys))

	// Calculate secret key: HMAC-SHA256 of bot_token with "WebAppData" as the key
	// From Telegram docs: "the HMAC-SHA-256 signature of the bot's token with the constant string WebAppData used as a key"
	// This means: key = "WebAppData", data = bot_token
	slog.Info("[VALIDATOR] Calculating secret key with bot token", "token_length", len(v.botToken))
	secretKeyHMAC := hmac.New(sha256.New, []byte("WebAppData"))
	secretKeyHMAC.Write([]byte(v.botToken))
	secretKey := secretKeyHMAC.Sum(nil)
	slog.Info("[VALIDATOR] Secret key calculated", "secret_key_hex_prefix", hex.EncodeToString(secretKey)[:16])

	// Calculate hash: HMAC-SHA256(data_check_string, secret_key)
	dataHMAC := hmac.New(sha256.New, secretKey)
	dataHMAC.Write([]byte(dataCheckString))
	calculatedHash := hex.EncodeToString(dataHMAC.Sum(nil))
	receivedPrefix := hash
	if len(receivedPrefix) > 16 {
		receivedPrefix = receivedPrefix[:16]
	}
	slog.Info("[VALIDATOR] Hash comparison",
		"calculated_prefix", calculatedHash[:16],
		"received_prefix", receivedPrefix,
		"match", calculatedHash == hash,
	)

	// Compare hashes
	if !hmac.Equal([]byte(calculatedHash), []byte(hash)) {
		slog.Error("[VALIDATOR] Hash mismatch!",
			"calculated", calculatedHash,
			"received", hash,
		)
		return nil, ErrInvalidHash
	}

	slog.Info("[VALIDATOR] Hash validation successful!")

	// Parse user data
	userJSON := values.Get("user")
	if userJSON == "" {
		slog.Error("[VALIDATOR] No user data in initData")
		return nil, ErrMissingUser
	}

	var user domain.TelegramUser
	if err := json.Unmarshal([]byte(userJSON), &user); err != nil {
		slog.Error("[VALIDATOR] Failed to parse user JSON", "error", err)
		return nil, fmt.Errorf("failed to parse user data: %w", err)
	}

	slog.Info("[VALIDATOR] User parsed successfully",
		"id", user.ID,
		"username", user.Username,
		"first_name", user.FirstName,
	)

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
