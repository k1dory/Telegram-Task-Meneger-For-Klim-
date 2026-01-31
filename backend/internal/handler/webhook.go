package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/telegram-task-manager/backend/pkg/telegram"
)

type WebhookHandler struct {
	bot    *telegram.Bot
	appURL string
	logger *slog.Logger
}

func NewWebhookHandler(
	bot *telegram.Bot,
	appURL string,
	logger *slog.Logger,
) *WebhookHandler {
	return &WebhookHandler{
		bot:    bot,
		appURL: appURL,
		logger: logger,
	}
}

// TelegramUpdate represents incoming Telegram webhook update
type TelegramUpdate struct {
	UpdateID int64            `json:"update_id"`
	Message  *TelegramMessage `json:"message,omitempty"`
}

// TelegramMessage represents a Telegram message
type TelegramMessage struct {
	MessageID int64         `json:"message_id"`
	From      *TelegramFrom `json:"from,omitempty"`
	Chat      *TelegramChat `json:"chat"`
	Text      string        `json:"text,omitempty"`
	Date      int64         `json:"date"`
}

// TelegramFrom represents sender info
type TelegramFrom struct {
	ID           int64  `json:"id"`
	IsBot        bool   `json:"is_bot"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name,omitempty"`
	Username     string `json:"username,omitempty"`
	LanguageCode string `json:"language_code,omitempty"`
}

// TelegramChat represents chat info
type TelegramChat struct {
	ID        int64  `json:"id"`
	Type      string `json:"type"`
	FirstName string `json:"first_name,omitempty"`
	LastName  string `json:"last_name,omitempty"`
	Username  string `json:"username,omitempty"`
}

// HandleWebhook handles POST /api/telegram/webhook
func (h *WebhookHandler) HandleWebhook(c *gin.Context) {
	var update TelegramUpdate
	if err := c.ShouldBindJSON(&update); err != nil {
		h.logger.Error("failed to parse webhook update", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Log incoming update
	updateBytes, _ := json.Marshal(update)
	h.logger.Info("received telegram webhook", "update", string(updateBytes))

	// Process message
	if update.Message != nil {
		h.handleMessage(c, update.Message)
	}

	// Always return 200 to Telegram
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// handleMessage processes incoming message
func (h *WebhookHandler) handleMessage(c *gin.Context, msg *TelegramMessage) {
	if msg.Text == "" || msg.From == nil {
		return
	}

	chatID := msg.Chat.ID
	username := msg.From.Username
	firstName := msg.From.FirstName

	// Handle /start command
	if msg.Text == "/start" || (len(msg.Text) >= 6 && msg.Text[:6] == "/start") {
		h.handleStartCommand(c, chatID, username, firstName)
		return
	}

	// Handle /help command
	if msg.Text == "/help" {
		h.handleHelpCommand(chatID)
		return
	}
}

// handleStartCommand sends welcome message with mini app link
func (h *WebhookHandler) handleStartCommand(c *gin.Context, chatID int64, username, firstName string) {
	// Build welcome message
	displayName := firstName
	if displayName == "" && username != "" {
		displayName = "@" + username
	}
	if displayName == "" {
		displayName = "пользователь"
	}

	welcomeText := fmt.Sprintf(
		"Привет, %s! 👋\n\n"+
			"Я помогу тебе организовать задачи и напоминания.\n\n"+
			"📱 Открой мини-приложение для управления задачами:",
		displayName,
	)

	// Send message with Mini App button
	keyboard := telegram.InlineKeyboardMarkup{
		InlineKeyboard: [][]telegram.InlineKeyboardButton{
			{
				{
					Text: "📋 Открыть Task Manager",
					WebApp: &telegram.WebAppInfo{
						URL: h.appURL,
					},
				},
			},
		},
	}

	_, err := h.bot.SendMessageWithOptions(telegram.SendMessageRequest{
		ChatID:      chatID,
		Text:        welcomeText,
		ParseMode:   "HTML",
		ReplyMarkup: keyboard,
	})

	if err != nil {
		h.logger.Error("failed to send start message", "chat_id", chatID, "error", err)
	} else {
		h.logger.Info("sent start message", "chat_id", chatID, "username", username)
	}
}

// handleHelpCommand sends help message
func (h *WebhookHandler) handleHelpCommand(chatID int64) {
	helpText := `📖 <b>Помощь</b>

<b>Команды:</b>
/start - Начать работу и открыть мини-приложение
/help - Показать это сообщение

<b>Возможности:</b>
• 📁 Создавай папки для организации
• 📋 Добавляй доски разных типов (Kanban, чек-листы, заметки и др.)
• ⏰ Устанавливай напоминания
• 📊 Отслеживай прогресс

Открой мини-приложение через кнопку меню или команду /start!`

	_, err := h.bot.SendMessage(chatID, helpText)
	if err != nil {
		h.logger.Error("failed to send help message", "chat_id", chatID, "error", err)
	}
}
