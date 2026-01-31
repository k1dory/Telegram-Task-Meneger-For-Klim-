package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/repository"
)

type ItemService struct {
	itemRepo       repository.ItemRepository
	boardRepo      repository.BoardRepository
	reminderRepo   repository.ReminderRepository
	activityRepo   repository.ActivityLogRepository
	habitRepo      repository.HabitCompletionRepository
}

func NewItemService(
	itemRepo repository.ItemRepository,
	boardRepo repository.BoardRepository,
	reminderRepo repository.ReminderRepository,
	activityRepo repository.ActivityLogRepository,
	habitRepo repository.HabitCompletionRepository,
) *ItemService {
	return &ItemService{
		itemRepo:     itemRepo,
		boardRepo:    boardRepo,
		reminderRepo: reminderRepo,
		activityRepo: activityRepo,
		habitRepo:    habitRepo,
	}
}

// GetItemsByBoard returns all items in a board
func (s *ItemService) GetItemsByBoard(ctx context.Context, userID int64, boardID uuid.UUID, filter *domain.ItemFilter) ([]domain.Item, error) {
	// Check board ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, boardID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	return s.itemRepo.GetByBoardID(ctx, boardID, filter)
}

// GetItemByID returns an item by ID
func (s *ItemService) GetItemByID(ctx context.Context, userID int64, itemID uuid.UUID) (*domain.Item, error) {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	return item, nil
}

// GetItemWithChildren returns an item with its children
func (s *ItemService) GetItemWithChildren(ctx context.Context, userID int64, itemID uuid.UUID) (*domain.Item, error) {
	item, err := s.itemRepo.GetWithChildren(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	return item, nil
}

// CreateItem creates a new item
func (s *ItemService) CreateItem(ctx context.Context, userID int64, boardID uuid.UUID, req *domain.CreateItemRequest) (*domain.Item, error) {
	// Check board ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, boardID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	item := &domain.Item{
		BoardID:  boardID,
		ParentID: req.ParentID,
		Title:    req.Title,
		Content:  req.Content,
		Status:   req.Status,
		Position: req.Position,
		DueDate:  req.DueDate,
		Metadata: req.Metadata,
	}

	if item.Status == "" {
		item.Status = domain.ItemStatusPending
	}

	if err := s.itemRepo.Create(ctx, item); err != nil {
		return nil, err
	}

	// Log activity
	_ = s.activityRepo.Create(ctx, &domain.ActivityLog{
		UserID:     userID,
		Action:     "create",
		EntityType: "item",
		EntityID:   item.ID,
	})

	return item, nil
}

// UpdateItem updates an existing item
func (s *ItemService) UpdateItem(ctx context.Context, userID int64, itemID uuid.UUID, req *domain.UpdateItemRequest) (*domain.Item, error) {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	// Apply updates
	if req.Title != nil {
		item.Title = *req.Title
	}
	if req.Content != nil {
		item.Content = *req.Content
	}
	if req.Status != nil {
		item.Status = *req.Status
	}
	if req.Position != nil {
		item.Position = *req.Position
	}
	if req.DueDate != nil {
		item.DueDate = req.DueDate
	}
	if req.Metadata != nil {
		item.Metadata = *req.Metadata
	}
	if req.CompletedAt != nil {
		item.CompletedAt = req.CompletedAt
	}

	if err := s.itemRepo.Update(ctx, item); err != nil {
		return nil, err
	}

	// Log activity
	_ = s.activityRepo.Create(ctx, &domain.ActivityLog{
		UserID:     userID,
		Action:     "update",
		EntityType: "item",
		EntityID:   item.ID,
	})

	return item, nil
}

// DeleteItem deletes an item
func (s *ItemService) DeleteItem(ctx context.Context, userID int64, itemID uuid.UUID) error {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return err
	}

	// Check ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return err
	}

	if ownerID != userID {
		return domain.ErrForbidden
	}

	// Delete associated reminders
	_ = s.reminderRepo.DeleteByItemID(ctx, itemID)

	if err := s.itemRepo.Delete(ctx, itemID); err != nil {
		return err
	}

	// Log activity
	_ = s.activityRepo.Create(ctx, &domain.ActivityLog{
		UserID:     userID,
		Action:     "delete",
		EntityType: "item",
		EntityID:   itemID,
	})

	return nil
}

// CompleteItem marks an item as completed or uncompleted
func (s *ItemService) CompleteItem(ctx context.Context, userID int64, itemID uuid.UUID, completed bool) (*domain.Item, error) {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	if err := s.itemRepo.Complete(ctx, itemID, completed); err != nil {
		return nil, err
	}

	// Get updated item
	item, err = s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Log activity
	action := "complete"
	if !completed {
		action = "uncomplete"
	}
	_ = s.activityRepo.Create(ctx, &domain.ActivityLog{
		UserID:     userID,
		Action:     action,
		EntityType: "item",
		EntityID:   itemID,
	})

	return item, nil
}

// ReorderItems updates item positions in a board
func (s *ItemService) ReorderItems(ctx context.Context, userID int64, boardID uuid.UUID, itemIDs []uuid.UUID) error {
	// Check board ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, boardID)
	if err != nil {
		return err
	}

	if ownerID != userID {
		return domain.ErrForbidden
	}

	return s.itemRepo.UpdatePositions(ctx, boardID, itemIDs)
}

// MoveItem moves an item to a different board
func (s *ItemService) MoveItem(ctx context.Context, userID int64, itemID uuid.UUID, req *domain.MoveItemRequest) (*domain.Item, error) {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Check ownership of source board
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	// Check ownership of destination board
	destOwnerID, err := s.itemRepo.GetBoardOwner(ctx, req.BoardID)
	if err != nil {
		return nil, err
	}

	if destOwnerID != userID {
		return nil, domain.ErrForbidden
	}

	// Update item
	item.BoardID = req.BoardID
	item.Position = req.Position

	if err := s.itemRepo.Update(ctx, item); err != nil {
		return nil, err
	}

	return item, nil
}

// SetReminder creates a reminder for an item
func (s *ItemService) SetReminder(ctx context.Context, userID int64, itemID uuid.UUID, req *domain.CreateReminderRequest) (*domain.Reminder, error) {
	// Validate reminder time is in the future (with 1 minute buffer for clock skew)
	if req.RemindAt.Before(time.Now().Add(-1 * time.Minute)) {
		return nil, domain.ErrInvalidInput
	}

	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	reminder := &domain.Reminder{
		UserID:   userID,
		ItemID:   itemID,
		RemindAt: req.RemindAt,
		Message:  req.Message,
	}

	if err := s.reminderRepo.Create(ctx, reminder); err != nil {
		return nil, err
	}

	return reminder, nil
}

// CompleteHabit marks a habit as completed for a specific date
func (s *ItemService) CompleteHabit(ctx context.Context, userID int64, itemID uuid.UUID, date time.Time) error {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return err
	}

	// Check ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return err
	}

	if ownerID != userID {
		return domain.ErrForbidden
	}

	completion := &domain.HabitCompletion{
		ItemID:        itemID,
		CompletedDate: date,
	}

	return s.habitRepo.Create(ctx, completion)
}

// UncompleteHabit removes a habit completion for a specific date
func (s *ItemService) UncompleteHabit(ctx context.Context, userID int64, itemID uuid.UUID, date time.Time) error {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return err
	}

	// Check ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return err
	}

	if ownerID != userID {
		return domain.ErrForbidden
	}

	return s.habitRepo.Delete(ctx, itemID, date)
}

// GetHabitCompletions returns habit completions for a date range
func (s *ItemService) GetHabitCompletions(ctx context.Context, userID int64, itemID uuid.UUID, from, to time.Time) ([]domain.HabitCompletion, error) {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	return s.habitRepo.GetByItemID(ctx, itemID, from, to)
}

// GetHabitStreak returns current and best streak for a habit
func (s *ItemService) GetHabitStreak(ctx context.Context, userID int64, itemID uuid.UUID) (current int, best int, err error) {
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return 0, 0, err
	}

	// Check ownership
	ownerID, err := s.itemRepo.GetBoardOwner(ctx, item.BoardID)
	if err != nil {
		return 0, 0, err
	}

	if ownerID != userID {
		return 0, 0, domain.ErrForbidden
	}

	return s.habitRepo.GetStreak(ctx, itemID)
}

// GetDueSoonItems returns items due within a time period
func (s *ItemService) GetDueSoonItems(ctx context.Context, userID int64, within time.Duration) ([]domain.Item, error) {
	return s.itemRepo.GetDueSoon(ctx, userID, within)
}
