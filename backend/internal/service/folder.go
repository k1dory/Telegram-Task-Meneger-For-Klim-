package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/repository"
)

type FolderService struct {
	folderRepo repository.FolderRepository
	activityRepo repository.ActivityLogRepository
}

func NewFolderService(
	folderRepo repository.FolderRepository,
	activityRepo repository.ActivityLogRepository,
) *FolderService {
	return &FolderService{
		folderRepo:   folderRepo,
		activityRepo: activityRepo,
	}
}

// GetUserFolders returns all folders for a user
func (s *FolderService) GetUserFolders(ctx context.Context, userID int64) ([]domain.Folder, error) {
	return s.folderRepo.GetByUserID(ctx, userID)
}

// GetFolderByID returns a folder by ID with access check
func (s *FolderService) GetFolderByID(ctx context.Context, userID int64, folderID uuid.UUID) (*domain.Folder, error) {
	folder, err := s.folderRepo.GetByID(ctx, folderID)
	if err != nil {
		return nil, err
	}

	if folder.UserID != userID {
		return nil, domain.ErrForbidden
	}

	return folder, nil
}

// GetFolderWithBoards returns a folder with its boards
func (s *FolderService) GetFolderWithBoards(ctx context.Context, userID int64, folderID uuid.UUID) (*domain.Folder, error) {
	folder, err := s.folderRepo.GetByIDWithBoards(ctx, folderID)
	if err != nil {
		return nil, err
	}

	if folder.UserID != userID {
		return nil, domain.ErrForbidden
	}

	return folder, nil
}

// CreateFolder creates a new folder
func (s *FolderService) CreateFolder(ctx context.Context, userID int64, req *domain.CreateFolderRequest) (*domain.Folder, error) {
	folder := &domain.Folder{
		UserID:   userID,
		Name:     req.Name,
		Color:    req.Color,
		Icon:     req.Icon,
		Position: req.Position,
	}

	if folder.Color == "" {
		folder.Color = "#8b5cf6" // Default purple
	}

	if err := s.folderRepo.Create(ctx, folder); err != nil {
		return nil, err
	}

	// Log activity
	_ = s.activityRepo.Create(ctx, &domain.ActivityLog{
		UserID:     userID,
		Action:     "create",
		EntityType: "folder",
		EntityID:   folder.ID,
	})

	return folder, nil
}

// UpdateFolder updates an existing folder
func (s *FolderService) UpdateFolder(ctx context.Context, userID int64, folderID uuid.UUID, req *domain.UpdateFolderRequest) (*domain.Folder, error) {
	folder, err := s.folderRepo.GetByID(ctx, folderID)
	if err != nil {
		return nil, err
	}

	if folder.UserID != userID {
		return nil, domain.ErrForbidden
	}

	// Apply updates
	if req.Name != nil {
		folder.Name = *req.Name
	}
	if req.Color != nil {
		folder.Color = *req.Color
	}
	if req.Icon != nil {
		folder.Icon = *req.Icon
	}
	if req.Position != nil {
		folder.Position = *req.Position
	}

	if err := s.folderRepo.Update(ctx, folder); err != nil {
		return nil, err
	}

	// Log activity
	_ = s.activityRepo.Create(ctx, &domain.ActivityLog{
		UserID:     userID,
		Action:     "update",
		EntityType: "folder",
		EntityID:   folder.ID,
	})

	return folder, nil
}

// DeleteFolder deletes a folder
func (s *FolderService) DeleteFolder(ctx context.Context, userID int64, folderID uuid.UUID) error {
	folder, err := s.folderRepo.GetByID(ctx, folderID)
	if err != nil {
		return err
	}

	if folder.UserID != userID {
		return domain.ErrForbidden
	}

	if err := s.folderRepo.Delete(ctx, folderID); err != nil {
		return err
	}

	// Log activity
	_ = s.activityRepo.Create(ctx, &domain.ActivityLog{
		UserID:     userID,
		Action:     "delete",
		EntityType: "folder",
		EntityID:   folderID,
	})

	return nil
}

// ReorderFolders updates folder positions
func (s *FolderService) ReorderFolders(ctx context.Context, userID int64, folderIDs []uuid.UUID) error {
	// Verify all folders belong to user
	for _, id := range folderIDs {
		folder, err := s.folderRepo.GetByID(ctx, id)
		if err != nil {
			return err
		}
		if folder.UserID != userID {
			return domain.ErrForbidden
		}
	}

	return s.folderRepo.UpdatePositions(ctx, userID, folderIDs)
}
