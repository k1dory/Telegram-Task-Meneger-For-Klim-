package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ItemStatus string

const (
	ItemStatusPending    ItemStatus = "pending"
	ItemStatusInProgress ItemStatus = "in_progress"
	ItemStatusCompleted  ItemStatus = "completed"
	ItemStatusArchived   ItemStatus = "archived"
)

type Item struct {
	ID          uuid.UUID       `json:"id"`
	BoardID     uuid.UUID       `json:"board_id"`
	ParentID    *uuid.UUID      `json:"parent_id,omitempty"`
	Title       string          `json:"title"`
	Content     string          `json:"content,omitempty"`
	Status      ItemStatus      `json:"status"`
	Position    int             `json:"position"`
	DueDate     *time.Time      `json:"due_date,omitempty"`
	CompletedAt *time.Time      `json:"completed_at,omitempty"`
	Metadata    json.RawMessage `json:"metadata"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	Children    []Item          `json:"children,omitempty"`
}

// ItemMetadata contains type-specific metadata
type ItemMetadata struct {
	// Notes
	Color string `json:"color,omitempty"`

	// Kanban
	ColumnID string   `json:"column_id,omitempty"`
	Labels   []string `json:"labels,omitempty"`

	// Time manager
	StartTime string `json:"start_time,omitempty"`
	EndTime   string `json:"end_time,omitempty"`
	TimeSlot  string `json:"time_slot,omitempty"`

	// Calendar
	AllDay     bool   `json:"all_day,omitempty"`
	RecurRule  string `json:"recur_rule,omitempty"` // iCal RRULE format
	Location   string `json:"location,omitempty"`
	EventColor string `json:"event_color,omitempty"`

	// Habit tracker
	Frequency    string `json:"frequency,omitempty"` // "daily", "weekly"
	TargetDays   []int  `json:"target_days,omitempty"`
	CurrentStreak int   `json:"current_streak,omitempty"`
	BestStreak    int   `json:"best_streak,omitempty"`

	// Checklist
	Priority string `json:"priority,omitempty"` // "low", "medium", "high"
}

type CreateItemRequest struct {
	ParentID *uuid.UUID      `json:"parent_id"`
	Title    string          `json:"title" binding:"required,min=1,max=500"`
	Content  string          `json:"content" binding:"max=10000"`
	Status   ItemStatus      `json:"status"`
	Position int             `json:"position"`
	DueDate  *time.Time      `json:"due_date"`
	Metadata json.RawMessage `json:"metadata"`
}

type UpdateItemRequest struct {
	Title       *string          `json:"title" binding:"omitempty,min=1,max=500"`
	Content     *string          `json:"content" binding:"omitempty,max=10000"`
	Status      *ItemStatus      `json:"status"`
	Position    *int             `json:"position"`
	DueDate     *time.Time       `json:"due_date"`
	Metadata    *json.RawMessage `json:"metadata"`
	CompletedAt *time.Time       `json:"completed_at"`
}

type CompleteItemRequest struct {
	Completed bool `json:"completed"`
}

type ReorderItemsRequest struct {
	ItemIDs []uuid.UUID `json:"item_ids" binding:"required,min=1"`
}

type MoveItemRequest struct {
	BoardID  uuid.UUID `json:"board_id" binding:"required"`
	Position int       `json:"position"`
}

type ItemFilter struct {
	Status    *ItemStatus `json:"status"`
	DueBefore *time.Time  `json:"due_before"`
	DueAfter  *time.Time  `json:"due_after"`
	ParentID  *uuid.UUID  `json:"parent_id"`
}
