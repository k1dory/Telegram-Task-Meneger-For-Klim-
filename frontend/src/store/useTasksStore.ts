import { create } from 'zustand';
import type { Task, TaskStatus, TaskPriority, Subtask } from '@/types';
import { tasksApi, type CreateTaskDto, type UpdateTaskDto, type TaskFilters } from '@/api';

interface TasksState {
  tasks: Task[];
  currentTask: Task | null;
  isLoading: boolean;
  error: string | null;
  filters: TaskFilters;
  hasMore: boolean;
  page: number;

  // Active timer
  activeTimerTaskId: string | null;
  timerStartTime: number | null;

  // Actions
  fetchTasks: (filters?: TaskFilters, reset?: boolean) => Promise<void>;
  fetchTaskById: (id: string) => Promise<void>;
  createTask: (data: CreateTaskDto) => Promise<Task>;
  updateTask: (id: string, data: UpdateTaskDto) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  setCurrentTask: (task: Task | null) => void;
  setFilters: (filters: TaskFilters) => void;

  // Subtasks
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;

  // Timer
  startTimer: (taskId: string) => void;
  stopTimer: () => Promise<void>;

  // Bulk actions
  bulkUpdateStatus: (taskIds: string[], status: TaskStatus) => Promise<void>;
  bulkDelete: (taskIds: string[]) => Promise<void>;

  clearError: () => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,
  filters: {},
  hasMore: true,
  page: 1,
  activeTimerTaskId: null,
  timerStartTime: null,

  fetchTasks: async (filters?: TaskFilters, reset = true) => {
    const currentFilters = filters || get().filters;
    const page = reset ? 1 : get().page;

    set({ isLoading: true, error: null });

    try {
      const response = await tasksApi.getAll(currentFilters, page);
      set((state) => ({
        tasks: reset ? response.items : [...state.tasks, ...response.items],
        hasMore: response.hasMore,
        page: page + 1,
        filters: currentFilters,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        isLoading: false,
      });
    }
  },

  fetchTaskById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tasksApi.getById(id);
      set({ currentTask: response, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch task',
        isLoading: false,
      });
    }
  },

  createTask: async (data: CreateTaskDto) => {
    set({ error: null });
    try {
      const newTask = await tasksApi.create(data);
      set((state) => ({
        tasks: [newTask, ...state.tasks],
      }));
      return newTask;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create task',
      });
      throw error;
    }
  },

  updateTask: async (id: string, data: UpdateTaskDto) => {
    set({ error: null });
    try {
      const updatedTask = await tasksApi.update(id, data);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
        currentTask: state.currentTask?.id === id ? updatedTask : state.currentTask,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update task',
      });
      throw error;
    }
  },

  deleteTask: async (id: string) => {
    set({ error: null });
    try {
      await tasksApi.delete(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        currentTask: state.currentTask?.id === id ? null : state.currentTask,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete task',
      });
      throw error;
    }
  },

  updateTaskStatus: async (id: string, status: TaskStatus) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              completedAt: status === 'completed' ? new Date().toISOString() : undefined,
            }
          : t
      ),
    }));

    try {
      await tasksApi.updateStatus(id, status);
    } catch (error) {
      // Revert on error
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
        error: error instanceof Error ? error.message : 'Failed to update task status',
      }));
    }
  },

  setCurrentTask: (task) => set({ currentTask: task }),

  setFilters: (filters) => set({ filters }),

  addSubtask: async (taskId: string, title: string) => {
    try {
      const newSubtask = await tasksApi.addSubtask(taskId, title);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, subtasks: [...t.subtasks, newSubtask] } : t
        ),
        currentTask:
          state.currentTask?.id === taskId
            ? { ...state.currentTask, subtasks: [...state.currentTask.subtasks, newSubtask] }
            : state.currentTask,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add subtask',
      });
    }
  },

  toggleSubtask: async (taskId: string, subtaskId: string, completed: boolean) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed } : s
              ),
            }
          : t
      ),
    }));

    try {
      await tasksApi.updateSubtask(taskId, subtaskId, completed);
    } catch (error) {
      // Revert would be handled here
      set({
        error: error instanceof Error ? error.message : 'Failed to update subtask',
      });
    }
  },

  deleteSubtask: async (taskId: string, subtaskId: string) => {
    try {
      await tasksApi.deleteSubtask(taskId, subtaskId);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }
            : t
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete subtask',
      });
    }
  },

  startTimer: (taskId: string) => {
    set({
      activeTimerTaskId: taskId,
      timerStartTime: Date.now(),
    });
  },

  stopTimer: async () => {
    const { activeTimerTaskId, timerStartTime, tasks } = get();
    if (!activeTimerTaskId || !timerStartTime) return;

    const elapsed = Math.floor((Date.now() - timerStartTime) / 60000); // minutes
    const task = tasks.find((t) => t.id === activeTimerTaskId);

    if (task) {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === activeTimerTaskId
            ? { ...t, timeSpent: t.timeSpent + elapsed }
            : t
        ),
        activeTimerTaskId: null,
        timerStartTime: null,
      }));

      try {
        await tasksApi.stopTimer(activeTimerTaskId);
      } catch (error) {
        console.error('Failed to sync timer with server:', error);
      }
    }
  },

  bulkUpdateStatus: async (taskIds: string[], status: TaskStatus) => {
    try {
      await tasksApi.bulkUpdate(taskIds, { status });
      set((state) => ({
        tasks: state.tasks.map((t) =>
          taskIds.includes(t.id) ? { ...t, status } : t
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update tasks',
      });
    }
  },

  bulkDelete: async (taskIds: string[]) => {
    try {
      await tasksApi.bulkDelete(taskIds);
      set((state) => ({
        tasks: state.tasks.filter((t) => !taskIds.includes(t.id)),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete tasks',
      });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useTasksStore;
