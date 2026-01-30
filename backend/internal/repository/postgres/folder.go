package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/telegram-task-manager/backend/internal/domain"
)

type FolderRepository struct {
	db *pgxpool.Pool
}

func NewFolderRepository(db *pgxpool.Pool) *FolderRepository {
	return &FolderRepository{db: db}
}

func (r *FolderRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Folder, error) {
	query := `
		SELECT id, user_id, name, color, icon, position, created_at, updated_at
		FROM folders
		WHERE id = $1
	`

	var folder domain.Folder
	err := r.db.QueryRow(ctx, query, id).Scan(
		&folder.ID,
		&folder.UserID,
		&folder.Name,
		&folder.Color,
		&folder.Icon,
		&folder.Position,
		&folder.CreatedAt,
		&folder.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}

	return &folder, nil
}

func (r *FolderRepository) GetByIDWithBoards(ctx context.Context, id uuid.UUID) (*domain.Folder, error) {
	folder, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	boardQuery := `
		SELECT id, folder_id, name, type, settings, position, created_at, updated_at
		FROM boards
		WHERE folder_id = $1
		ORDER BY position ASC
	`

	rows, err := r.db.Query(ctx, boardQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
		folder.Boards = append(folder.Boards, board)
	}

	return folder, rows.Err()
}

func (r *FolderRepository) GetByUserID(ctx context.Context, userID int64) ([]domain.Folder, error) {
	query := `
		SELECT id, user_id, name, color, icon, position, created_at, updated_at
		FROM folders
		WHERE user_id = $1
		ORDER BY position ASC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []domain.Folder
	for rows.Next() {
		var folder domain.Folder
		if err := rows.Scan(
			&folder.ID,
			&folder.UserID,
			&folder.Name,
			&folder.Color,
			&folder.Icon,
			&folder.Position,
			&folder.CreatedAt,
			&folder.UpdatedAt,
		); err != nil {
			return nil, err
		}
		folders = append(folders, folder)
	}

	return folders, rows.Err()
}

func (r *FolderRepository) Create(ctx context.Context, folder *domain.Folder) error {
	query := `
		INSERT INTO folders (user_id, name, color, icon, position)
		VALUES ($1, $2, $3, $4, COALESCE($5, (SELECT COALESCE(MAX(position), 0) + 1 FROM folders WHERE user_id = $1)))
		RETURNING id, position, created_at, updated_at
	`

	var position *int
	if folder.Position > 0 {
		position = &folder.Position
	}

	err := r.db.QueryRow(ctx, query,
		folder.UserID,
		folder.Name,
		folder.Color,
		folder.Icon,
		position,
	).Scan(&folder.ID, &folder.Position, &folder.CreatedAt, &folder.UpdatedAt)

	return err
}

func (r *FolderRepository) Update(ctx context.Context, folder *domain.Folder) error {
	query := `
		UPDATE folders
		SET name = $2, color = $3, icon = $4, position = $5, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`

	err := r.db.QueryRow(ctx, query,
		folder.ID,
		folder.Name,
		folder.Color,
		folder.Icon,
		folder.Position,
	).Scan(&folder.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrNotFound
		}
		return err
	}

	return nil
}

func (r *FolderRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM folders WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return nil
}

func (r *FolderRepository) UpdatePositions(ctx context.Context, userID int64, folderIDs []uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `UPDATE folders SET position = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`

	for i, id := range folderIDs {
		_, err := tx.Exec(ctx, query, i, id, userID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *FolderRepository) CountByUserID(ctx context.Context, userID int64) (int, error) {
	query := `SELECT COUNT(*) FROM folders WHERE user_id = $1`

	var count int
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}
