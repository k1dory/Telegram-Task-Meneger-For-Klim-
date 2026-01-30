import { create } from 'zustand';
import type { Item } from '@/types';
import { itemsApi } from '@/api';

interface NotesState {
  notes: Item[];
  currentNote: Item | null;
  isLoading: boolean;
  error: string | null;
  currentBoardId: string | null;

  // Actions
  fetchNotes: (boardId: string) => Promise<void>;
  fetchNoteById: (id: string) => Promise<void>;
  createNote: (boardId: string, data: { title: string; content?: string; metadata?: Record<string, unknown> }) => Promise<Item>;
  updateNote: (id: string, data: Partial<Item>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  setCurrentNote: (note: Item | null) => void;
  clearError: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  currentNote: null,
  isLoading: false,
  error: null,
  currentBoardId: null,

  fetchNotes: async (boardId: string) => {
    set({ isLoading: true, error: null, currentBoardId: boardId });

    try {
      const notes = await itemsApi.getByBoard(boardId);
      // Sort: pinned first, then by updated_at
      const sortedNotes = [...notes].sort((a, b) => {
        const aPinned = a.metadata?.pinned ?? false;
        const bPinned = b.metadata?.pinned ?? false;
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      set({ notes: sortedNotes, isLoading: false });
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
      const note = await itemsApi.getById(id);
      set({ currentNote: note, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch note',
        isLoading: false,
      });
    }
  },

  createNote: async (boardId, data) => {
    set({ error: null });
    try {
      const newNote = await itemsApi.create(boardId, {
        ...data,
        status: 'pending', // Notes don't use status but API requires it
      });
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

  updateNote: async (id: string, data) => {
    set({ error: null });
    try {
      const updatedNote = await itemsApi.update(id, data);
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
      await itemsApi.delete(id);
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

    const newPinned = !note.metadata?.pinned;

    // Optimistic update
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, metadata: { ...n.metadata, pinned: newPinned } } : n
      ),
    }));

    try {
      await itemsApi.update(id, {
        metadata: { ...note.metadata, pinned: newPinned }
      });
    } catch (error) {
      // Revert on error
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? note : n)),
        error: error instanceof Error ? error.message : 'Failed to toggle pin',
      }));
    }
  },

  setCurrentNote: (note) => set({ currentNote: note }),

  clearError: () => set({ error: null }),
}));

export default useNotesStore;
