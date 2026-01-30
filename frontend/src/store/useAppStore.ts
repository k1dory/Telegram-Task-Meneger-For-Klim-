import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserSettings } from '@/types';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface AppState {
  // User state
  user: User | null;
  telegramUser: TelegramUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // UI state
  isSidebarOpen: boolean;
  activeModal: string | null;
  modalData: unknown;
  theme: 'dark' | 'light' | 'auto';

  // Actions
  setUser: (user: User | null) => void;
  setTelegramUser: (user: TelegramUser | null) => void;
  setIsLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;
  setTheme: (theme: 'dark' | 'light' | 'auto') => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      telegramUser: null,
      isAuthenticated: false,
      isLoading: true,
      isSidebarOpen: false,
      activeModal: null,
      modalData: null,
      theme: 'dark',

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setTelegramUser: (telegramUser) => set({ telegramUser }),

      setIsLoading: (isLoading) => set({ isLoading }),

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

      openModal: (activeModal, modalData = null) => set({ activeModal, modalData }),

      closeModal: () => set({ activeModal: null, modalData: null }),

      setTheme: (theme) => set({ theme }),

      updateUserSettings: (settings) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                settings: { ...state.user.settings, ...settings },
              }
            : null,
        })),

      logout: () =>
        set({
          user: null,
          telegramUser: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);

export default useAppStore;
