package domain

import (
	"time"
)

type User struct {
	ID                  int64     `json:"id"`
	Username            string    `json:"username,omitempty"`
	FirstName           string    `json:"first_name"`
	LastName            string    `json:"last_name,omitempty"`
	LanguageCode        string    `json:"language_code"`
	NotificationEnabled bool      `json:"notification_enabled"`
	ReminderHours       []int     `json:"reminder_hours"`
	LastActiveAt        time.Time `json:"last_active_at"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type UserSettings struct {
	NotificationEnabled bool  `json:"notification_enabled"`
	ReminderHours       []int `json:"reminder_hours"`
	LanguageCode        string `json:"language_code"`
}

type TelegramUser struct {
	ID           int64  `json:"id"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Username     string `json:"username"`
	LanguageCode string `json:"language_code"`
	IsPremium    bool   `json:"is_premium"`
	PhotoURL     string `json:"photo_url"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

type TelegramAuthRequest struct {
	InitData string `json:"init_data" binding:"required"`
}
