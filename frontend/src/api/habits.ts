import apiClient from './client';
import type { Habit, HabitFrequency, PaginatedResponse } from '@/types';

export interface CreateHabitDto {
  folderId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  frequency?: HabitFrequency;
  targetDays?: number[];
}

export interface UpdateHabitDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  frequency?: HabitFrequency;
  targetDays?: number[];
}

export interface HabitFilters {
  folderId?: string;
  frequency?: HabitFrequency;
}

export const habitsApi = {
  async getAll(filters: HabitFilters = {}, page: number = 1, limit: number = 50) {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (filters.folderId) params.append('folderId', filters.folderId);
    if (filters.frequency) params.append('frequency', filters.frequency);

    return apiClient.get<PaginatedResponse<Habit>>(`/habits?${params.toString()}`);
  },

  async getById(id: string) {
    return apiClient.get<Habit>(`/habits/${id}`);
  },

  async create(data: CreateHabitDto) {
    return apiClient.post<Habit>('/habits', data);
  },

  async update(id: string, data: UpdateHabitDto) {
    return apiClient.patch<Habit>(`/habits/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete<void>(`/habits/${id}`);
  },

  async markComplete(id: string, date: string) {
    return apiClient.post<Habit>(`/habits/${id}/complete`, { date });
  },

  async markIncomplete(id: string, date: string) {
    return apiClient.post<Habit>(`/habits/${id}/incomplete`, { date });
  },

  async getStats(id: string, startDate: string, endDate: string) {
    return apiClient.get<{
      completionRate: number;
      currentStreak: number;
      longestStreak: number;
      totalCompletions: number;
    }>(`/habits/${id}/stats?startDate=${startDate}&endDate=${endDate}`);
  },
};

export default habitsApi;
