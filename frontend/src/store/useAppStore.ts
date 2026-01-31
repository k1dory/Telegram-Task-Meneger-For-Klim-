import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserSettings } from '@/types';
import apiClient from '@/api/client';

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
  error: string | null;

  // UI state
  isSidebarOpen: boolean;
  activeModal: string | null;
  modalData: unknown;
  theme: 'dark' | 'light' | 'auto';
  lastActiveBoardId: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTelegramUser: (user: TelegramUser | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;
  setTheme: (theme: 'dark' | 'light' | 'auto') => void;
  setLastActiveBoardId: (boardId: string | null) => void;
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
      error: null,
      isSidebarOpen: false,
      activeModal: null,
      modalData: null,
      theme: 'dark',
      lastActiveBoardId: null,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setTelegramUser: (telegramUser) => set({ telegramUser }),

      setIsLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

      openModal: (activeModal, modalData = null) => set({ activeModal, modalData }),

      closeModal: () => set({ activeModal: null, modalData: null }),

      setTheme: (theme) => set({ theme }),

      setLastActiveBoardId: (lastActiveBoardId) => set({ lastActiveBoardId }),

      updateUserSettings: (settings) =>
        set((state) => {
          if (!state.user) return state;

          const updatedUser = { ...state.user };
          const updatedSettings = {
            notification_enabled: state.user.settings?.notification_enabled ?? state.user.notification_enabled,
            reminder_hours: state.user.settings?.reminder_hours ?? state.user.reminder_hours,
            language_code: state.user.settings?.language_code ?? state.user.language_code,
            timezone: state.user.settings?.timezone,
          };

          if (settings.notification_enabled !== undefined) {
            updatedUser.notification_enabled = settings.notification_enabled;
            updatedSettings.notification_enabled = settings.notification_enabled;
          }
          if (settings.reminder_hours !== undefined) {
            updatedUser.reminder_hours = settings.reminder_hours;
            updatedSettings.reminder_hours = settings.reminder_hours;
          }
          if (settings.language_code !== undefined) {
            updatedUser.language_code = settings.language_code;
            updatedSettings.language_code = settings.language_code;
          }
          if (settings.timezone !== undefined) {
            updatedSettings.timezone = settings.timezone;
          }

          updatedUser.settings = updatedSettings;

          return { user: updatedUser };
        }),

      logout: () => {
        // Clear JWT token from API client
        apiClient.logout();
        set({
          user: null,
          telegramUser: null,
          isAuthenticated: false,
          error: null,
        });
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
        lastActiveBoardId: state.lastActiveBoardId,
      }),
    }
  )
);

export default useAppStore;
