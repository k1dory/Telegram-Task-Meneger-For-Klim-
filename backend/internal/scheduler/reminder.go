package scheduler

import (
	"context"
	"log/slog"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/repository"
	"github.com/telegram-task-manager/backend/internal/service"
)

type ReminderScheduler struct {
	cron            *cron.Cron
	notificationSvc *service.NotificationService
	userRepo        repository.UserRepository
	itemRepo        repository.ItemRepository
	reminderRepo    repository.ReminderRepository
	logger          *slog.Logger
}

func NewReminderScheduler(
	notificationSvc *service.NotificationService,
	userRepo repository.UserRepository,
	itemRepo repository.ItemRepository,
	reminderRepo repository.ReminderRepository,
	logger *slog.Logger,
) *ReminderScheduler {
	return &ReminderScheduler{
		cron:            cron.New(cron.WithSeconds()),
		notificationSvc: notificationSvc,
		userRepo:        userRepo,
		itemRepo:        itemRepo,
		reminderRepo:    reminderRepo,
		logger:          logger,
	}
}

// Start starts the scheduler
func (s *ReminderScheduler) Start() error {
	// Check reminders every 5 minutes
	_, err := s.cron.AddFunc("0 */5 * * * *", s.checkReminders)
	if err != nil {
		return err
	}

	// Check inactive users every hour
	_, err = s.cron.AddFunc("0 0 * * * *", s.checkInactiveUsers)
	if err != nil {
		return err
	}

	// Check overdue tasks daily at midnight
	_, err = s.cron.AddFunc("0 0 0 * * *", s.checkOverdueTasks)
	if err != nil {
		return err
	}

	// Check tasks due soon every 30 minutes
	_, err = s.cron.AddFunc("0 */30 * * * *", s.checkDueSoonTasks)
	if err != nil {
		return err
	}

	s.cron.Start()
	s.logger.Info("scheduler started")

	return nil
}

// Stop stops the scheduler
func (s *ReminderScheduler) Stop() {
	ctx := s.cron.Stop()
	<-ctx.Done()
	s.logger.Info("scheduler stopped")
}

// checkReminders sends pending reminders
func (s *ReminderScheduler) checkReminders() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	s.logger.Debug("checking pending reminders")

	reminders, err := s.reminderRepo.GetPending(ctx, time.Now())
	if err != nil {
		s.logger.Error("failed to get pending reminders", "error", err)
		return
	}

	s.logger.Info("found pending reminders", "count", len(reminders))

	for _, reminder := range reminders {
		if err := s.notificationSvc.SendReminder(ctx, &reminder); err != nil {
			s.logger.Error("failed to send reminder",
				"reminder_id", reminder.ID,
				"user_id", reminder.UserID,
				"error", err,
			)
			continue
		}
	}
}

// checkInactiveUsers sends reminders to inactive users based on their reminder_hours settings
func (s *ReminderScheduler) checkInactiveUsers() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	s.logger.Debug("checking inactive users")

	currentHour := time.Now().Hour()

	// Get users who have notifications enabled AND current hour is in their reminder_hours
	usersToNotify, err := s.userRepo.GetUsersForReminderHour(ctx, currentHour)
	if err != nil {
		s.logger.Error("failed to get users for reminder hour", "error", err, "hour", currentHour)
		return
	}

	s.logger.Info("found users for reminder",
		"count", len(usersToNotify),
		"hour", currentHour,
	)

	// Filter to only users who have been inactive for at least 6 hours
	since := time.Now().Add(-6 * time.Hour)
	sent := 0
	maxNotifications := 50

	for _, user := range usersToNotify {
		if sent >= maxNotifications {
			break
		}

		// Check if user is actually inactive
		if user.LastActiveAt != nil && user.LastActiveAt.After(since) {
			continue
		}

		if err := s.notificationSvc.SendInactivityReminder(ctx, user.TelegramID); err != nil {
			s.logger.Error("failed to send inactivity reminder",
				"user_id", user.TelegramID,
				"error", err,
			)
			continue
		}

		sent++
	}

	s.logger.Info("sent inactivity reminders", "count", sent)
}

// checkOverdueTasks sends notifications about overdue tasks
func (s *ReminderScheduler) checkOverdueTasks() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	s.logger.Debug("checking overdue tasks")

	overdueTasks, err := s.itemRepo.GetOverdueTasks(ctx)
	if err != nil {
		s.logger.Error("failed to get overdue tasks", "error", err)
		return
	}

	s.logger.Info("found overdue tasks", "count", len(overdueTasks))

	if len(overdueTasks) == 0 {
		return
	}

	// Group tasks by user
	userTasks := make(map[int64][]struct {
		ItemID    interface{}
		Title     string
		BoardName string
	})

	for _, task := range overdueTasks {
		userTasks[task.UserID] = append(userTasks[task.UserID], struct {
			ItemID    interface{}
			Title     string
			BoardName string
		}{
			ItemID:    task.ItemID,
			Title:     task.Title,
			BoardName: task.BoardName,
		})
	}

	// Send one notification per user with ONLY their overdue tasks
	for userID := range userTasks {
		// Filter overdue tasks to get only this user's tasks
		var userOverdueTasks []domain.OverdueTask
		for _, task := range overdueTasks {
			if task.UserID == userID {
				userOverdueTasks = append(userOverdueTasks, task)
			}
		}

		if len(userOverdueTasks) == 0 {
			continue
		}

		s.logger.Info("sending overdue notification",
			"user_id", userID,
			"task_count", len(userOverdueTasks),
		)

		// Send notification via the notification service with only this user's tasks
		if err := s.notificationSvc.SendOverdueTasksNotification(ctx, userID, userOverdueTasks); err != nil {
			s.logger.Error("failed to send overdue tasks notification",
				"user_id", userID,
				"error", err,
			)
		}
	}
}

// checkDueSoonTasks sends notifications about tasks due soon
func (s *ReminderScheduler) checkDueSoonTasks() {
	_, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	s.logger.Debug("checking tasks due soon")

	// This would require getting all users and checking their tasks
	// For now, this is handled by the reminder system
	// Users can set explicit reminders for their tasks

	s.logger.Debug("due soon check completed")
}

// RunOnce runs all checks once (useful for testing)
func (s *ReminderScheduler) RunOnce() {
	s.checkReminders()
	s.checkInactiveUsers()
	s.checkOverdueTasks()
	s.checkDueSoonTasks()
}

// AddCustomJob adds a custom cron job
func (s *ReminderScheduler) AddCustomJob(spec string, cmd func()) (cron.EntryID, error) {
	return s.cron.AddFunc(spec, cmd)
}

// GetEntries returns all scheduled entries
func (s *ReminderScheduler) GetEntries() []cron.Entry {
	return s.cron.Entries()
}
