package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/telegram-task-manager/backend/internal/domain"
)

type ItemRepository struct {
	db *pgxpool.Pool
}

func NewItemRepository(db *pgxpool.Pool) *ItemRepository {
	return &ItemRepository{db: db}
}

func (r *ItemRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Item, error) {
	query := `
		SELECT id, board_id, parent_id, title, content, status, position,
		       due_date, completed_at, metadata, created_at, updated_at
		FROM items
		WHERE id = $1
	`

	var item domain.Item
	err := r.db.QueryRow(ctx, query, id).Scan(
		&item.ID,
		&item.BoardID,
		&item.ParentID,
		&item.Title,
		&item.Content,
		&item.Status,
		&item.Position,
		&item.DueDate,
		&item.CompletedAt,
		&item.Metadata,
		&item.CreatedAt,
		&item.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}

	return &item, nil
}

func (r *ItemRepository) GetByBoardID(ctx context.Context, boardID uuid.UUID, filter *domain.ItemFilter) ([]domain.Item, error) {
	query := `
		SELECT id, board_id, parent_id, title, content, status, position,
		       due_date, completed_at, metadata, created_at, updated_at
		FROM items
		WHERE board_id = $1
	`

	args := []interface{}{boardID}
	argIndex := 2

	if filter != nil {
		if filter.Status != nil {
			query += fmt.Sprintf(" AND status = $%d", argIndex)
			args = append(args, *filter.Status)
			argIndex++
		}
		if filter.DueBefore != nil {
			query += fmt.Sprintf(" AND due_date <= $%d", argIndex)
			args = append(args, *filter.DueBefore)
			argIndex++
		}
		if filter.DueAfter != nil {
			query += fmt.Sprintf(" AND due_date >= $%d", argIndex)
			args = append(args, *filter.DueAfter)
			argIndex++
		}
		if filter.ParentID != nil {
			query += fmt.Sprintf(" AND parent_id = $%d", argIndex)
			args = append(args, *filter.ParentID)
		} else {
			query += " AND parent_id IS NULL"
		}
	} else {
		query += " AND parent_id IS NULL"
	}

	query += " ORDER BY position ASC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Item
	for rows.Next() {
		var item domain.Item
		if err := rows.Scan(
			&item.ID,
			&item.BoardID,
			&item.ParentID,
			&item.Title,
			&item.Content,
			&item.Status,
			&item.Position,
			&item.DueDate,
			&item.CompletedAt,
			&item.Metadata,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *ItemRepository) GetWithChildren(ctx context.Context, id uuid.UUID) (*domain.Item, error) {
	item, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	childQuery := `
		SELECT id, board_id, parent_id, title, content, status, position,
		       due_date, completed_at, metadata, created_at, updated_at
		FROM items
		WHERE parent_id = $1
		ORDER BY position ASC
	`

	rows, err := r.db.Query(ctx, childQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var child domain.Item
		if err := rows.Scan(
			&child.ID,
			&child.BoardID,
			&child.ParentID,
			&child.Title,
			&child.Content,
			&child.Status,
			&child.Position,
			&child.DueDate,
			&child.CompletedAt,
			&child.Metadata,
			&child.CreatedAt,
			&child.UpdatedAt,
		); err != nil {
			return nil, err
		}
		item.Children = append(item.Children, child)
	}

	return item, rows.Err()
}

func (r *ItemRepository) Create(ctx context.Context, item *domain.Item) error {
	query := `
		INSERT INTO items (board_id, parent_id, title, content, status, position, due_date, metadata)
		VALUES ($1, $2, $3, $4, $5, COALESCE($6, (SELECT COALESCE(MAX(position), 0) + 1 FROM items WHERE board_id = $1 AND parent_id IS NOT DISTINCT FROM $2)), $7, $8)
		RETURNING id, position, created_at, updated_at
	`

	var position *int
	if item.Position > 0 {
		position = &item.Position
	}

	status := item.Status
	if status == "" {
		status = domain.ItemStatusPending
	}

	metadata := item.Metadata
	if metadata == nil {
		metadata = []byte("{}")
	}

	err := r.db.QueryRow(ctx, query,
		item.BoardID,
		item.ParentID,
		item.Title,
		item.Content,
		status,
		position,
		item.DueDate,
		metadata,
	).Scan(&item.ID, &item.Position, &item.CreatedAt, &item.UpdatedAt)

	return err
}

func (r *ItemRepository) Update(ctx context.Context, item *domain.Item) error {
	query := `
		UPDATE items
		SET title = $2, content = $3, status = $4, position = $5,
		    due_date = $6, completed_at = $7, metadata = $8, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`

	err := r.db.QueryRow(ctx, query,
		item.ID,
		item.Title,
		item.Content,
		item.Status,
		item.Position,
		item.DueDate,
		item.CompletedAt,
		item.Metadata,
	).Scan(&item.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrNotFound
		}
		return err
	}

	return nil
}

func (r *ItemRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM items WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return nil
}

func (r *ItemRepository) UpdatePositions(ctx context.Context, boardID uuid.UUID, itemIDs []uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `UPDATE items SET position = $1, updated_at = NOW() WHERE id = $2 AND board_id = $3`

	for i, id := range itemIDs {
		_, err := tx.Exec(ctx, query, i, id, boardID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *ItemRepository) Complete(ctx context.Context, id uuid.UUID, completed bool) error {
	var query string
	if completed {
		query = `
			UPDATE items
			SET status = 'completed', completed_at = NOW(), updated_at = NOW()
			WHERE id = $1
		`
	} else {
		query = `
			UPDATE items
			SET status = 'pending', completed_at = NULL, updated_at = NOW()
			WHERE id = $1
		`
	}

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return nil
}

func (r *ItemRepository) GetOverdueTasks(ctx context.Context) ([]domain.OverdueTask, error) {
	query := `
		SELECT f.user_id, i.id, i.title, i.due_date, b.name
		FROM items i
		JOIN boards b ON i.board_id = b.id
		JOIN folders f ON b.folder_id = f.id
		JOIN users u ON f.user_id = u.id
		WHERE i.due_date < NOW()
		  AND i.status != 'completed'
		  AND u.notification_enabled = true
		ORDER BY i.due_date ASC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []domain.OverdueTask
	for rows.Next() {
		var task domain.OverdueTask
		if err := rows.Scan(
			&task.UserID,
			&task.ItemID,
			&task.Title,
			&task.DueDate,
			&task.BoardName,
		); err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}

	return tasks, rows.Err()
}

func (r *ItemRepository) GetDueSoon(ctx context.Context, userID int64, within time.Duration) ([]domain.Item, error) {
	query := `
		SELECT i.id, i.board_id, i.parent_id, i.title, i.content, i.status, i.position,
		       i.due_date, i.completed_at, i.metadata, i.created_at, i.updated_at
		FROM items i
		JOIN boards b ON i.board_id = b.id
		JOIN folders f ON b.folder_id = f.id
		WHERE f.user_id = $1
		  AND i.due_date BETWEEN NOW() AND NOW() + $2::interval
		  AND i.status != 'completed'
		ORDER BY i.due_date ASC
	`

	rows, err := r.db.Query(ctx, query, userID, within.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Item
	for rows.Next() {
		var item domain.Item
		if err := rows.Scan(
			&item.ID,
			&item.BoardID,
			&item.ParentID,
			&item.Title,
			&item.Content,
			&item.Status,
			&item.Position,
			&item.DueDate,
			&item.CompletedAt,
			&item.Metadata,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (r *ItemRepository) CountByUserID(ctx context.Context, userID int64) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM items i
		JOIN boards b ON i.board_id = b.id
		JOIN folders f ON b.folder_id = f.id
		WHERE f.user_id = $1
	`

	var count int
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

func (r *ItemRepository) CountCompletedByUserID(ctx context.Context, userID int64) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM items i
		JOIN boards b ON i.board_id = b.id
		JOIN folders f ON b.folder_id = f.id
		WHERE f.user_id = $1 AND i.status = 'completed'
	`

	var count int
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

func (r *ItemRepository) CountOverdueByUserID(ctx context.Context, userID int64) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM items i
		JOIN boards b ON i.board_id = b.id
		JOIN folders f ON b.folder_id = f.id
		WHERE f.user_id = $1
		  AND i.due_date < NOW()
		  AND i.status != 'completed'
	`

	var count int
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

func (r *ItemRepository) GetBoardOwner(ctx context.Context, boardID uuid.UUID) (int64, error) {
	query := `
		SELECT f.user_id
		FROM folders f
		JOIN boards b ON b.folder_id = f.id
		WHERE b.id = $1
	`

	var userID int64
	err := r.db.QueryRow(ctx, query, boardID).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, domain.ErrNotFound
		}
		return 0, err
	}

	return userID, nil
}

func (r *ItemRepository) GetCompletionStats(ctx context.Context, userID int64, days int) ([]domain.CompletionStats, error) {
	query := `
		WITH dates AS (
			SELECT generate_series(
				CURRENT_DATE - ($2 - 1) * INTERVAL '1 day',
				CURRENT_DATE,
				INTERVAL '1 day'
			)::date AS date
		),
		completed AS (
			SELECT DATE(i.completed_at) AS date, COUNT(*) AS count
			FROM items i
			JOIN boards b ON i.board_id = b.id
			JOIN folders f ON b.folder_id = f.id
			WHERE f.user_id = $1
			  AND i.completed_at >= CURRENT_DATE - ($2 - 1) * INTERVAL '1 day'
			GROUP BY DATE(i.completed_at)
		),
		created AS (
			SELECT DATE(i.created_at) AS date, COUNT(*) AS count
			FROM items i
			JOIN boards b ON i.board_id = b.id
			JOIN folders f ON b.folder_id = f.id
			WHERE f.user_id = $1
			  AND i.created_at >= CURRENT_DATE - ($2 - 1) * INTERVAL '1 day'
			GROUP BY DATE(i.created_at)
		)
		SELECT d.date::text, COALESCE(c.count, 0), COALESCE(cr.count, 0)
		FROM dates d
		LEFT JOIN completed c ON d.date = c.date
		LEFT JOIN created cr ON d.date = cr.date
		ORDER BY d.date ASC
	`

	rows, err := r.db.Query(ctx, query, userID, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []domain.CompletionStats
	for rows.Next() {
		var s domain.CompletionStats
		if err := rows.Scan(&s.Date, &s.Completed, &s.Created); err != nil {
			return nil, err
		}
		stats = append(stats, s)
	}

	return stats, rows.Err()
}
