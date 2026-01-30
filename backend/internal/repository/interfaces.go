package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/telegram-task-manager/backend/internal/domain"
)

type UserRepository interface {
	GetByID(ctx context.Context, id int64) (*domain.User, error)
	Create(ctx context.Context, user *domain.User) error
	Update(ctx context.Context, user *domain.User) error
	UpdateSettings(ctx context.Context, userID int64, settings *domain.UserSettings) error
	UpdateLastActive(ctx context.Context, userID int64) error
	GetInactiveUsers(ctx context.Context, since time.Time) ([]domain.InactiveUser, error)
	GetUsersForReminderHour(ctx context.Context, hour int) ([]domain.User, error)
}

type FolderRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Folder, error)
	GetByIDWithBoards(ctx context.Context, id uuid.UUID) (*domain.Folder, error)
	GetByUserID(ctx context.Context, userID int64) ([]domain.Folder, error)
	Create(ctx context.Context, folder *domain.Folder) error
	Update(ctx context.Context, folder *domain.Folder) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdatePositions(ctx context.Context, userID int64, folderIDs []uuid.UUID) error
	CountByUserID(ctx context.Context, userID int64) (int, error)
}

type BoardRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Board, error)
	GetByIDWithItems(ctx context.Context, id uuid.UUID) (*domain.Board, error)
	GetByFolderID(ctx context.Context, folderID uuid.UUID) ([]domain.Board, error)
	Create(ctx context.Context, board *domain.Board) error
	Update(ctx context.Context, board *domain.Board) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdatePositions(ctx context.Context, folderID uuid.UUID, boardIDs []uuid.UUID) error
	CountByUserID(ctx context.Context, userID int64) (int, error)
	GetFolderOwner(ctx context.Context, folderID uuid.UUID) (int64, error)
}

type ItemRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Item, error)
	GetByBoardID(ctx context.Context, boardID uuid.UUID, filter *domain.ItemFilter) ([]domain.Item, error)
	GetWithChildren(ctx context.Context, id uuid.UUID) (*domain.Item, error)
	Create(ctx context.Context, item *domain.Item) error
	Update(ctx context.Context, item *domain.Item) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdatePositions(ctx context.Context, boardID uuid.UUID, itemIDs []uuid.UUID) error
	Complete(ctx context.Context, id uuid.UUID, completed bool) error
	GetOverdueTasks(ctx context.Context) ([]domain.OverdueTask, error)
	GetDueSoon(ctx context.Context, userID int64, within time.Duration) ([]domain.Item, error)
	CountByUserID(ctx context.Context, userID int64) (int, error)
	CountCompletedByUserID(ctx context.Context, userID int64) (int, error)
	CountOverdueByUserID(ctx context.Context, userID int64) (int, error)
	GetBoardOwner(ctx context.Context, boardID uuid.UUID) (int64, error)
	GetCompletionStats(ctx context.Context, userID int64, days int) ([]domain.CompletionStats, error)
}

type ReminderRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Reminder, error)
	GetByItemID(ctx context.Context, itemID uuid.UUID) ([]domain.Reminder, error)
	GetPending(ctx context.Context, before time.Time) ([]domain.Reminder, error)
	Create(ctx context.Context, reminder *domain.Reminder) error
	Update(ctx context.Context, reminder *domain.Reminder) error
	Delete(ctx context.Context, id uuid.UUID) error
	MarkSent(ctx context.Context, id uuid.UUID) error
	DeleteByItemID(ctx context.Context, itemID uuid.UUID) error
}

type ActivityLogRepository interface {
	Create(ctx context.Context, log *domain.ActivityLog) error
	GetByUserID(ctx context.Context, userID int64, limit int) ([]domain.ActivityLog, error)
	GetLastActivity(ctx context.Context, userID int64) (*domain.ActivityLog, error)
}

type HabitCompletionRepository interface {
	Create(ctx context.Context, completion *domain.HabitCompletion) error
	Delete(ctx context.Context, itemID uuid.UUID, date time.Time) error
	GetByItemID(ctx context.Context, itemID uuid.UUID, from, to time.Time) ([]domain.HabitCompletion, error)
	GetStreak(ctx context.Context, itemID uuid.UUID) (current int, best int, err error)
}
