import apiClient from './client';
import type { Statistics, DayStats, HabitStats } from '@/types';

export interface StatsFilters {
  folderId?: string;
  startDate?: string;
  endDate?: string;
}

export const statsApi = {
  async getOverview(filters: StatsFilters = {}) {
    const params = new URLSearchParams();
    if (filters.folderId) params.append('folderId', filters.folderId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    return apiClient.get<Statistics>(`/stats/overview?${params.toString()}`);
  },

  async getCompletionsByDay(filters: StatsFilters = {}) {
    const params = new URLSearchParams();
    if (filters.folderId) params.append('folderId', filters.folderId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    return apiClient.get<DayStats[]>(`/stats/completions?${params.toString()}`);
  },

  async getTimeSpent(filters: StatsFilters = {}) {
    const params = new URLSearchParams();
    if (filters.folderId) params.append('folderId', filters.folderId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    return apiClient.get<{
      total: number;
      byDay: { date: string; minutes: number }[];
      byTask: { taskId: string; title: string; minutes: number }[];
    }>(`/stats/time-spent?${params.toString()}`);
  },

  async getHabitStats(filters: StatsFilters = {}) {
    const params = new URLSearchParams();
    if (filters.folderId) params.append('folderId', filters.folderId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    return apiClient.get<HabitStats[]>(`/stats/habits?${params.toString()}`);
  },

  async getProductivityScore(filters: StatsFilters = {}) {
    const params = new URLSearchParams();
    if (filters.folderId) params.append('folderId', filters.folderId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    return apiClient.get<{
      score: number;
      trend: number;
      factors: {
        tasksCompleted: number;
        habitsCompleted: number;
        timeTracked: number;
      };
    }>(`/stats/productivity?${params.toString()}`);
  },
};

export default statsApi;
