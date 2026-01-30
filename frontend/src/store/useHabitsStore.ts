import { create } from 'zustand';
import { format } from 'date-fns';
import type { Habit, HabitCompletion } from '@/types';
import { habitsApi, type CreateHabitDto, type UpdateHabitDto, type HabitFilters } from '@/api';

interface HabitsState {
  habits: Habit[];
  currentHabit: Habit | null;
  isLoading: boolean;
  error: string | null;
  filters: HabitFilters;
  selectedDate: string;

  // Actions
  fetchHabits: (filters?: HabitFilters) => Promise<void>;
  fetchHabitById: (id: string) => Promise<void>;
  createHabit: (data: CreateHabitDto) => Promise<Habit>;
  updateHabit: (id: string, data: UpdateHabitDto) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  markComplete: (id: string, date?: string) => Promise<void>;
  markIncomplete: (id: string, date?: string) => Promise<void>;
  setCurrentHabit: (habit: Habit | null) => void;
  setSelectedDate: (date: string) => void;
  setFilters: (filters: HabitFilters) => void;
  isCompletedOnDate: (habitId: string, date: string) => boolean;
  clearError: () => void;
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  currentHabit: null,
  isLoading: false,
  error: null,
  filters: {},
  selectedDate: format(new Date(), 'yyyy-MM-dd'),

  fetchHabits: async (filters?: HabitFilters) => {
    const currentFilters = filters || get().filters;
    set({ isLoading: true, error: null });

    try {
      const response = await habitsApi.getAll(currentFilters);
      set({
        habits: response.data.items,
        filters: currentFilters,
        isLoading: false,
      });
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
      const response = await habitsApi.getById(id);
      set({ currentHabit: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch habit',
        isLoading: false,
      });
    }
  },

  createHabit: async (data: CreateHabitDto) => {
    set({ error: null });
    try {
      const response = await habitsApi.create(data);
      const newHabit = response.data;
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

  updateHabit: async (id: string, data: UpdateHabitDto) => {
    set({ error: null });
    try {
      const response = await habitsApi.update(id, data);
      const updatedHabit = response.data;
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
      await habitsApi.delete(id);
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
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;

    // Optimistic update
    const newCompletion: HabitCompletion = { date: targetDate, completed: true };
    const updatedCompletions = [
      ...habit.completions.filter((c) => c.date !== targetDate),
      newCompletion,
    ];

    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id
          ? {
              ...h,
              completions: updatedCompletions,
              streak: h.streak + 1,
            }
          : h
      ),
    }));

    try {
      await habitsApi.markComplete(id, targetDate);
    } catch (error) {
      // Revert on error
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? habit : h)),
        error: error instanceof Error ? error.message : 'Failed to mark complete',
      }));
    }
  },

  markIncomplete: async (id: string, date?: string) => {
    const targetDate = date || get().selectedDate;
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;

    // Optimistic update
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id
          ? {
              ...h,
              completions: h.completions.filter((c) => c.date !== targetDate),
              streak: Math.max(0, h.streak - 1),
            }
          : h
      ),
    }));

    try {
      await habitsApi.markIncomplete(id, targetDate);
    } catch (error) {
      // Revert on error
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? habit : h)),
        error: error instanceof Error ? error.message : 'Failed to mark incomplete',
      }));
    }
  },

  setCurrentHabit: (habit) => set({ currentHabit: habit }),

  setSelectedDate: (selectedDate) => set({ selectedDate }),

  setFilters: (filters) => set({ filters }),

  isCompletedOnDate: (habitId: string, date: string) => {
    const habit = get().habits.find((h) => h.id === habitId);
    if (!habit) return false;
    return habit.completions.some((c) => c.date === date && c.completed);
  },

  clearError: () => set({ error: null }),
}));

export default useHabitsStore;
