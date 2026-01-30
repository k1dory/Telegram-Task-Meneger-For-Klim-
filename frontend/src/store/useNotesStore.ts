import { create } from 'zustand';
import type { Note } from '@/types';
import { notesApi, type CreateNoteDto, type UpdateNoteDto, type NoteFilters } from '@/api';

interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  isLoading: boolean;
  error: string | null;
  filters: NoteFilters;
  hasMore: boolean;
  page: number;

  // Actions
  fetchNotes: (filters?: NoteFilters, reset?: boolean) => Promise<void>;
  fetchNoteById: (id: string) => Promise<void>;
  createNote: (data: CreateNoteDto) => Promise<Note>;
  updateNote: (id: string, data: UpdateNoteDto) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
  setFilters: (filters: NoteFilters) => void;
  clearError: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  currentNote: null,
  isLoading: false,
  error: null,
  filters: {},
  hasMore: true,
  page: 1,

  fetchNotes: async (filters?: NoteFilters, reset = true) => {
    const currentFilters = filters || get().filters;
    const page = reset ? 1 : get().page;

    set({ isLoading: true, error: null });

    try {
      const response = await notesApi.getAll(currentFilters, page);
      const sortedNotes = [...response.data.items].sort((a, b) => {
        // Pinned notes first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        // Then by updated date
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      set((state) => ({
        notes: reset ? sortedNotes : [...state.notes, ...sortedNotes],
        hasMore: response.data.hasMore,
        page: page + 1,
        filters: currentFilters,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch notes',
        isLoading: false,
      });
    }
  },

  fetchNoteById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notesApi.getById(id);
      set({ currentNote: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch note',
        isLoading: false,
      });
    }
  },

  createNote: async (data: CreateNoteDto) => {
    set({ error: null });
    try {
      const response = await notesApi.create(data);
      const newNote = response.data;
      set((state) => ({
        notes: [newNote, ...state.notes],
      }));
      return newNote;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create note',
      });
      throw error;
    }
  },

  updateNote: async (id: string, data: UpdateNoteDto) => {
    set({ error: null });
    try {
      const response = await notesApi.update(id, data);
      const updatedNote = response.data;
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? updatedNote : n)),
        currentNote: state.currentNote?.id === id ? updatedNote : state.currentNote,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update note',
      });
      throw error;
    }
  },

  deleteNote: async (id: string) => {
    set({ error: null });
    try {
      await notesApi.delete(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete note',
      });
      throw error;
    }
  },

  togglePin: async (id: string) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;

    // Optimistic update
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned } : n
      ),
    }));

    try {
      await notesApi.togglePin(id);
    } catch (error) {
      // Revert on error
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? note : n)),
        error: error instanceof Error ? error.message : 'Failed to toggle pin',
      }));
    }
  },

  duplicateNote: async (id: string) => {
    set({ error: null });
    try {
      const response = await notesApi.duplicate(id);
      const duplicatedNote = response.data;
      set((state) => ({
        notes: [duplicatedNote, ...state.notes],
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to duplicate note',
      });
    }
  },

  setCurrentNote: (note) => set({ currentNote: note }),

  setFilters: (filters) => set({ filters }),

  clearError: () => set({ error: null }),
}));

export default useNotesStore;
