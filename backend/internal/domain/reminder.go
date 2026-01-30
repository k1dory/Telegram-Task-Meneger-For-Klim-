package domain

import (
	"time"

	"github.com/google/uuid"
)

type Reminder struct {
	ID        uuid.UUID  `json:"id"`
	UserID    int64      `json:"user_id"`
	ItemID    uuid.UUID  `json:"item_id"`
	RemindAt  time.Time  `json:"remind_at"`
	Message   string     `json:"message,omitempty"`
	Sent      bool       `json:"sent"`
	SentAt    *time.Time `json:"sent_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	Item      *Item      `json:"item,omitempty"`
}

type CreateReminderRequest struct {
	RemindAt time.Time `json:"remind_at" binding:"required"`
	Message  string    `json:"message" binding:"max=1000"`
}

type UpdateReminderRequest struct {
	RemindAt *time.Time `json:"remind_at"`
	Message  *string    `json:"message" binding:"omitempty,max=1000"`
}

// ActivityLog tracks user actions for inactivity monitoring
type ActivityLog struct {
	ID         uuid.UUID `json:"id"`
	UserID     int64     `json:"user_id"`
	Action     string    `json:"action"`
	EntityType string    `json:"entity_type,omitempty"`
	EntityID   uuid.UUID `json:"entity_id,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// HabitCompletion tracks habit completions
type HabitCompletion struct {
	ID            uuid.UUID `json:"id"`
	ItemID        uuid.UUID `json:"item_id"`
	CompletedDate time.Time `json:"completed_date"`
	CreatedAt     time.Time `json:"created_at"`
}

type CompleteHabitRequest struct {
	Date string `json:"date" binding:"required"` // YYYY-MM-DD format
}

// ParseDate parses the date string in YYYY-MM-DD format
func (r *CompleteHabitRequest) ParseDate() (time.Time, error) {
	return time.Parse("2006-01-02", r.Date)
}

// Analytics types
type AnalyticsOverview struct {
	TotalTasks      int     `json:"total_tasks"`
	CompletedTasks  int     `json:"completed_tasks"`
	PendingTasks    int     `json:"pending_tasks"`
	OverdueTasks    int     `json:"overdue_tasks"`
	CompletionRate  float64 `json:"completion_rate"`
	TotalFolders    int     `json:"total_folders"`
	TotalBoards     int     `json:"total_boards"`
	ActiveStreaks   int     `json:"active_streaks"`
	TasksToday      int     `json:"tasks_today"`
	TasksThisWeek   int     `json:"tasks_this_week"`
}

type CompletionStats struct {
	Date      string `json:"date"`
	Completed int    `json:"completed"`
	Created   int    `json:"created"`
}

type InactiveUser struct {
	UserID       int64     `json:"user_id"`
	LastActiveAt time.Time `json:"last_active_at"`
	HoursInactive int      `json:"hours_inactive"`
}

type OverdueTask struct {
	UserID    int64     `json:"user_id"`
	ItemID    uuid.UUID `json:"item_id"`
	Title     string    `json:"title"`
	DueDate   time.Time `json:"due_date"`
	BoardName string    `json:"board_name"`
}
