package telegram

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	BaseURL    = "https://api.telegram.org/bot"
	APITimeout = 30 * time.Second
)

type Bot struct {
	token      string
	httpClient *http.Client
	baseURL    string
}

func NewBot(token string) *Bot {
	return &Bot{
		token: token,
		httpClient: &http.Client{
			Timeout: APITimeout,
		},
		baseURL: BaseURL + token,
	}
}

// SendMessageRequest represents Telegram sendMessage request
type SendMessageRequest struct {
	ChatID                int64       `json:"chat_id"`
	Text                  string      `json:"text"`
	ParseMode             string      `json:"parse_mode,omitempty"`
	DisableWebPagePreview bool        `json:"disable_web_page_preview,omitempty"`
	DisableNotification   bool        `json:"disable_notification,omitempty"`
	ReplyMarkup           interface{} `json:"reply_markup,omitempty"`
}

// InlineKeyboardMarkup for message buttons
type InlineKeyboardMarkup struct {
	InlineKeyboard [][]InlineKeyboardButton `json:"inline_keyboard"`
}

// InlineKeyboardButton represents a button
type InlineKeyboardButton struct {
	Text         string `json:"text"`
	URL          string `json:"url,omitempty"`
	CallbackData string `json:"callback_data,omitempty"`
	WebApp       *WebAppInfo `json:"web_app,omitempty"`
}

// WebAppInfo for Mini App buttons
type WebAppInfo struct {
	URL string `json:"url"`
}

// APIResponse represents Telegram API response
type APIResponse struct {
	OK          bool            `json:"ok"`
	Result      json.RawMessage `json:"result,omitempty"`
	ErrorCode   int             `json:"error_code,omitempty"`
	Description string          `json:"description,omitempty"`
}

// Message represents Telegram message
type Message struct {
	MessageID int64  `json:"message_id"`
	Chat      Chat   `json:"chat"`
	Text      string `json:"text"`
	Date      int64  `json:"date"`
}

// Chat represents Telegram chat
type Chat struct {
	ID        int64  `json:"id"`
	Type      string `json:"type"`
	Title     string `json:"title,omitempty"`
	Username  string `json:"username,omitempty"`
	FirstName string `json:"first_name,omitempty"`
	LastName  string `json:"last_name,omitempty"`
}

// SendMessage sends a text message to a chat
func (b *Bot) SendMessage(chatID int64, text string) (*Message, error) {
	return b.SendMessageWithOptions(SendMessageRequest{
		ChatID:    chatID,
		Text:      text,
		ParseMode: "HTML",
	})
}

// SendMessageWithOptions sends a message with custom options
func (b *Bot) SendMessageWithOptions(req SendMessageRequest) (*Message, error) {
	resp, err := b.makeRequest("sendMessage", req)
	if err != nil {
		return nil, err
	}

	var msg Message
	if err := json.Unmarshal(resp.Result, &msg); err != nil {
		return nil, fmt.Errorf("failed to parse message: %w", err)
	}

	return &msg, nil
}

// SendReminderMessage sends a reminder notification with Mini App button
func (b *Bot) SendReminderMessage(chatID int64, text string, appURL string, itemID string) (*Message, error) {
	keyboard := InlineKeyboardMarkup{
		InlineKeyboard: [][]InlineKeyboardButton{
			{
				{
					Text: "Open Task",
					WebApp: &WebAppInfo{
						URL: fmt.Sprintf("%s?item=%s", appURL, itemID),
					},
				},
			},
		},
	}

	return b.SendMessageWithOptions(SendMessageRequest{
		ChatID:      chatID,
		Text:        text,
		ParseMode:   "HTML",
		ReplyMarkup: keyboard,
	})
}

// SendInactivityReminder sends a gentle reminder for inactive users
func (b *Bot) SendInactivityReminder(chatID int64, appURL string) (*Message, error) {
	text := "Hey! It's been a while since you checked your tasks. " +
		"Take a moment to review your progress and stay on track!"

	keyboard := InlineKeyboardMarkup{
		InlineKeyboard: [][]InlineKeyboardButton{
			{
				{
					Text: "Open Task Manager",
					WebApp: &WebAppInfo{
						URL: appURL,
					},
				},
			},
		},
	}

	return b.SendMessageWithOptions(SendMessageRequest{
		ChatID:              chatID,
		Text:                text,
		ParseMode:           "HTML",
		DisableNotification: true, // Gentle reminder, no sound
		ReplyMarkup:         keyboard,
	})
}

// SendOverdueTasksNotification notifies about overdue tasks
func (b *Bot) SendOverdueTasksNotification(chatID int64, tasks []OverdueTaskInfo, appURL string) (*Message, error) {
	var text string
	if len(tasks) == 1 {
		text = fmt.Sprintf("You have an overdue task:\n\n<b>%s</b>\nIn board: %s",
			tasks[0].Title, tasks[0].BoardName)
	} else {
		text = fmt.Sprintf("You have %d overdue tasks:\n\n", len(tasks))
		for i, task := range tasks {
			if i >= 5 {
				text += fmt.Sprintf("\n...and %d more", len(tasks)-5)
				break
			}
			text += fmt.Sprintf("- <b>%s</b> (%s)\n", task.Title, task.BoardName)
		}
	}

	keyboard := InlineKeyboardMarkup{
		InlineKeyboard: [][]InlineKeyboardButton{
			{
				{
					Text: "View Tasks",
					WebApp: &WebAppInfo{
						URL: appURL,
					},
				},
			},
		},
	}

	return b.SendMessageWithOptions(SendMessageRequest{
		ChatID:      chatID,
		Text:        text,
		ParseMode:   "HTML",
		ReplyMarkup: keyboard,
	})
}

// OverdueTaskInfo contains info for overdue task notification
type OverdueTaskInfo struct {
	Title     string
	BoardName string
	ItemID    string
}

// makeRequest makes a request to Telegram Bot API
func (b *Bot) makeRequest(method string, payload interface{}) (*APIResponse, error) {
	url := fmt.Sprintf("%s/%s", b.baseURL, method)

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var apiResp APIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if !apiResp.OK {
		return nil, fmt.Errorf("telegram API error: %s (code: %d)", apiResp.Description, apiResp.ErrorCode)
	}

	return &apiResp, nil
}

// GetMe returns bot information
func (b *Bot) GetMe() (*BotInfo, error) {
	resp, err := b.makeRequest("getMe", nil)
	if err != nil {
		return nil, err
	}

	var info BotInfo
	if err := json.Unmarshal(resp.Result, &info); err != nil {
		return nil, fmt.Errorf("failed to parse bot info: %w", err)
	}

	return &info, nil
}

// BotInfo represents bot information
type BotInfo struct {
	ID                      int64  `json:"id"`
	IsBot                   bool   `json:"is_bot"`
	FirstName               string `json:"first_name"`
	Username                string `json:"username"`
	CanJoinGroups           bool   `json:"can_join_groups"`
	CanReadAllGroupMessages bool   `json:"can_read_all_group_messages"`
	SupportsInlineQueries   bool   `json:"supports_inline_queries"`
}
