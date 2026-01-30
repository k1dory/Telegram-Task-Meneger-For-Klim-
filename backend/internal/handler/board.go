package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/service"
)

type BoardHandler struct {
	boardService *service.BoardService
}

func NewBoardHandler(boardService *service.BoardService) *BoardHandler {
	return &BoardHandler{
		boardService: boardService,
	}
}

// ListBoards handles GET /api/folders/:folderId/boards
// @Summary List boards in folder
// @Description Returns all boards in a folder
// @Tags boards
// @Produce json
// @Security BearerAuth
// @Param folderId path string true "Folder ID"
// @Success 200 {array} domain.Board
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/folders/{folderId}/boards [get]
func (h *BoardHandler) ListBoards(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	folderID, err := uuid.Parse(c.Param("folderId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid folder ID"})
		return
	}

	boards, err := h.boardService.GetBoardsByFolder(c.Request.Context(), userID, folderID)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get boards"})
		}
		return
	}

	if boards == nil {
		boards = []domain.Board{}
	}

	c.JSON(http.StatusOK, boards)
}

// GetBoard handles GET /api/boards/:id
// @Summary Get board
// @Description Returns a board with its items
// @Tags boards
// @Produce json
// @Security BearerAuth
// @Param id path string true "Board ID"
// @Success 200 {object} domain.Board
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/boards/{id} [get]
func (h *BoardHandler) GetBoard(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid board ID"})
		return
	}

	board, err := h.boardService.GetBoardWithItems(c.Request.Context(), userID, boardID)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get board"})
		}
		return
	}

	c.JSON(http.StatusOK, board)
}

// CreateBoard handles POST /api/folders/:folderId/boards
// @Summary Create board
// @Description Creates a new board in a folder
// @Tags boards
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param folderId path string true "Folder ID"
// @Param request body domain.CreateBoardRequest true "Board data"
// @Success 201 {object} domain.Board
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /api/folders/{folderId}/boards [post]
func (h *BoardHandler) CreateBoard(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	folderID, err := uuid.Parse(c.Param("folderId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid folder ID"})
		return
	}

	var req domain.CreateBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	board, err := h.boardService.CreateBoard(c.Request.Context(), userID, folderID, &req)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		case domain.ErrInvalidBoardType:
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid board type"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create board"})
		}
		return
	}

	c.JSON(http.StatusCreated, board)
}

// UpdateBoard handles PUT /api/boards/:id
// @Summary Update board
// @Description Updates an existing board
// @Tags boards
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Board ID"
// @Param request body domain.UpdateBoardRequest true "Board data"
// @Success 200 {object} domain.Board
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/boards/{id} [put]
func (h *BoardHandler) UpdateBoard(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid board ID"})
		return
	}

	var req domain.UpdateBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	board, err := h.boardService.UpdateBoard(c.Request.Context(), userID, boardID, &req)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update board"})
		}
		return
	}

	c.JSON(http.StatusOK, board)
}

// DeleteBoard handles DELETE /api/boards/:id
// @Summary Delete board
// @Description Deletes a board and all its items
// @Tags boards
// @Produce json
// @Security BearerAuth
// @Param id path string true "Board ID"
// @Success 204
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/boards/{id} [delete]
func (h *BoardHandler) DeleteBoard(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid board ID"})
		return
	}

	err = h.boardService.DeleteBoard(c.Request.Context(), userID, boardID)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete board"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// ReorderBoards handles PUT /api/folders/:folderId/boards/reorder
// @Summary Reorder boards
// @Description Updates the position of boards in a folder
// @Tags boards
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param folderId path string true "Folder ID"
// @Param request body domain.ReorderBoardsRequest true "Board IDs in new order"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /api/folders/{folderId}/boards/reorder [put]
func (h *BoardHandler) ReorderBoards(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	folderID, err := uuid.Parse(c.Param("folderId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid folder ID"})
		return
	}

	var req domain.ReorderBoardsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := h.boardService.ReorderBoards(c.Request.Context(), userID, folderID, req.BoardIDs); err != nil {
		switch err {
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reorder boards"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "boards reordered"})
}
