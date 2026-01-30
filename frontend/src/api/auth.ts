import apiClient from './client';
import type { UserSettings } from '@/types';

export const authApi = {
  updateSettings: async (settings: UserSettings) => {
    return apiClient.put<void>('/auth/settings', settings);
  },
};

export default authApi;
