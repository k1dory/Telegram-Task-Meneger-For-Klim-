package domain

import (
	"time"

	"github.com/google/uuid"
)

type Folder struct {
	ID        uuid.UUID `json:"id"`
	UserID    int64     `json:"user_id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	Icon      string    `json:"icon,omitempty"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Boards    []Board   `json:"boards,omitempty"`
}

type CreateFolderRequest struct {
	Name     string `json:"name" binding:"required,min=1,max=255"`
	Color    string `json:"color" binding:"omitempty,hexcolor"`
	Icon     string `json:"icon" binding:"omitempty,max=50"`
	Position int    `json:"position"`
}

type UpdateFolderRequest struct {
	Name     *string `json:"name" binding:"omitempty,min=1,max=255"`
	Color    *string `json:"color" binding:"omitempty,hexcolor"`
	Icon     *string `json:"icon" binding:"omitempty,max=50"`
	Position *int    `json:"position"`
}

type ReorderFoldersRequest struct {
	FolderIDs []uuid.UUID `json:"folder_ids" binding:"required,min=1"`
}
