import apiClient from './client';

// CalendarEvent is an Item with event-specific metadata
export interface CalendarEvent {
  id: string;
  board_id: string;
  title: string;
  content?: string;
  status: string;
  position: number;
  due_date?: string;
  metadata: {
    start_date?: string;
    end_date?: string;
    all_day?: boolean;
    color?: string;
    reminder?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateEventDto {
  title: string;
  content?: string;
  due_date?: string;
  metadata?: {
    start_date?: string;
    end_date?: string;
    all_day?: boolean;
    color?: string;
    reminder?: number;
  };
}

export interface UpdateEventDto {
  title?: string;
  content?: string;
  due_date?: string | null;
  metadata?: {
    start_date?: string;
    end_date?: string;
    all_day?: boolean;
    color?: string;
    reminder?: number | null;
  };
}

export interface EventFilters {
  due_before?: string;
  due_after?: string;
}

export const calendarApi = {
  // Get events in a board
  async getByBoard(boardId: string, filters: EventFilters = {}) {
    const params = new URLSearchParams();
    if (filters.due_before) params.append('due_before', filters.due_before);
    if (filters.due_after) params.append('due_after', filters.due_after);

    const query = params.toString();
    const url = `/boards/${boardId}/items${query ? `?${query}` : ''}`;
    return apiClient.get<CalendarEvent[]>(url);
  },

  // Get single event
  async getById(id: string) {
    return apiClient.get<CalendarEvent>(`/items/${id}`);
  },

  // Create event in a board
  async create(boardId: string, data: CreateEventDto) {
    return apiClient.post<CalendarEvent>(`/boards/${boardId}/items`, {
      ...data,
      status: 'pending',
    });
  },

  // Update event
  async update(id: string, data: UpdateEventDto) {
    return apiClient.put<CalendarEvent>(`/items/${id}`, data);
  },

  // Delete event
  async delete(id: string) {
    return apiClient.delete<void>(`/items/${id}`);
  },

  // Set reminder for event
  async setReminder(id: string, remindAt: string, message?: string) {
    return apiClient.post<void>(`/items/${id}/reminder`, {
      remind_at: remindAt,
      message
    });
  },

  // Reorder events in board
  async reorder(boardId: string, itemIds: string[]) {
    return apiClient.put<void>(`/boards/${boardId}/items/reorder`, { item_ids: itemIds });
  },
};

export default calendarApi;
