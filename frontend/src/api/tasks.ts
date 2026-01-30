import apiClient from './client';
import type { Task, TaskStatus, TaskPriority, Subtask, PaginatedResponse } from '@/types';

export interface CreateTaskDto {
  folderId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  reminderAt?: string;
  tags?: string[];
  estimatedTime?: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  reminderAt?: string | null;
  tags?: string[];
  estimatedTime?: number | null;
}

export interface TaskFilters {
  folderId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  tags?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
}

export const tasksApi = {
  async getAll(filters: TaskFilters = {}, page: number = 1, limit: number = 50) {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (filters.folderId) params.append('folderId', filters.folderId);
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);
    if (filters.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
    if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo);

    return apiClient.get<PaginatedResponse<Task>>(`/tasks?${params.toString()}`);
  },

  async getById(id: string) {
    return apiClient.get<Task>(`/tasks/${id}`);
  },

  async create(data: CreateTaskDto) {
    return apiClient.post<Task>('/tasks', data);
  },

  async update(id: string, data: UpdateTaskDto) {
    return apiClient.patch<Task>(`/tasks/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete<void>(`/tasks/${id}`);
  },

  async updateStatus(id: string, status: TaskStatus) {
    return apiClient.patch<Task>(`/tasks/${id}/status`, { status });
  },

  async addSubtask(taskId: string, title: string) {
    return apiClient.post<Subtask>(`/tasks/${taskId}/subtasks`, { title });
  },

  async updateSubtask(taskId: string, subtaskId: string, completed: boolean) {
    return apiClient.patch<Subtask>(`/tasks/${taskId}/subtasks/${subtaskId}`, { completed });
  },

  async deleteSubtask(taskId: string, subtaskId: string) {
    return apiClient.delete<void>(`/tasks/${taskId}/subtasks/${subtaskId}`);
  },

  async startTimer(id: string) {
    return apiClient.post<Task>(`/tasks/${id}/timer/start`);
  },

  async stopTimer(id: string) {
    return apiClient.post<Task>(`/tasks/${id}/timer/stop`);
  },

  async bulkUpdate(taskIds: string[], data: UpdateTaskDto) {
    return apiClient.post<Task[]>('/tasks/bulk-update', { taskIds, ...data });
  },

  async bulkDelete(taskIds: string[]) {
    return apiClient.post<void>('/tasks/bulk-delete', { taskIds });
  },
};

export default tasksApi;
