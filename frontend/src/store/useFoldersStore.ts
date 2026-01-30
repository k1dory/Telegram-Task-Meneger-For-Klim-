import { create } from 'zustand';
import type { Folder, BoardType } from '@/types';
import { foldersApi, type CreateFolderDto, type UpdateFolderDto } from '@/api';

interface FoldersState {
  folders: Folder[];
  currentFolder: Folder | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFolders: () => Promise<void>;
  fetchFolderById: (id: string) => Promise<void>;
  createFolder: (data: CreateFolderDto) => Promise<Folder>;
  updateFolder: (id: string, data: UpdateFolderDto) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  setCurrentFolder: (folder: Folder | null) => void;
  reorderFolders: (folderIds: string[]) => Promise<void>;
  clearError: () => void;
}

export const useFoldersStore = create<FoldersState>((set, get) => ({
  folders: [],
  currentFolder: null,
  isLoading: false,
  error: null,

  fetchFolders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await foldersApi.getAll();
      set({ folders: response.data.items, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch folders',
        isLoading: false,
      });
    }
  },

  fetchFolderById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await foldersApi.getById(id);
      set({ currentFolder: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch folder',
        isLoading: false,
      });
    }
  },

  createFolder: async (data: CreateFolderDto) => {
    set({ isLoading: true, error: null });
    try {
      const response = await foldersApi.create(data);
      const newFolder = response.data;
      set((state) => ({
        folders: [...state.folders, newFolder],
        isLoading: false,
      }));
      return newFolder;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create folder',
        isLoading: false,
      });
      throw error;
    }
  },

  updateFolder: async (id: string, data: UpdateFolderDto) => {
    set({ error: null });
    try {
      const response = await foldersApi.update(id, data);
      const updatedFolder = response.data;
      set((state) => ({
        folders: state.folders.map((f) => (f.id === id ? updatedFolder : f)),
        currentFolder:
          state.currentFolder?.id === id ? updatedFolder : state.currentFolder,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update folder',
      });
      throw error;
    }
  },

  deleteFolder: async (id: string) => {
    set({ error: null });
    try {
      await foldersApi.delete(id);
      set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
        currentFolder: state.currentFolder?.id === id ? null : state.currentFolder,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete folder',
      });
      throw error;
    }
  },

  setCurrentFolder: (folder) => set({ currentFolder: folder }),

  reorderFolders: async (folderIds: string[]) => {
    const { folders } = get();
    const reorderedFolders = folderIds
      .map((id) => folders.find((f) => f.id === id))
      .filter((f): f is Folder => f !== undefined);

    set({ folders: reorderedFolders });

    try {
      await foldersApi.reorder(folderIds);
    } catch (error) {
      set({ folders }); // Revert on error
      set({
        error: error instanceof Error ? error.message : 'Failed to reorder folders',
      });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useFoldersStore;
