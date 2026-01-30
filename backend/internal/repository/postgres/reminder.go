package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/telegram-task-manager/backend/internal/domain"
)

type ReminderRepository struct {
	db *pgxpool.Pool
}

func NewReminderRepository(db *pgxpool.Pool) *ReminderRepository {
	return &ReminderRepository{db: db}
}

func (r *ReminderRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Reminder, error) {
	query := `
		SELECT id, user_id, item_id, remind_at, message, sent, sent_at, created_at
		FROM reminders
		WHERE id = $1
	`

	var reminder domain.Reminder
	err := r.db.QueryRow(ctx, query, id).Scan(
		&reminder.ID,
		&reminder.UserID,
		&reminder.ItemID,
		&reminder.RemindAt,
		&reminder.Message,
		&reminder.Sent,
		&reminder.SentAt,
		&reminder.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}

	return &reminder, nil
}

func (r *ReminderRepository) GetByItemID(ctx context.Context, itemID uuid.UUID) ([]domain.Reminder, error) {
	query := `
		SELECT id, user_id, item_id, remind_at, message, sent, sent_at, created_at
		FROM reminders
		WHERE item_id = $1
		ORDER BY remind_at ASC
	`

	rows, err := r.db.Query(ctx, query, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reminders []domain.Reminder
	for rows.Next() {
		var reminder domain.Reminder
		if err := rows.Scan(
			&reminder.ID,
			&reminder.UserID,
			&reminder.ItemID,
			&reminder.RemindAt,
			&reminder.Message,
			&reminder.Sent,
			&reminder.SentAt,
			&reminder.CreatedAt,
		); err != nil {
			return nil, err
		}
		reminders = append(reminders, reminder)
	}

	return reminders, rows.Err()
}

func (r *ReminderRepository) GetPending(ctx context.Context, before time.Time) ([]domain.Reminder, error) {
	query := `
		SELECT r.id, r.user_id, r.item_id, r.remind_at, r.message, r.sent, r.sent_at, r.created_at,
		       i.id, i.board_id, i.title, i.content, i.status, i.due_date
		FROM reminders r
		JOIN items i ON r.item_id = i.id
		JOIN users u ON r.user_id = u.id
		WHERE r.sent = false
		  AND r.remind_at <= $1
		  AND u.notification_enabled = true
		ORDER BY r.remind_at ASC
	`

	rows, err := r.db.Query(ctx, query, before)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reminders []domain.Reminder
	for rows.Next() {
		var reminder domain.Reminder
		var item domain.Item
		if err := rows.Scan(
			&reminder.ID,
			&reminder.UserID,
			&reminder.ItemID,
			&reminder.RemindAt,
			&reminder.Message,
			&reminder.Sent,
			&reminder.SentAt,
			&reminder.CreatedAt,
			&item.ID,
			&item.BoardID,
			&item.Title,
			&item.Content,
			&item.Status,
			&item.DueDate,
		); err != nil {
			return nil, err
		}
		reminder.Item = &item
		reminders = append(reminders, reminder)
	}

	return reminders, rows.Err()
}

func (r *ReminderRepository) Create(ctx context.Context, reminder *domain.Reminder) error {
	query := `
		INSERT INTO reminders (user_id, item_id, remind_at, message)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(ctx, query,
		reminder.UserID,
		reminder.ItemID,
		reminder.RemindAt,
		reminder.Message,
	).Scan(&reminder.ID, &reminder.CreatedAt)

	return err
}

func (r *ReminderRepository) Update(ctx context.Context, reminder *domain.Reminder) error {
	query := `
		UPDATE reminders
		SET remind_at = $2, message = $3
		WHERE id = $1
	`

	result, err := r.db.Exec(ctx, query,
		reminder.ID,
		reminder.RemindAt,
		reminder.Message,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return nil
}

func (r *ReminderRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM reminders WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return nil
}

func (r *ReminderRepository) MarkSent(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE reminders
		SET sent = true, sent_at = NOW()
		WHERE id = $1
	`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return nil
}

func (r *ReminderRepository) DeleteByItemID(ctx context.Context, itemID uuid.UUID) error {
	query := `DELETE FROM reminders WHERE item_id = $1`
	_, err := r.db.Exec(ctx, query, itemID)
	return err
}

// ActivityLogRepository

type ActivityLogRepository struct {
	db *pgxpool.Pool
}

func NewActivityLogRepository(db *pgxpool.Pool) *ActivityLogRepository {
	return &ActivityLogRepository{db: db}
}

func (r *ActivityLogRepository) Create(ctx context.Context, log *domain.ActivityLog) error {
	query := `
		INSERT INTO activity_log (user_id, action, entity_type, entity_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(ctx, query,
		log.UserID,
		log.Action,
		log.EntityType,
		log.EntityID,
	).Scan(&log.ID, &log.CreatedAt)

	return err
}

func (r *ActivityLogRepository) GetByUserID(ctx context.Context, userID int64, limit int) ([]domain.ActivityLog, error) {
	query := `
		SELECT id, user_id, action, entity_type, entity_id, created_at
		FROM activity_log
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []domain.ActivityLog
	for rows.Next() {
		var log domain.ActivityLog
		if err := rows.Scan(
			&log.ID,
			&log.UserID,
			&log.Action,
			&log.EntityType,
			&log.EntityID,
			&log.CreatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, rows.Err()
}

func (r *ActivityLogRepository) GetLastActivity(ctx context.Context, userID int64) (*domain.ActivityLog, error) {
	query := `
		SELECT id, user_id, action, entity_type, entity_id, created_at
		FROM activity_log
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	var log domain.ActivityLog
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&log.ID,
		&log.UserID,
		&log.Action,
		&log.EntityType,
		&log.EntityID,
		&log.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}

	return &log, nil
}

// HabitCompletionRepository

type HabitCompletionRepository struct {
	db *pgxpool.Pool
}

func NewHabitCompletionRepository(db *pgxpool.Pool) *HabitCompletionRepository {
	return &HabitCompletionRepository{db: db}
}

func (r *HabitCompletionRepository) Create(ctx context.Context, completion *domain.HabitCompletion) error {
	query := `
		INSERT INTO habit_completions (item_id, completed_date)
		VALUES ($1, $2)
		ON CONFLICT (item_id, completed_date) DO NOTHING
		RETURNING id, created_at
	`

	err := r.db.QueryRow(ctx, query,
		completion.ItemID,
		completion.CompletedDate,
	).Scan(&completion.ID, &completion.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil // Already exists, not an error
	}

	return err
}

func (r *HabitCompletionRepository) Delete(ctx context.Context, itemID uuid.UUID, date time.Time) error {
	query := `DELETE FROM habit_completions WHERE item_id = $1 AND completed_date = $2`
	_, err := r.db.Exec(ctx, query, itemID, date)
	return err
}

func (r *HabitCompletionRepository) GetByItemID(ctx context.Context, itemID uuid.UUID, from, to time.Time) ([]domain.HabitCompletion, error) {
	query := `
		SELECT id, item_id, completed_date, created_at
		FROM habit_completions
		WHERE item_id = $1 AND completed_date BETWEEN $2 AND $3
		ORDER BY completed_date ASC
	`

	rows, err := r.db.Query(ctx, query, itemID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var completions []domain.HabitCompletion
	for rows.Next() {
		var c domain.HabitCompletion
		if err := rows.Scan(&c.ID, &c.ItemID, &c.CompletedDate, &c.CreatedAt); err != nil {
			return nil, err
		}
		completions = append(completions, c)
	}

	return completions, rows.Err()
}

func (r *HabitCompletionRepository) GetStreak(ctx context.Context, itemID uuid.UUID) (current int, best int, err error) {
	// Calculate current streak
	currentQuery := `
		WITH RECURSIVE streak AS (
			SELECT completed_date, 1 as streak_count
			FROM habit_completions
			WHERE item_id = $1 AND completed_date = CURRENT_DATE
			UNION ALL
			SELECT hc.completed_date, s.streak_count + 1
			FROM habit_completions hc
			JOIN streak s ON hc.completed_date = s.completed_date - INTERVAL '1 day'
			WHERE hc.item_id = $1
		)
		SELECT COALESCE(MAX(streak_count), 0) FROM streak
	`

	err = r.db.QueryRow(ctx, currentQuery, itemID).Scan(&current)
	if err != nil {
		return 0, 0, err
	}

	// Calculate best streak (simplified - just count max consecutive days)
	bestQuery := `
		WITH ordered_dates AS (
			SELECT completed_date,
			       completed_date - (ROW_NUMBER() OVER (ORDER BY completed_date))::int AS grp
			FROM habit_completions
			WHERE item_id = $1
		)
		SELECT COALESCE(MAX(cnt), 0)
		FROM (
			SELECT COUNT(*) as cnt
			FROM ordered_dates
			GROUP BY grp
		) streaks
	`

	err = r.db.QueryRow(ctx, bestQuery, itemID).Scan(&best)
	if err != nil {
		return current, 0, err
	}

	return current, best, nil
}
