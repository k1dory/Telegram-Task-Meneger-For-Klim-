import apiClient from './client';
import type { Note, PaginatedResponse } from '@/types';

export interface CreateNoteDto {
  folderId: string;
  title: string;
  content?: string;
  color?: string;
  tags?: string[];
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  color?: string;
  pinned?: boolean;
  tags?: string[];
}

export interface NoteFilters {
  folderId?: string;
  search?: string;
  tags?: string[];
  pinned?: boolean;
}

export const notesApi = {
  async getAll(filters: NoteFilters = {}, page: number = 1, limit: number = 50) {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (filters.folderId) params.append('folderId', filters.folderId);
    if (filters.search) params.append('search', filters.search);
    if (filters.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters.pinned !== undefined) params.append('pinned', filters.pinned.toString());

    return apiClient.get<PaginatedResponse<Note>>(`/notes?${params.toString()}`);
  },

  async getById(id: string) {
    return apiClient.get<Note>(`/notes/${id}`);
  },

  async create(data: CreateNoteDto) {
    return apiClient.post<Note>('/notes', data);
  },

  async update(id: string, data: UpdateNoteDto) {
    return apiClient.patch<Note>(`/notes/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete<void>(`/notes/${id}`);
  },

  async togglePin(id: string) {
    return apiClient.post<Note>(`/notes/${id}/toggle-pin`);
  },

  async duplicate(id: string) {
    return apiClient.post<Note>(`/notes/${id}/duplicate`);
  },
};

export default notesApi;
