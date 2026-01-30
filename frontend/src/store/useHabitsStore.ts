import { create } from 'zustand';
import { format } from 'date-fns';
import type { Item, HabitCompletion } from '@/types';
import { itemsApi } from '@/api';

interface HabitsState {
  habits: Item[];
  completions: Record<string, HabitCompletion[]>; // habitId -> completions
  currentHabit: Item | null;
  isLoading: boolean;
  error: string | null;
  currentBoardId: string | null;
  selectedDate: string;

  // Actions
  fetchHabits: (boardId: string) => Promise<void>;
  fetchHabitById: (id: string) => Promise<void>;
  fetchCompletions: (id: string, from?: string, to?: string) => Promise<void>;
  createHabit: (boardId: string, data: { title: string; content?: string; metadata?: Record<string, unknown> }) => Promise<Item>;
  updateHabit: (id: string, data: Partial<Item>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  markComplete: (id: string, date?: string) => Promise<void>;
  setCurrentHabit: (habit: Item | null) => void;
  setSelectedDate: (date: string) => void;
  isCompletedOnDate: (habitId: string, date: string) => boolean;
  clearError: () => void;
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  completions: {},
  currentHabit: null,
  isLoading: false,
  error: null,
  currentBoardId: null,
  selectedDate: format(new Date(), 'yyyy-MM-dd'),

  fetchHabits: async (boardId: string) => {
    set({ isLoading: true, error: null, currentBoardId: boardId });

    try {
      const habits = await itemsApi.getByBoard(boardId);
      set({ habits, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch habits',
        isLoading: false,
      });
    }
  },

  fetchHabitById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const habit = await itemsApi.getById(id);
      set({ currentHabit: habit, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch habit',
        isLoading: false,
      });
    }
  },

  fetchCompletions: async (id: string, from?: string, to?: string) => {
    try {
      const completions = await itemsApi.getHabitCompletions(id, from, to);
      set((state) => ({
        completions: { ...state.completions, [id]: completions }
      }));
    } catch (error) {
      console.error('Failed to fetch completions:', error);
    }
  },

  createHabit: async (boardId, data) => {
    set({ error: null });
    try {
      const newHabit = await itemsApi.create(boardId, {
        ...data,
        status: 'pending',
      });
      set((state) => ({
        habits: [...state.habits, newHabit],
      }));
      return newHabit;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create habit',
      });
      throw error;
    }
  },

  updateHabit: async (id: string, data) => {
    set({ error: null });
    try {
      const updatedHabit = await itemsApi.update(id, data);
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? updatedHabit : h)),
        currentHabit: state.currentHabit?.id === id ? updatedHabit : state.currentHabit,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update habit',
      });
      throw error;
    }
  },

  deleteHabit: async (id: string) => {
    set({ error: null });
    try {
      await itemsApi.delete(id);
      set((state) => ({
        habits: state.habits.filter((h) => h.id !== id),
        currentHabit: state.currentHabit?.id === id ? null : state.currentHabit,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete habit',
      });
      throw error;
    }
  },

  markComplete: async (id: string, date?: string) => {
    const targetDate = date || get().selectedDate;
    const isAlreadyCompleted = get().isCompletedOnDate(id, targetDate);

    try {
      if (isAlreadyCompleted) {
        // Uncomplete
        await itemsApi.uncompleteHabit(id, targetDate);
      } else {
        // Complete
        await itemsApi.completeHabit(id, targetDate);
      }
      // Refresh completions
      await get().fetchCompletions(id);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle habit',
      });
    }
  },

  setCurrentHabit: (habit) => set({ currentHabit: habit }),

  setSelectedDate: (selectedDate) => set({ selectedDate }),

  isCompletedOnDate: (habitId: string, date: string) => {
    const habitCompletions = get().completions[habitId] || [];
    return habitCompletions.some((c) => c.completed_date.startsWith(date));
  },

  clearError: () => set({ error: null }),
}));

export default useHabitsStore;
