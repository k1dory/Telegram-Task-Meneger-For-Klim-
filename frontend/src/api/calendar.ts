import apiClient from './client';
import type { CalendarEvent, PaginatedResponse } from '@/types';

export interface CreateEventDto {
  folderId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  color?: string;
  reminder?: number;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  color?: string;
  reminder?: number | null;
}

export interface EventFilters {
  folderId?: string;
  startDate?: string;
  endDate?: string;
}

export const calendarApi = {
  async getAll(filters: EventFilters = {}, page: number = 1, limit: number = 100) {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (filters.folderId) params.append('folderId', filters.folderId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    return apiClient.get<PaginatedResponse<CalendarEvent>>(`/calendar?${params.toString()}`);
  },

  async getById(id: string) {
    return apiClient.get<CalendarEvent>(`/calendar/${id}`);
  },

  async create(data: CreateEventDto) {
    return apiClient.post<CalendarEvent>('/calendar', data);
  },

  async update(id: string, data: UpdateEventDto) {
    return apiClient.patch<CalendarEvent>(`/calendar/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete<void>(`/calendar/${id}`);
  },

  async getByMonth(year: number, month: number, folderId?: string) {
    const params = new URLSearchParams();
    params.append('year', year.toString());
    params.append('month', month.toString());
    if (folderId) params.append('folderId', folderId);

    return apiClient.get<CalendarEvent[]>(`/calendar/month?${params.toString()}`);
  },
};

export default calendarApi;
