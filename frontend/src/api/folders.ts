import apiClient from './client';
import type { Folder } from '@/types';

export type { Folder };

export interface CreateFolderDto {
  name: string;
  color?: string;
  icon?: string;
  position?: number;
}

export interface UpdateFolderDto {
  name?: string;
  color?: string;
  icon?: string;
  position?: number;
}

export const foldersApi = {
  async getAll() {
    return apiClient.get<Folder[]>('/folders');
  },

  async getById(id: string) {
    return apiClient.get<Folder>(`/folders/${id}`);
  },

  async create(data: CreateFolderDto) {
    return apiClient.post<Folder>('/folders', data);
  },

  async update(id: string, data: UpdateFolderDto) {
    return apiClient.put<Folder>(`/folders/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete<void>(`/folders/${id}`);
  },

  async reorder(folderIds: string[]) {
    return apiClient.put<void>('/folders/reorder', { folder_ids: folderIds });
  },
};

export default foldersApi;
