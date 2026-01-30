import apiClient from './client';
import type { Folder, BoardType, PaginatedResponse } from '@/types';

export interface CreateFolderDto {
  name: string;
  color: string;
  icon: string;
  boardTypes: BoardType[];
}

export interface UpdateFolderDto {
  name?: string;
  color?: string;
  icon?: string;
  boardTypes?: BoardType[];
}

export const foldersApi = {
  async getAll(page: number = 1, limit: number = 20) {
    return apiClient.get<PaginatedResponse<Folder>>(`/folders?page=${page}&limit=${limit}`);
  },

  async getById(id: string) {
    return apiClient.get<Folder>(`/folders/${id}`);
  },

  async create(data: CreateFolderDto) {
    return apiClient.post<Folder>('/folders', data);
  },

  async update(id: string, data: UpdateFolderDto) {
    return apiClient.patch<Folder>(`/folders/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete<void>(`/folders/${id}`);
  },

  async reorder(folderIds: string[]) {
    return apiClient.post<void>('/folders/reorder', { folderIds });
  },
};

export default foldersApi;
