package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/telegram-task-manager/backend/internal/domain"
	"github.com/telegram-task-manager/backend/internal/service"
)

type FolderHandler struct {
	folderService *service.FolderService
}

func NewFolderHandler(folderService *service.FolderService) *FolderHandler {
	return &FolderHandler{
		folderService: folderService,
	}
}

// ListFolders handles GET /api/folders
// @Summary List folders
// @Description Returns all folders for the current user
// @Tags folders
// @Produce json
// @Security BearerAuth
// @Success 200 {array} domain.Folder
// @Failure 401 {object} map[string]string
// @Router /api/folders [get]
func (h *FolderHandler) ListFolders(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	folders, err := h.folderService.GetUserFolders(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get folders"})
		return
	}

	if folders == nil {
		folders = []domain.Folder{}
	}

	c.JSON(http.StatusOK, folders)
}

// GetFolder handles GET /api/folders/:id
// @Summary Get folder
// @Description Returns a folder with its boards
// @Tags folders
// @Produce json
// @Security BearerAuth
// @Param id path string true "Folder ID"
// @Success 200 {object} domain.Folder
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/folders/{id} [get]
func (h *FolderHandler) GetFolder(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	folderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid folder ID"})
		return
	}

	folder, err := h.folderService.GetFolderWithBoards(c.Request.Context(), userID, folderID)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get folder"})
		}
		return
	}

	c.JSON(http.StatusOK, folder)
}

// CreateFolder handles POST /api/folders
// @Summary Create folder
// @Description Creates a new folder
// @Tags folders
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body domain.CreateFolderRequest true "Folder data"
// @Success 201 {object} domain.Folder
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/folders [post]
func (h *FolderHandler) CreateFolder(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req domain.CreateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	folder, err := h.folderService.CreateFolder(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create folder"})
		return
	}

	c.JSON(http.StatusCreated, folder)
}

// UpdateFolder handles PUT /api/folders/:id
// @Summary Update folder
// @Description Updates an existing folder
// @Tags folders
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Folder ID"
// @Param request body domain.UpdateFolderRequest true "Folder data"
// @Success 200 {object} domain.Folder
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/folders/{id} [put]
func (h *FolderHandler) UpdateFolder(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	folderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid folder ID"})
		return
	}

	var req domain.UpdateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	folder, err := h.folderService.UpdateFolder(c.Request.Context(), userID, folderID, &req)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update folder"})
		}
		return
	}

	c.JSON(http.StatusOK, folder)
}

// DeleteFolder handles DELETE /api/folders/:id
// @Summary Delete folder
// @Description Deletes a folder and all its contents
// @Tags folders
// @Produce json
// @Security BearerAuth
// @Param id path string true "Folder ID"
// @Success 204
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/folders/{id} [delete]
func (h *FolderHandler) DeleteFolder(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	folderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid folder ID"})
		return
	}

	err = h.folderService.DeleteFolder(c.Request.Context(), userID, folderID)
	if err != nil {
		switch err {
		case domain.ErrNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "folder not found"})
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete folder"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// ReorderFolders handles PUT /api/folders/reorder
// @Summary Reorder folders
// @Description Updates the position of folders
// @Tags folders
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body domain.ReorderFoldersRequest true "Folder IDs in new order"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/folders/reorder [put]
func (h *FolderHandler) ReorderFolders(c *gin.Context) {
	userID, err := GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req domain.ReorderFoldersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if err := h.folderService.ReorderFolders(c.Request.Context(), userID, req.FolderIDs); err != nil {
		switch err {
		case domain.ErrForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reorder folders"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "folders reordered"})
}
