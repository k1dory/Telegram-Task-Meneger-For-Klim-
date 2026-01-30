import apiClient from './client';
import type { BoardType } from '@/types';
import type { Item } from './items';

export interface Board {
  id: string;
  folder_id: string;
  name: string;
  type: BoardType;
  settings: Record<string, unknown>;
  position: number;
  created_at: string;
  updated_at: string;
  items?: Item[];
}

export interface CreateBoardDto {
  name: string;
  type: BoardType;
  settings?: Record<string, unknown>;
  position?: number;
}

export interface UpdateBoardDto {
  name?: string;
  settings?: Record<string, unknown>;
  position?: number;
}

export const boardsApi = {
  // Get boards in a folder
  async getByFolder(folderId: string) {
    const response = await apiClient.get<Board[]>(`/folders/${folderId}/boards`);
    return response;
  },

  // Get single board with items
  async getById(id: string) {
    const response = await apiClient.get<Board>(`/boards/${id}`);
    return response;
  },

  // Create board in a folder
  async create(folderId: string, data: CreateBoardDto) {
    const response = await apiClient.post<Board>(`/folders/${folderId}/boards`, data);
    return response;
  },

  // Update board
  async update(id: string, data: UpdateBoardDto) {
    const response = await apiClient.put<Board>(`/boards/${id}`, data);
    return response;
  },

  // Delete board
  async delete(id: string) {
    return apiClient.delete<void>(`/boards/${id}`);
  },

  // Reorder boards in folder
  async reorder(folderId: string, boardIds: string[]) {
    return apiClient.put<void>(`/folders/${folderId}/boards/reorder`, { board_ids: boardIds });
  },
};

export default boardsApi;
