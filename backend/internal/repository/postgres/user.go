package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/telegram-task-manager/backend/internal/domain"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	query := `
		SELECT id, username, first_name, last_name, language_code,
		       notification_enabled, reminder_hours, last_active_at, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user domain.User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Username,
		&user.FirstName,
		&user.LastName,
		&user.LanguageCode,
		&user.NotificationEnabled,
		&user.ReminderHours,
		&user.LastActiveAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}

	// Populate computed fields
	user.TelegramID = user.ID
	user.Settings = &domain.UserSettings{
		NotificationEnabled: user.NotificationEnabled,
		ReminderHours:       user.ReminderHours,
		LanguageCode:        user.LanguageCode,
	}

	return &user, nil
}

func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, username, first_name, last_name, language_code,
		                   notification_enabled, reminder_hours, last_active_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET
			username = EXCLUDED.username,
			first_name = EXCLUDED.first_name,
			last_name = EXCLUDED.last_name,
			language_code = EXCLUDED.language_code,
			last_active_at = EXCLUDED.last_active_at,
			updated_at = NOW()
		RETURNING created_at, updated_at
	`

	if user.ReminderHours == nil {
		user.ReminderHours = []int{6, 8, 12}
	}

	err := r.db.QueryRow(ctx, query,
		user.ID,
		user.Username,
		user.FirstName,
		user.LastName,
		user.LanguageCode,
		user.NotificationEnabled,
		user.ReminderHours,
		time.Now(),
	).Scan(&user.CreatedAt, &user.UpdatedAt)

	return err
}

func (r *UserRepository) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users
		SET username = $2, first_name = $3, last_name = $4, language_code = $5,
		    notification_enabled = $6, reminder_hours = $7, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`

	err := r.db.QueryRow(ctx, query,
		user.ID,
		user.Username,
		user.FirstName,
		user.LastName,
		user.LanguageCode,
		user.NotificationEnabled,
		user.ReminderHours,
	).Scan(&user.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrNotFound
		}
		return err
	}

	return nil
}

func (r *UserRepository) UpdateSettings(ctx context.Context, userID int64, settings *domain.UserSettings) error {
	query := `
		UPDATE users
		SET notification_enabled = $2, reminder_hours = $3, language_code = $4, updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.db.Exec(ctx, query,
		userID,
		settings.NotificationEnabled,
		settings.ReminderHours,
		settings.LanguageCode,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return nil
}

func (r *UserRepository) UpdateLastActive(ctx context.Context, userID int64) error {
	query := `
		UPDATE users
		SET last_active_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, userID)
	return err
}

func (r *UserRepository) GetInactiveUsers(ctx context.Context, since time.Time) ([]domain.InactiveUser, error) {
	query := `
		SELECT id, last_active_at,
		       EXTRACT(EPOCH FROM (NOW() - last_active_at)) / 3600 as hours_inactive
		FROM users
		WHERE notification_enabled = true
		  AND last_active_at < $1
		  AND last_active_at IS NOT NULL
		ORDER BY last_active_at ASC
	`

	rows, err := r.db.Query(ctx, query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.InactiveUser
	for rows.Next() {
		var user domain.InactiveUser
		var hoursFloat float64
		if err := rows.Scan(&user.UserID, &user.LastActiveAt, &hoursFloat); err != nil {
			return nil, err
		}
		user.HoursInactive = int(hoursFloat)
		users = append(users, user)
	}

	return users, rows.Err()
}

// GetUsersForReminderHour returns users who have notifications enabled and the given hour in their reminder_hours
func (r *UserRepository) GetUsersForReminderHour(ctx context.Context, hour int) ([]domain.User, error) {
	query := `
		SELECT id, username, first_name, last_name, language_code,
		       notification_enabled, reminder_hours, last_active_at, created_at, updated_at
		FROM users
		WHERE notification_enabled = true
		  AND $1 = ANY(reminder_hours)
	`

	rows, err := r.db.Query(ctx, query, hour)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var user domain.User
		if err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.FirstName,
			&user.LastName,
			&user.LanguageCode,
			&user.NotificationEnabled,
			&user.ReminderHours,
			&user.LastActiveAt,
			&user.CreatedAt,
			&user.UpdatedAt,
		); err != nil {
			return nil, err
		}
		user.TelegramID = user.ID
		users = append(users, user)
	}

	return users, rows.Err()
}
