package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/service"
)

type ItemHandler struct {
	itemService      *service.ItemService
	analyticsService *service.AnalyticsService
}

func NewItemHandler(itemService *service.ItemService, analyticsService *service.AnalyticsService) *ItemHandler {
	return &ItemHandler{
		itemService:      itemService,
		analyticsService: analyticsService,
	}
}

// ListItems handles GET /api/boards/:boardId/items
// @Summary List items in board
// @Description Returns all items in a board
// @Tags items
// @Produce json
// @Security BearerAuth
// @Param boardId path string true "Board ID"
// @Param status query string false "Filter by status"
// @Success 200 {array} domain.Item
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/boards/{boardId}/items [get]
func (h *ItemHandler) ListItems(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("boardId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid board ID"})
		return
	}

	// Build filter from query params
	filter := &domain.ItemFilter{}
	hasFilter := false

	if status := c.Query("status"); status != "" {
		s := domain.ItemStatus(status)
		filter.Status = &s
		hasFilter = true
	}

	if dueBefore := c.Query("due_before"); dueBefore != "" {
		if t, err := time.Parse("2006-01-02", dueBefore); err == nil {
			// Set to end of day
			t = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filter.DueBefore = &t
			hasFilter = true
		}
	}

	if dueAfter := c.Query("due_after"); dueAfter != "" {
		if t, err := time.Parse("2006-01-02", dueAfter); err == nil {
			filter.DueAfter = &t
			hasFilter = true
		}
	}

	if parentID := c.Query("parent_id"); parentID != "" {
		if pid, err := uuid.Parse(parentID); err == nil {
			filter.ParentID = &pid
			hasFilter = true
		}
	}

	if !hasFilter {
		filter = nil
	}

	items, err := h.itemService.GetItemsByBoard(c.Request.Context(), userID, boardID, filter)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get items"})
		}
		return
	}

	if items == nil {
		items = []domain.Item{}
	}

	c.JSON(http.StatusOK, items)
}

// GetItem handles GET /api/items/:id
// @Summary Get item
// @Description Returns an item with its children
// @Tags items
// @Produce json
// @Security BearerAuth
// @Param id path string true "Item ID"
// @Success 200 {object} domain.Item
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/items/{id} [get]
func (h *ItemHandler) GetItem(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	item, err := h.itemService.GetItemWithChildren(c.Request.Context(), userID, itemID)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get item"})
		}
		return
	}

	c.JSON(http.StatusOK, item)
}

// CreateItem handles POST /api/boards/:boardId/items
// @Summary Create item
// @Description Creates a new item in a board
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param boardId path string true "Board ID"
// @Param request body domain.CreateItemRequest true "Item data"
// @Success 201 {object} domain.Item
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /api/boards/{boardId}/items [post]
func (h *ItemHandler) CreateItem(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("boardId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid board ID"})
		return
	}

	var req domain.CreateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	item, err := h.itemService.CreateItem(c.Request.Context(), userID, boardID, &req)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create item"})
		}
		return
	}

	c.JSON(http.StatusCreated, item)
}

// UpdateItem handles PUT /api/items/:id
// @Summary Update item
// @Description Updates an existing item
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Item ID"
// @Param request body domain.UpdateItemRequest true "Item data"
// @Success 200 {object} domain.Item
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/items/{id} [put]
func (h *ItemHandler) UpdateItem(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	var req domain.UpdateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	item, err := h.itemService.UpdateItem(c.Request.Context(), userID, itemID, &req)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update item"})
		}
		return
	}

	c.JSON(http.StatusOK, item)
}

// DeleteItem handles DELETE /api/items/:id
// @Summary Delete item
// @Description Deletes an item
// @Tags items
// @Produce json
// @Security BearerAuth
// @Param id path string true "Item ID"
// @Success 204
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/items/{id} [delete]
func (h *ItemHandler) DeleteItem(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	err = h.itemService.DeleteItem(c.Request.Context(), userID, itemID)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete item"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// CompleteItem handles PUT /api/items/:id/complete
// @Summary Complete/uncomplete item
// @Description Marks an item as completed or uncompleted
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Item ID"
// @Param request body domain.CompleteItemRequest true "Completion status"
// @Success 200 {object} domain.Item
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/items/{id}/complete [put]
func (h *ItemHandler) CompleteItem(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	var req domain.CompleteItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	item, err := h.itemService.CompleteItem(c.Request.Context(), userID, itemID, req.Completed)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete item"})
		}
		return
	}

	c.JSON(http.StatusOK, item)
}

// SetReminder handles POST /api/items/:id/reminder
// @Summary Set reminder
// @Description Creates a reminder for an item
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Item ID"
// @Param request body domain.CreateReminderRequest true "Reminder data"
// @Success 201 {object} domain.Reminder
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/items/{id}/reminder [post]
func (h *ItemHandler) SetReminder(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	var req domain.CreateReminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	reminder, err := h.itemService.SetReminder(c.Request.Context(), userID, itemID, &req)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set reminder"})
		}
		return
	}

	c.JSON(http.StatusCreated, reminder)
}

// ReorderItems handles PUT /api/boards/:boardId/items/reorder
// @Summary Reorder items
// @Description Updates the position of items in a board
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param boardId path string true "Board ID"
// @Param request body domain.ReorderItemsRequest true "Item IDs in new order"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /api/boards/{boardId}/items/reorder [put]
func (h *ItemHandler) ReorderItems(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	boardID, err := uuid.Parse(c.Param("boardId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid board ID"})
		return
	}

	var req domain.ReorderItemsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := h.itemService.ReorderItems(c.Request.Context(), userID, boardID, req.ItemIDs); err != nil {
		switch err {
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reorder items"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "items reordered"})
}

// MoveItem handles PUT /api/items/:id/move
// @Summary Move item
// @Description Moves an item to a different board
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Item ID"
// @Param request body domain.MoveItemRequest true "Move destination"
// @Success 200 {object} domain.Item
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/items/{id}/move [put]
func (h *ItemHandler) MoveItem(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	var req domain.MoveItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	item, err := h.itemService.MoveItem(c.Request.Context(), userID, itemID, &req)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to move item"})
		}
		return
	}

	c.JSON(http.StatusOK, item)
}

// CompleteHabit handles POST /api/items/:id/habit/complete
// @Summary Complete habit
// @Description Marks a habit as completed for a specific date
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Item ID"
// @Param request body domain.CompleteHabitRequest true "Completion date"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /api/items/{id}/habit/complete [post]
func (h *ItemHandler) CompleteHabit(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	var req domain.CompleteHabitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	date, err := req.ParseDate()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format, expected YYYY-MM-DD"})
		return
	}

	if err := h.itemService.CompleteHabit(c.Request.Context(), userID, itemID, date); err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete habit"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "habit completed"})
}

// UncompleteHabit handles DELETE /api/items/:id/habit/complete
// @Summary Uncomplete habit
// @Description Removes a habit completion for a specific date
// @Tags items
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Item ID"
// @Param request body domain.CompleteHabitRequest true "Completion date"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /api/items/{id}/habit/complete [delete]
func (h *ItemHandler) UncompleteHabit(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	var req domain.CompleteHabitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	date, err := req.ParseDate()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format, expected YYYY-MM-DD"})
		return
	}

	if err := h.itemService.UncompleteHabit(c.Request.Context(), userID, itemID, date); err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to uncomplete habit"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "habit uncompleted"})
}

// GetHabitCompletions handles GET /api/items/:id/habit/completions
// @Summary Get habit completions
// @Description Returns habit completions for a date range
// @Tags items
// @Produce json
// @Security BearerAuth
// @Param id path string true "Item ID"
// @Param from query string false "Start date (YYYY-MM-DD)"
// @Param to query string false "End date (YYYY-MM-DD)"
// @Success 200 {array} domain.HabitCompletion
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /api/items/{id}/habit/completions [get]
func (h *ItemHandler) GetHabitCompletions(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item ID"})
		return
	}

	// Default to last 30 days
	to := time.Now()
	from := to.AddDate(0, 0, -30)

	if fromStr := c.Query("from"); fromStr != "" {
		if parsed, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = parsed
		}
	}

	if toStr := c.Query("to"); toStr != "" {
		if parsed, err := time.Parse("2006-01-02", toStr); err == nil {
			to = parsed
		}
	}

	completions, err := h.itemService.GetHabitCompletions(c.Request.Context(), userID, itemID, from, to)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get completions"})
		}
		return
	}

	if completions == nil {
		completions = []domain.HabitCompletion{}
	}

	c.JSON(http.StatusOK, completions)
}

// GetAnalyticsOverview handles GET /api/analytics/overview
// @Summary Get analytics overview
// @Description Returns dashboard statistics
// @Tags analytics
// @Produce json
// @Security BearerAuth
// @Success 200 {object} domain.AnalyticsOverview
// @Failure 401 {object} map[string]string
// @Router /api/analytics/overview [get]
func (h *ItemHandler) GetAnalyticsOverview(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	overview, err := h.analyticsService.GetOverview(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get analytics"})
		return
	}

	c.JSON(http.StatusOK, overview)
}

// GetCompletionStats handles GET /api/analytics/completion
// @Summary Get completion stats
// @Description Returns completion statistics for the last N days
// @Tags analytics
// @Produce json
// @Security BearerAuth
// @Param days query int false "Number of days (default 7, max 90)"
// @Success 200 {array} domain.CompletionStats
// @Failure 401 {object} map[string]string
// @Router /api/analytics/completion [get]
func (h *ItemHandler) GetCompletionStats(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	days := 7
	if daysStr := c.Query("days"); daysStr != "" {
		if parsed, err := strconv.Atoi(daysStr); err == nil && parsed > 0 && parsed <= 365 {
			days = parsed
		}
	}

	stats, err := h.analyticsService.GetCompletionStats(c.Request.Context(), userID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get stats"})
		return
	}

	if stats == nil {
		stats = []domain.CompletionStats{}
	}

	c.JSON(http.StatusOK, stats)
}
