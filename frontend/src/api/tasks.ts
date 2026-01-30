import apiClient from './client';
import type { TaskStatus, TaskPriority, ItemMetadata } from '@/types';

// Task is an Item with task-specific metadata
export interface Task {
  id: string;
  board_id: string;
  parent_id?: string;
  title: string;
  content?: string;
  status: TaskStatus;
  position: number;
  due_date?: string;
  completed_at?: string;
  metadata: ItemMetadata;
  created_at: string;
  updated_at: string;
  children?: Task[];
}

export interface CreateTaskDto {
  title: string;
  content?: string;
  status?: TaskStatus;
  due_date?: string;
  metadata?: Partial<ItemMetadata>;
}

export interface UpdateTaskDto {
  title?: string;
  content?: string;
  status?: TaskStatus;
  due_date?: string | null;
  metadata?: Partial<ItemMetadata>;
}

export interface TaskFilters {
  status?: TaskStatus;
  due_before?: string;
  due_after?: string;
}

export const tasksApi = {
  // Get tasks in a board (items with task-like behavior)
  async getByBoard(boardId: string, filters: TaskFilters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.due_before) params.append('due_before', filters.due_before);
    if (filters.due_after) params.append('due_after', filters.due_after);

    const query = params.toString();
    const url = `/boards/${boardId}/items${query ? `?${query}` : ''}`;
    return apiClient.get<Task[]>(url);
  },

  // Get single task
  async getById(id: string) {
    return apiClient.get<Task>(`/items/${id}`);
  },

  // Create task in a board
  async create(boardId: string, data: CreateTaskDto) {
    return apiClient.post<Task>(`/boards/${boardId}/items`, data);
  },

  // Update task
  async update(id: string, data: UpdateTaskDto) {
    return apiClient.put<Task>(`/items/${id}`, data);
  },

  // Delete task
  async delete(id: string) {
    return apiClient.delete<void>(`/items/${id}`);
  },

  // Update task status
  async updateStatus(id: string, status: TaskStatus) {
    return apiClient.put<Task>(`/items/${id}`, { status });
  },

  // Complete/uncomplete task
  async complete(id: string, completed: boolean) {
    return apiClient.put<Task>(`/items/${id}/complete`, { completed });
  },

  // Set reminder for task
  async setReminder(id: string, remindAt: string, message?: string) {
    return apiClient.post<void>(`/items/${id}/reminder`, {
      remind_at: remindAt,
      message
    });
  },

  // Timer operations (stored in metadata)
  async startTimer(id: string) {
    return apiClient.put<Task>(`/items/${id}`, {
      metadata: { timer_started: new Date().toISOString() }
    });
  },

  async stopTimer(id: string) {
    // Get current task to calculate time spent
    const task = await apiClient.get<Task>(`/items/${id}`);
    const timerStarted = task.metadata?.timer_started as string | undefined;

    if (timerStarted) {
      const elapsed = Math.floor((Date.now() - new Date(timerStarted).getTime()) / 1000);
      const currentSpent = (task.metadata?.time_spent as number) || 0;

      return apiClient.put<Task>(`/items/${id}`, {
        metadata: {
          ...task.metadata,
          timer_started: null,
          time_spent: currentSpent + elapsed
        }
      });
    }

    return task;
  },

  // Reorder tasks in board
  async reorder(boardId: string, itemIds: string[]) {
    return apiClient.put<void>(`/boards/${boardId}/items/reorder`, { item_ids: itemIds });
  },
};

export default tasksApi;
