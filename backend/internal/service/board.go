package service

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/repository"
)

type BoardService struct {
	boardRepo    repository.BoardRepository
	folderRepo   repository.FolderRepository
	activityRepo repository.ActivityLogRepository
}

func NewBoardService(
	boardRepo repository.BoardRepository,
	folderRepo repository.FolderRepository,
	activityRepo repository.ActivityLogRepository,
) *BoardService {
	return &BoardService{
		boardRepo:    boardRepo,
		folderRepo:   folderRepo,
		activityRepo: activityRepo,
	}
}

// GetBoardsByFolder returns all boards in a folder
func (s *BoardService) GetBoardsByFolder(ctx context.Context, userID int64, folderID uuid.UUID) ([]domain.Board, error) {
	// Check folder ownership
	folder, err := s.folderRepo.GetByID(ctx, folderID)
	if err != nil {
		return nil, err
	}

	if folder.UserID != userID {
		return nil, domain.ErrForbidden
	}

	return s.boardRepo.GetByFolderID(ctx, folderID)
}

// GetBoardByID returns a board by ID
func (s *BoardService) GetBoardByID(ctx context.Context, userID int64, boardID uuid.UUID) (*domain.Board, error) {
	board, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, err
	}

	// Check ownership through folder
	ownerID, err := s.boardRepo.GetFolderOwner(ctx, board.FolderID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	return board, nil
}

// GetBoardWithItems returns a board with its items
func (s *BoardService) GetBoardWithItems(ctx context.Context, userID int64, boardID uuid.UUID) (*domain.Board, error) {
	board, err := s.boardRepo.GetByIDWithItems(ctx, boardID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	ownerID, err := s.boardRepo.GetFolderOwner(ctx, board.FolderID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	return board, nil
}

// CreateBoard creates a new board
func (s *BoardService) CreateBoard(ctx context.Context, userID int64, folderID uuid.UUID, req *domain.CreateBoardRequest) (*domain.Board, error) {
	// Check folder ownership
	folder, err := s.folderRepo.GetByID(ctx, folderID)
	if err != nil {
		return nil, err
	}

	if folder.UserID != userID {
		return nil, domain.ErrForbidden
	}

	// Validate board type
	if !req.Type.IsValid() {
		return nil, domain.ErrInvalidBoardType
	}

	// Set default settings based on board type
	settings := req.Settings
	if settings == nil {
		settings = s.getDefaultSettings(req.Type)
	}

	board := &domain.Board{
		FolderID: folderID,
		Name:     req.Name,
		Type:     req.Type,
		Settings: settings,
		Position: req.Position,
	}

	if err := s.boardRepo.Create(ctx, board); err != nil {
		return nil, err
	}

	// Log activity
	_ = s.activityRepo.Create(ctx, &domain.ActivityLog{
		UserID:     userID,
		Action:     "create",
		EntityType: "board",
		EntityID:   board.ID,
	})

	return board, nil
}

// UpdateBoard updates an existing board
func (s *BoardService) UpdateBoard(ctx context.Context, userID int64, boardID uuid.UUID, req *domain.UpdateBoardRequest) (*domain.Board, error) {
	board, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return nil, err
	}

	// Check ownership
	ownerID, err := s.boardRepo.GetFolderOwner(ctx, board.FolderID)
	if err != nil {
		return nil, err
	}

	if ownerID != userID {
		return nil, domain.ErrForbidden
	}

	// Apply updates
	if req.Name != nil {
		board.Name = *req.Name
	}
	if req.Settings != nil {
		board.Settings = *req.Settings
	}
	if req.Position != nil {
		board.Position = *req.Position
	}

	if err := s.boardRepo.Update(ctx, board); err != nil {
		return nil, err
	}

	// Log activity
	_ = s.activityRepo.Create(ctx, &domain.ActivityLog{
		UserID:     userID,
		Action:     "update",
		EntityType: "board",
		EntityID:   board.ID,
	})

	return board, nil
}

// DeleteBoard deletes a board
func (s *BoardService) DeleteBoard(ctx context.Context, userID int64, boardID uuid.UUID) error {
	board, err := s.boardRepo.GetByID(ctx, boardID)
	if err != nil {
		return err
	}

	// Check ownership
	ownerID, err := s.boardRepo.GetFolderOwner(ctx, board.FolderID)
	if err != nil {
		return err
	}

	if ownerID != userID {
		return domain.ErrForbidden
	}

	if err := s.boardRepo.Delete(ctx, boardID); err != nil {
		return err
	}

	// Log activity
	_ = s.activityRepo.Create(ctx, &domain.ActivityLog{
		UserID:     userID,
		Action:     "delete",
		EntityType: "board",
		EntityID:   boardID,
	})

	return nil
}

// ReorderBoards updates board positions in a folder
func (s *BoardService) ReorderBoards(ctx context.Context, userID int64, folderID uuid.UUID, boardIDs []uuid.UUID) error {
	// Check folder ownership
	folder, err := s.folderRepo.GetByID(ctx, folderID)
	if err != nil {
		return err
	}

	if folder.UserID != userID {
		return domain.ErrForbidden
	}

	return s.boardRepo.UpdatePositions(ctx, folderID, boardIDs)
}

func (s *BoardService) getDefaultSettings(boardType domain.BoardType) json.RawMessage {
	var settings interface{}

	switch boardType {
	case domain.BoardTypeKanban:
		settings = domain.BoardSettings{
			Columns: []domain.KanbanColumn{
				{ID: "todo", Name: "To Do", Color: "#6366f1"},
				{ID: "in-progress", Name: "In Progress", Color: "#f59e0b"},
				{ID: "done", Name: "Done", Color: "#10b981"},
			},
		}
	case domain.BoardTypeTimeManager:
		settings = domain.BoardSettings{
			TimeSlots: []string{"morning", "afternoon", "evening"},
		}
	case domain.BoardTypeCalendar:
		settings = domain.BoardSettings{
			DefaultView: "week",
		}
	case domain.BoardTypeHabitTracker:
		settings = domain.BoardSettings{
			TrackingPeriod: "daily",
		}
	default:
		settings = domain.BoardSettings{}
	}

	data, _ := json.Marshal(settings)
	return data
}
