import apiClient from './client';
import type { TaskStatus } from '@/types';

// Item corresponds to Task/Note/Habit in the backend
export interface Item {
  id: string;
  board_id: string;
  parent_id?: string;
  title: string;
  content?: string;
  status: TaskStatus;
  position: number;
  due_date?: string;
  completed_at?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  children?: Item[];
}

export interface CreateItemDto {
  parent_id?: string;
  title: string;
  content?: string;
  status?: TaskStatus;
  position?: number;
  due_date?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateItemDto {
  title?: string;
  content?: string;
  status?: TaskStatus;
  position?: number;
  due_date?: string | null;
  metadata?: Record<string, unknown>;
  completed_at?: string | null;
}

export interface ItemFilters {
  status?: TaskStatus;
  due_before?: string;
  due_after?: string;
  parent_id?: string;
}

export const itemsApi = {
  // Get items in a board
  async getByBoard(boardId: string, filters: ItemFilters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.due_before) params.append('due_before', filters.due_before);
    if (filters.due_after) params.append('due_after', filters.due_after);
    if (filters.parent_id) params.append('parent_id', filters.parent_id);

    const query = params.toString();
    const url = `/boards/${boardId}/items${query ? `?${query}` : ''}`;
    const response = await apiClient.get<Item[]>(url);
    return response;
  },

  // Get single item
  async getById(id: string) {
    const response = await apiClient.get<Item>(`/items/${id}`);
    return response;
  },

  // Create item in a board
  async create(boardId: string, data: CreateItemDto) {
    const response = await apiClient.post<Item>(`/boards/${boardId}/items`, data);
    return response;
  },

  // Update item
  async update(id: string, data: UpdateItemDto) {
    const response = await apiClient.put<Item>(`/items/${id}`, data);
    return response;
  },

  // Delete item
  async delete(id: string) {
    return apiClient.delete<void>(`/items/${id}`);
  },

  // Complete/uncomplete item
  async complete(id: string, completed: boolean) {
    const response = await apiClient.put<Item>(`/items/${id}/complete`, { completed });
    return response;
  },

  // Move item to another board
  async move(id: string, boardId: string, position?: number) {
    const response = await apiClient.put<Item>(`/items/${id}/move`, {
      board_id: boardId,
      position: position ?? 0
    });
    return response;
  },

  // Set reminder for item
  async setReminder(id: string, remindAt: string, message?: string) {
    return apiClient.post<void>(`/items/${id}/reminder`, {
      remind_at: remindAt,
      message
    });
  },

  // Reorder items in board
  async reorder(boardId: string, itemIds: string[]) {
    return apiClient.put<void>(`/boards/${boardId}/items/reorder`, { item_ids: itemIds });
  },

  // Habit tracking
  async completeHabit(id: string, date: string) {
    return apiClient.post<void>(`/items/${id}/habit/complete`, { date });
  },

  async getHabitCompletions(id: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const query = params.toString();
    const url = `/items/${id}/habit/completions${query ? `?${query}` : ''}`;
    return apiClient.get<{ date: string; completed: boolean }[]>(url);
  },
};

export default itemsApi;
