import apiClient from './client';

// Analytics overview response from backend
export interface AnalyticsOverview {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  total_folders: number;
  total_boards: number;
  active_streaks: number;
  tasks_today: number;
  tasks_this_week: number;
}

// Completion stats for a single day
export interface CompletionStats {
  date: string;
  completed: number;
  created: number;
}

export interface StatsFilters {
  days?: number;
}

export const statsApi = {
  // Get overall analytics overview
  async getOverview() {
    return apiClient.get<AnalyticsOverview>('/analytics/overview');
  },

  // Get completion statistics for the last N days
  async getCompletionStats(days: number = 7) {
    const params = new URLSearchParams();
    params.append('days', days.toString());

    return apiClient.get<CompletionStats[]>(`/analytics/completion?${params.toString()}`);
  },
};

export default statsApi;
