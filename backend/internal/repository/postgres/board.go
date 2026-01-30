package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/telegram-task-manager/backend/internal/domain"
)

type BoardRepository struct {
	db *pgxpool.Pool
}

func NewBoardRepository(db *pgxpool.Pool) *BoardRepository {
	return &BoardRepository{db: db}
}

func (r *BoardRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Board, error) {
	query := `
		SELECT id, folder_id, name, type, settings, position, created_at, updated_at
		FROM boards
		WHERE id = $1
	`

	var board domain.Board
	err := r.db.QueryRow(ctx, query, id).Scan(
		&board.ID,
		&board.FolderID,
		&board.Name,
		&board.Type,
		&board.Settings,
		&board.Position,
		&board.CreatedAt,
		&board.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}

	return &board, nil
}

func (r *BoardRepository) GetByIDWithItems(ctx context.Context, id uuid.UUID) (*domain.Board, error) {
	board, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	itemQuery := `
		SELECT id, board_id, parent_id, title, content, status, position,
		       due_date, completed_at, metadata, created_at, updated_at
		FROM items
		WHERE board_id = $1 AND parent_id IS NULL
		ORDER BY position ASC
	`

	rows, err := r.db.Query(ctx, itemQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
		board.Items = append(board.Items, item)
	}

	return board, rows.Err()
}

func (r *BoardRepository) GetByFolderID(ctx context.Context, folderID uuid.UUID) ([]domain.Board, error) {
	query := `
		SELECT id, folder_id, name, type, settings, position, created_at, updated_at
		FROM boards
		WHERE folder_id = $1
		ORDER BY position ASC
	`

	rows, err := r.db.Query(ctx, query, folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boards []domain.Board
	for rows.Next() {
		var board domain.Board
		if err := rows.Scan(
			&board.ID,
			&board.FolderID,
			&board.Name,
			&board.Type,
			&board.Settings,
			&board.Position,
			&board.CreatedAt,
			&board.UpdatedAt,
		); err != nil {
			return nil, err
		}
		boards = append(boards, board)
	}

	return boards, rows.Err()
}

func (r *BoardRepository) Create(ctx context.Context, board *domain.Board) error {
	query := `
		INSERT INTO boards (folder_id, name, type, settings, position)
		VALUES ($1, $2, $3, $4, COALESCE($5, (SELECT COALESCE(MAX(position), 0) + 1 FROM boards WHERE folder_id = $1)))
		RETURNING id, position, created_at, updated_at
	`

	var position *int
	if board.Position > 0 {
		position = &board.Position
	}

	settings := board.Settings
	if settings == nil {
		settings = []byte("{}")
	}

	err := r.db.QueryRow(ctx, query,
		board.FolderID,
		board.Name,
		board.Type,
		settings,
		position,
	).Scan(&board.ID, &board.Position, &board.CreatedAt, &board.UpdatedAt)

	return err
}

func (r *BoardRepository) Update(ctx context.Context, board *domain.Board) error {
	query := `
		UPDATE boards
		SET name = $2, settings = $3, position = $4, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`

	err := r.db.QueryRow(ctx, query,
		board.ID,
		board.Name,
		board.Settings,
		board.Position,
	).Scan(&board.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrNotFound
		}
		return err
	}

	return nil
}

func (r *BoardRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM boards WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return nil
}

func (r *BoardRepository) UpdatePositions(ctx context.Context, folderID uuid.UUID, boardIDs []uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `UPDATE boards SET position = $1, updated_at = NOW() WHERE id = $2 AND folder_id = $3`

	for i, id := range boardIDs {
		_, err := tx.Exec(ctx, query, i, id, folderID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *BoardRepository) CountByUserID(ctx context.Context, userID int64) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM boards b
		JOIN folders f ON b.folder_id = f.id
		WHERE f.user_id = $1
	`

	var count int
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

func (r *BoardRepository) GetFolderOwner(ctx context.Context, folderID uuid.UUID) (int64, error) {
	query := `SELECT user_id FROM folders WHERE id = $1`

	var userID int64
	err := r.db.QueryRow(ctx, query, folderID).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, domain.ErrNotFound
		}
		return 0, err
	}

	return userID, nil
}
