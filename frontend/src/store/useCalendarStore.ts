import { create } from 'zustand';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import type { CalendarEvent } from '@/types';
import { calendarApi, type CreateEventDto, type UpdateEventDto } from '@/api';

interface CalendarState {
  events: CalendarEvent[];
  currentEvent: CalendarEvent | null;
  isLoading: boolean;
  error: string | null;
  currentMonth: Date;
  selectedDate: Date | null;
  viewMode: 'month' | 'week' | 'day';

  // Actions
  fetchEvents: (folderId?: string) => Promise<void>;
  fetchEventById: (id: string) => Promise<void>;
  createEvent: (data: CreateEventDto) => Promise<CalendarEvent>;
  updateEvent: (id: string, data: UpdateEventDto) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  setCurrentEvent: (event: CalendarEvent | null) => void;
  setCurrentMonth: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
  nextMonth: () => void;
  prevMonth: () => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
  clearError: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  currentEvent: null,
  isLoading: false,
  error: null,
  currentMonth: new Date(),
  selectedDate: null,
  viewMode: 'month',

  fetchEvents: async (folderId?: string) => {
    const { currentMonth } = get();
    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    set({ isLoading: true, error: null });

    try {
      const response = await calendarApi.getAll({ folderId, startDate, endDate });
      set({ events: response.data.items, isLoading: false });
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
      const response = await calendarApi.getById(id);
      set({ currentEvent: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch event',
        isLoading: false,
      });
    }
  },

  createEvent: async (data: CreateEventDto) => {
    set({ error: null });
    try {
      const response = await calendarApi.create(data);
      const newEvent = response.data;
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

  updateEvent: async (id: string, data: UpdateEventDto) => {
    set({ error: null });
    try {
      const response = await calendarApi.update(id, data);
      const updatedEvent = response.data;
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
      await calendarApi.delete(id);
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
    get().fetchEvents();
  },

  prevMonth: () => {
    set((state) => ({ currentMonth: subMonths(state.currentMonth, 1) }));
    get().fetchEvents();
  },

  getEventsForDate: (date: Date) => {
    const { events } = get();
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter((event) => {
      const eventStart = format(new Date(event.startDate), 'yyyy-MM-dd');
      const eventEnd = format(new Date(event.endDate), 'yyyy-MM-dd');
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  },

  clearError: () => set({ error: null }),
}));

export default useCalendarStore;
