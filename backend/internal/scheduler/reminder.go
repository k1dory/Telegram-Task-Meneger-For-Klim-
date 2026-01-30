package scheduler

import (
	"context"
	"log/slog"
	"math/rand"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/telegram-task-manager/backend/internal/repository"
	"github.com/telegram-task-manager/backend/internal/service"
)

type ReminderScheduler struct {
	cron              *cron.Cron
	notificationSvc   *service.NotificationService
	userRepo          repository.UserRepository
	itemRepo          repository.ItemRepository
	reminderRepo      repository.ReminderRepository
	logger            *slog.Logger
	inactivityHours   []int // Hours of inactivity before sending reminder
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
		inactivityHours: []int{6, 8, 12}, // Random interval selection
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

// checkInactiveUsers sends reminders to inactive users
func (s *ReminderScheduler) checkInactiveUsers() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	s.logger.Debug("checking inactive users")

	// Pick a random inactivity threshold
	hoursThreshold := s.inactivityHours[rand.Intn(len(s.inactivityHours))]
	since := time.Now().Add(-time.Duration(hoursThreshold) * time.Hour)

	inactiveUsers, err := s.userRepo.GetInactiveUsers(ctx, since)
	if err != nil {
		s.logger.Error("failed to get inactive users", "error", err)
		return
	}

	s.logger.Info("found inactive users",
		"count", len(inactiveUsers),
		"threshold_hours", hoursThreshold,
	)

	// Limit notifications to avoid spam
	maxNotifications := 50
	sent := 0

	for _, user := range inactiveUsers {
		if sent >= maxNotifications {
			break
		}

		// Additional randomization - only notify ~30% of inactive users per check
		if rand.Float32() > 0.3 {
			continue
		}

		if err := s.notificationSvc.SendInactivityReminder(ctx, user.UserID); err != nil {
			s.logger.Error("failed to send inactivity reminder",
				"user_id", user.UserID,
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

	// Send one notification per user with all their overdue tasks
	for userID, tasks := range userTasks {
		// Convert to domain.OverdueTask slice
		domainTasks := make([]struct {
			Title     string
			BoardName string
			ItemID    string
		}, len(tasks))

		for i, t := range tasks {
			domainTasks[i].Title = t.Title
			domainTasks[i].BoardName = t.BoardName
		}

		s.logger.Info("sending overdue notification",
			"user_id", userID,
			"task_count", len(tasks),
		)

		// Send notification via the notification service
		if err := s.notificationSvc.SendOverdueTasksNotification(ctx, userID, overdueTasks); err != nil {
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
