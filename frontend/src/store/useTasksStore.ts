import { create } from 'zustand';
import type { Item, ItemStatus } from '@/types';
import { itemsApi } from '@/api';

interface TasksState {
  tasks: Item[];
  currentTask: Item | null;
  isLoading: boolean;
  error: string | null;
  currentBoardId: string | null;

  // Active timer
  activeTimerTaskId: string | null;
  timerStartTime: number | null;

  // Actions
  fetchTasks: (boardId: string) => Promise<void>;
  fetchTaskById: (id: string) => Promise<void>;
  createTask: (boardId: string, data: { title: string; content?: string; status?: ItemStatus; due_date?: string; metadata?: Record<string, unknown> }) => Promise<Item>;
  updateTask: (id: string, data: Partial<Item>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string, completed: boolean) => Promise<void>;
  setCurrentTask: (task: Item | null) => void;

  // Timer
  startTimer: (taskId: string) => void;
  stopTimer: () => Promise<void>;

  clearError: () => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,
  currentBoardId: null,
  activeTimerTaskId: null,
  timerStartTime: null,

  fetchTasks: async (boardId: string) => {
    set({ isLoading: true, error: null, currentBoardId: boardId });

    try {
      const tasks = await itemsApi.getByBoard(boardId);
      set({ tasks, isLoading: false });
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
      const task = await itemsApi.getById(id);
      set({ currentTask: task, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch task',
        isLoading: false,
      });
    }
  },

  createTask: async (boardId, data) => {
    set({ error: null });
    try {
      const newTask = await itemsApi.create(boardId, data);
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

  updateTask: async (id: string, data) => {
    set({ error: null });
    try {
      const updatedTask = await itemsApi.update(id, data);
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
      await itemsApi.delete(id);
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

  completeTask: async (id: string, completed: boolean) => {
    const { tasks } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: completed ? 'completed' : 'pending',
              completed_at: completed ? new Date().toISOString() : undefined,
            }
          : t
      ),
    }));

    try {
      // Use the complete endpoint so backend sets completed_at properly
      await itemsApi.complete(id, completed);
    } catch (error) {
      // Revert on error
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
        error: error instanceof Error ? error.message : 'Failed to update task status',
      }));
    }
  },

  setCurrentTask: (task) => set({ currentTask: task }),

  startTimer: (taskId: string) => {
    set({
      activeTimerTaskId: taskId,
      timerStartTime: Date.now(),
    });
  },

  stopTimer: async () => {
    const { activeTimerTaskId, timerStartTime, tasks } = get();
    if (!activeTimerTaskId || !timerStartTime) return;

    const elapsed = Math.floor((Date.now() - timerStartTime) / 1000); // seconds
    const task = tasks.find((t) => t.id === activeTimerTaskId);

    if (task) {
      const currentSpent = (task.metadata?.time_spent as number) || 0;
      const newTimeSpent = currentSpent + elapsed;

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === activeTimerTaskId
            ? { ...t, metadata: { ...t.metadata, time_spent: newTimeSpent, timer_started: undefined } }
            : t
        ),
        activeTimerTaskId: null,
        timerStartTime: null,
      }));

      try {
        await itemsApi.update(activeTimerTaskId, {
          metadata: { ...task.metadata, time_spent: newTimeSpent, timer_started: null }
        });
      } catch (error) {
        console.error('Failed to sync timer with server:', error);
      }
    }
  },

  clearError: () => set({ error: null }),
}));

export default useTasksStore;
