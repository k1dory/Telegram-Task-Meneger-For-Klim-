package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/repository"
	"github.com/telegram-task-manager/backend/pkg/telegram"
)

type NotificationService struct {
	bot            *telegram.Bot
	userRepo       repository.UserRepository
	itemRepo       repository.ItemRepository
	reminderRepo   repository.ReminderRepository
	appURL         string
	logger         *slog.Logger
}

func NewNotificationService(
	bot *telegram.Bot,
	userRepo repository.UserRepository,
	itemRepo repository.ItemRepository,
	reminderRepo repository.ReminderRepository,
	appURL string,
	logger *slog.Logger,
) *NotificationService {
	return &NotificationService{
		bot:          bot,
		userRepo:     userRepo,
		itemRepo:     itemRepo,
		reminderRepo: reminderRepo,
		appURL:       appURL,
		logger:       logger,
	}
}

// SendReminder sends a task reminder notification
func (s *NotificationService) SendReminder(ctx context.Context, reminder *domain.Reminder) error {
	// Build message
	var message string
	if reminder.Message != "" {
		message = fmt.Sprintf("Reminder: %s", reminder.Message)
	} else if reminder.Item != nil {
		message = fmt.Sprintf("Reminder: <b>%s</b>", reminder.Item.Title)
		if reminder.Item.DueDate != nil {
			message += fmt.Sprintf("\nDue: %s", reminder.Item.DueDate.Format("Jan 2, 2006 15:04"))
		}
	} else {
		message = "You have a reminder!"
	}

	// Send notification via Telegram
	_, err := s.bot.SendReminderMessage(
		reminder.UserID,
		message,
		s.appURL,
		reminder.ItemID.String(),
	)

	if err != nil {
		s.logger.Error("failed to send reminder",
			"user_id", reminder.UserID,
			"reminder_id", reminder.ID,
			"error", err,
		)
		return err
	}

	// Mark reminder as sent
	if err := s.reminderRepo.MarkSent(ctx, reminder.ID); err != nil {
		s.logger.Error("failed to mark reminder as sent",
			"reminder_id", reminder.ID,
			"error", err,
		)
		return err
	}

	s.logger.Info("reminder sent",
		"user_id", reminder.UserID,
		"reminder_id", reminder.ID,
	)

	return nil
}

// SendInactivityReminder sends a reminder to inactive users
func (s *NotificationService) SendInactivityReminder(ctx context.Context, userID int64) error {
	_, err := s.bot.SendInactivityReminder(userID, s.appURL)
	if err != nil {
		s.logger.Error("failed to send inactivity reminder",
			"user_id", userID,
			"error", err,
		)
		return err
	}

	// Update last active to prevent immediate re-notification
	_ = s.userRepo.UpdateLastActive(ctx, userID)

	s.logger.Info("inactivity reminder sent", "user_id", userID)
	return nil
}

// SendOverdueTasksNotification sends notification about overdue tasks
func (s *NotificationService) SendOverdueTasksNotification(ctx context.Context, userID int64, tasks []domain.OverdueTask) error {
	if len(tasks) == 0 {
		return nil
	}

	taskInfos := make([]telegram.OverdueTaskInfo, len(tasks))
	for i, task := range tasks {
		taskInfos[i] = telegram.OverdueTaskInfo{
			Title:     task.Title,
			BoardName: task.BoardName,
			ItemID:    task.ItemID.String(),
		}
	}

	_, err := s.bot.SendOverdueTasksNotification(userID, taskInfos, s.appURL)
	if err != nil {
		s.logger.Error("failed to send overdue tasks notification",
			"user_id", userID,
			"task_count", len(tasks),
			"error", err,
		)
		return err
	}

	s.logger.Info("overdue tasks notification sent",
		"user_id", userID,
		"task_count", len(tasks),
	)

	return nil
}

// SendDueSoonNotification sends notification about tasks due soon
func (s *NotificationService) SendDueSoonNotification(ctx context.Context, userID int64, item *domain.Item) error {
	message := fmt.Sprintf("Task due soon: <b>%s</b>", item.Title)
	if item.DueDate != nil {
		message += fmt.Sprintf("\nDue: %s", item.DueDate.Format("Jan 2, 2006 15:04"))
	}

	_, err := s.bot.SendReminderMessage(userID, message, s.appURL, item.ID.String())
	if err != nil {
		s.logger.Error("failed to send due soon notification",
			"user_id", userID,
			"item_id", item.ID,
			"error", err,
		)
		return err
	}

	s.logger.Info("due soon notification sent",
		"user_id", userID,
		"item_id", item.ID,
	)

	return nil
}

// NotifyTaskCompleted sends a celebratory message when a task is completed
func (s *NotificationService) NotifyTaskCompleted(ctx context.Context, userID int64, taskTitle string) error {
	message := fmt.Sprintf("Great job! You completed: <b>%s</b>", taskTitle)

	_, err := s.bot.SendMessage(userID, message)
	if err != nil {
		s.logger.Warn("failed to send task completion notification",
			"user_id", userID,
			"error", err,
		)
		// Don't return error - this is a non-critical notification
		return nil
	}

	return nil
}
