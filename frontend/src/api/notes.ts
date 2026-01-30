import apiClient from './client';

// Note is an Item with note-specific metadata
export interface Note {
  id: string;
  board_id: string;
  title: string;
  content?: string;
  status: string;
  position: number;
  metadata: {
    color?: string;
    pinned?: boolean;
    tags?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface CreateNoteDto {
  title: string;
  content?: string;
  metadata?: {
    color?: string;
    pinned?: boolean;
    tags?: string[];
  };
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  metadata?: {
    color?: string;
    pinned?: boolean;
    tags?: string[];
  };
}

export interface NoteFilters {
  pinned?: boolean;
}

export const notesApi = {
  // Get notes in a board
  async getByBoard(boardId: string, filters: NoteFilters = {}) {
    const url = `/boards/${boardId}/items`;
    const notes = await apiClient.get<Note[]>(url);

    // Client-side filter for pinned if needed
    if (filters.pinned !== undefined) {
      return notes.filter(n => n.metadata?.pinned === filters.pinned);
    }

    return notes;
  },

  // Get single note
  async getById(id: string) {
    return apiClient.get<Note>(`/items/${id}`);
  },

  // Create note in a board
  async create(boardId: string, data: CreateNoteDto) {
    return apiClient.post<Note>(`/boards/${boardId}/items`, {
      ...data,
      status: 'pending', // Notes don't really have status but API requires it
    });
  },

  // Update note
  async update(id: string, data: UpdateNoteDto) {
    return apiClient.put<Note>(`/items/${id}`, data);
  },

  // Delete note
  async delete(id: string) {
    return apiClient.delete<void>(`/items/${id}`);
  },

  // Pin/unpin note
  async togglePin(id: string, pinned: boolean) {
    const note = await apiClient.get<Note>(`/items/${id}`);
    return apiClient.put<Note>(`/items/${id}`, {
      metadata: { ...note.metadata, pinned }
    });
  },

  // Update note color
  async setColor(id: string, color: string) {
    const note = await apiClient.get<Note>(`/items/${id}`);
    return apiClient.put<Note>(`/items/${id}`, {
      metadata: { ...note.metadata, color }
    });
  },

  // Reorder notes in board
  async reorder(boardId: string, itemIds: string[]) {
    return apiClient.put<void>(`/boards/${boardId}/items/reorder`, { item_ids: itemIds });
  },
};

export default notesApi;
