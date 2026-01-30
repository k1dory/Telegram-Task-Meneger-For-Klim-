package service

import (
	"context"

	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/repository"
)

type AnalyticsService struct {
	userRepo   repository.UserRepository
	folderRepo repository.FolderRepository
	boardRepo  repository.BoardRepository
	itemRepo   repository.ItemRepository
}

func NewAnalyticsService(
	userRepo repository.UserRepository,
	folderRepo repository.FolderRepository,
	boardRepo repository.BoardRepository,
	itemRepo repository.ItemRepository,
) *AnalyticsService {
	return &AnalyticsService{
		userRepo:   userRepo,
		folderRepo: folderRepo,
		boardRepo:  boardRepo,
		itemRepo:   itemRepo,
	}
}

// GetOverview returns dashboard overview statistics
func (s *AnalyticsService) GetOverview(ctx context.Context, userID int64) (*domain.AnalyticsOverview, error) {
	totalTasks, err := s.itemRepo.CountByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	completedTasks, err := s.itemRepo.CountCompletedByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	overdueTasks, err := s.itemRepo.CountOverdueByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	totalFolders, err := s.folderRepo.CountByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	totalBoards, err := s.boardRepo.CountByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	pendingTasks := totalTasks - completedTasks

	var completionRate float64
	if totalTasks > 0 {
		completionRate = float64(completedTasks) / float64(totalTasks) * 100
	}

	return &domain.AnalyticsOverview{
		TotalTasks:     totalTasks,
		CompletedTasks: completedTasks,
		PendingTasks:   pendingTasks,
		OverdueTasks:   overdueTasks,
		CompletionRate: completionRate,
		TotalFolders:   totalFolders,
		TotalBoards:    totalBoards,
	}, nil
}

// GetCompletionStats returns completion statistics for the last N days
func (s *AnalyticsService) GetCompletionStats(ctx context.Context, userID int64, days int) ([]domain.CompletionStats, error) {
	if days <= 0 {
		days = 7
	}
	if days > 90 {
		days = 90
	}

	return s.itemRepo.GetCompletionStats(ctx, userID, days)
}
