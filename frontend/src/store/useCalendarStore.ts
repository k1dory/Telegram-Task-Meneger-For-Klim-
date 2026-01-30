import { create } from 'zustand';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import type { Item } from '@/types';
import { itemsApi } from '@/api';

interface CalendarState {
  events: Item[];
  currentEvent: Item | null;
  isLoading: boolean;
  error: string | null;
  currentBoardId: string | null;
  currentMonth: Date;
  selectedDate: Date | null;
  viewMode: 'month' | 'week' | 'day';

  // Actions
  fetchEvents: (boardId: string) => Promise<void>;
  fetchEventById: (id: string) => Promise<void>;
  createEvent: (boardId: string, data: { title: string; content?: string; due_date?: string; metadata?: Record<string, unknown> }) => Promise<Item>;
  updateEvent: (id: string, data: Partial<Item>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  setCurrentEvent: (event: Item | null) => void;
  setCurrentMonth: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
  nextMonth: () => void;
  prevMonth: () => void;
  getEventsForDate: (date: Date) => Item[];
  clearError: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  currentEvent: null,
  isLoading: false,
  error: null,
  currentBoardId: null,
  currentMonth: new Date(),
  selectedDate: null,
  viewMode: 'month',

  fetchEvents: async (boardId: string) => {
    const { currentMonth } = get();
    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    set({ isLoading: true, error: null, currentBoardId: boardId });

    try {
      const events = await itemsApi.getByBoard(boardId, {
        due_after: startDate,
        due_before: endDate,
      });
      set({ events, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        isLoading: false,
      });
    }
  },

  fetchEventById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const event = await itemsApi.getById(id);
      set({ currentEvent: event, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch event',
        isLoading: false,
      });
    }
  },

  createEvent: async (boardId, data) => {
    set({ error: null });
    try {
      const newEvent = await itemsApi.create(boardId, {
        ...data,
        status: 'pending',
      });
      set((state) => ({
        events: [...state.events, newEvent],
      }));
      return newEvent;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create event',
      });
      throw error;
    }
  },

  updateEvent: async (id: string, data) => {
    set({ error: null });
    try {
      const updatedEvent = await itemsApi.update(id, data);
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? updatedEvent : e)),
        currentEvent: state.currentEvent?.id === id ? updatedEvent : state.currentEvent,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update event',
      });
      throw error;
    }
  },

  deleteEvent: async (id: string) => {
    set({ error: null });
    try {
      await itemsApi.delete(id);
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
        currentEvent: state.currentEvent?.id === id ? null : state.currentEvent,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete event',
      });
      throw error;
    }
  },

  setCurrentEvent: (event) => set({ currentEvent: event }),

  setCurrentMonth: (currentMonth) => set({ currentMonth }),

  setSelectedDate: (selectedDate) => set({ selectedDate }),

  setViewMode: (viewMode) => set({ viewMode }),

  nextMonth: () => {
    set((state) => ({ currentMonth: addMonths(state.currentMonth, 1) }));
    const { currentBoardId } = get();
    if (currentBoardId) {
      get().fetchEvents(currentBoardId);
    }
  },

  prevMonth: () => {
    set((state) => ({ currentMonth: subMonths(state.currentMonth, 1) }));
    const { currentBoardId } = get();
    if (currentBoardId) {
      get().fetchEvents(currentBoardId);
    }
  },

  getEventsForDate: (date: Date) => {
    const { events } = get();
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter((event) => {
      // Check due_date or metadata.start_date/end_date
      const eventStart = event.metadata?.start_date || event.due_date;
      const eventEnd = event.metadata?.end_date || event.due_date;

      if (!eventStart) return false;

      const startStr = eventStart.split('T')[0];
      const endStr = eventEnd ? eventEnd.split('T')[0] : startStr;

      return dateStr >= startStr && dateStr <= endStr;
    });
  },

  clearError: () => set({ error: null }),
}));

export default useCalendarStore;
