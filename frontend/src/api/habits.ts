import apiClient from './client';
import type { HabitFrequency } from '@/types';

// Habit is an Item with habit-specific metadata
export interface Habit {
  id: string;
  board_id: string;
  title: string;
  content?: string;
  status: string;
  position: number;
  metadata: {
    color?: string;
    icon?: string;
    frequency?: HabitFrequency;
    target_days?: number[];
    streak?: number;
    longest_streak?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  item_id: string;
  completed_date: string;
  created_at: string;
}

export interface CreateHabitDto {
  title: string;
  content?: string;
  metadata?: {
    color?: string;
    icon?: string;
    frequency?: HabitFrequency;
    target_days?: number[];
  };
}

export interface UpdateHabitDto {
  title?: string;
  content?: string;
  metadata?: {
    color?: string;
    icon?: string;
    frequency?: HabitFrequency;
    target_days?: number[];
  };
}

export interface HabitFilters {
  // Habits typically don't need filters beyond board
}

export const habitsApi = {
  // Get habits in a board
  async getByBoard(boardId: string) {
    return apiClient.get<Habit[]>(`/boards/${boardId}/items`);
  },

  // Get single habit
  async getById(id: string) {
    return apiClient.get<Habit>(`/items/${id}`);
  },

  // Create habit in a board
  async create(boardId: string, data: CreateHabitDto) {
    return apiClient.post<Habit>(`/boards/${boardId}/items`, {
      ...data,
      status: 'pending',
    });
  },

  // Update habit
  async update(id: string, data: UpdateHabitDto) {
    return apiClient.put<Habit>(`/items/${id}`, data);
  },

  // Delete habit
  async delete(id: string) {
    return apiClient.delete<void>(`/items/${id}`);
  },

  // Mark habit as complete for a date
  async markComplete(id: string, date: string) {
    return apiClient.post<void>(`/items/${id}/habit/complete`, { date });
  },

  // Get habit completions for a date range
  async getCompletions(id: string, from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const query = params.toString();
    const url = `/items/${id}/habit/completions${query ? `?${query}` : ''}`;
    return apiClient.get<HabitCompletion[]>(url);
  },

  // Reorder habits in board
  async reorder(boardId: string, itemIds: string[]) {
    return apiClient.put<void>(`/boards/${boardId}/items/reorder`, { item_ids: itemIds });
  },
};

export default habitsApi;
