package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type BoardType string

const (
	BoardTypeNotes        BoardType = "notes"
	BoardTypeTimeManager  BoardType = "time_manager"
	BoardTypeKanban       BoardType = "kanban"
	BoardTypeChecklist    BoardType = "checklist"
	BoardTypeCalendar     BoardType = "calendar"
	BoardTypeHabitTracker BoardType = "habit_tracker"
)

func (bt BoardType) IsValid() bool {
	switch bt {
	case BoardTypeNotes, BoardTypeTimeManager, BoardTypeKanban,
		BoardTypeChecklist, BoardTypeCalendar, BoardTypeHabitTracker:
		return true
	}
	return false
}

type Board struct {
	ID        uuid.UUID       `json:"id"`
	FolderID  uuid.UUID       `json:"folder_id"`
	Name      string          `json:"name"`
	Type      BoardType       `json:"type"`
	Settings  json.RawMessage `json:"settings"`
	Position  int             `json:"position"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
	Items     []Item          `json:"items,omitempty"`
}

type BoardSettings struct {
	// Kanban specific
	Columns []KanbanColumn `json:"columns,omitempty"`

	// Time manager specific
	TimeSlots []string `json:"time_slots,omitempty"`

	// Calendar specific
	DefaultView string `json:"default_view,omitempty"` // "day", "week", "month"

	// Habit tracker specific
	TrackingPeriod string `json:"tracking_period,omitempty"` // "daily", "weekly"
}

type KanbanColumn struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

type CreateBoardRequest struct {
	Name     string          `json:"name" binding:"required,min=1,max=255"`
	Type     BoardType       `json:"type" binding:"required"`
	Settings json.RawMessage `json:"settings"`
	Position int             `json:"position"`
}

type UpdateBoardRequest struct {
	Name     *string          `json:"name" binding:"omitempty,min=1,max=255"`
	Settings *json.RawMessage `json:"settings"`
	Position *int             `json:"position"`
}

type ReorderBoardsRequest struct {
	BoardIDs []uuid.UUID `json:"board_ids" binding:"required,min=1"`
}
