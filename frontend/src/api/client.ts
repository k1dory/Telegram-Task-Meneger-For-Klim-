import axios, { AxiosError } from 'axios';
import type { User } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'taskmanager_token';

interface AuthResponse {
  token: string;
  user: User;
}

// Create axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize token from localStorage on module load
const storedToken = localStorage.getItem(TOKEN_KEY);
if (storedToken) {
  axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

// Request interceptor - adds token from localStorage to EVERY request (backup)
axiosInstance.interceptors.request.use(
  (config) => {
    // Double-check: if no auth header, try localStorage
    if (!config.headers.Authorization) {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response error handler
function handleError(error: AxiosError): never {
  if (error.response?.data) {
    const data = error.response.data as { message?: string; error?: string };
    throw new Error(data.message || data.error || 'An error occurred');
  }
  if (error.request) {
    throw new Error('Network error');
  }
  throw new Error(error.message || 'Unknown error');
}

// API functions
export const apiClient = {
  async authenticate(initData: string): Promise<AuthResponse> {
    try {
      const response = await axiosInstance.post<AuthResponse>('/auth/telegram', {
        init_data: initData,
      });

      const token = response.data.token;

      // Save token to localStorage
      localStorage.setItem(TOKEN_KEY, token);

      // ALSO set directly on axios instance defaults
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await axiosInstance.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  async get<T>(url: string): Promise<T> {
    try {
      const response = await axiosInstance.get<T>(url);
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  async post<T>(url: string, data?: unknown): Promise<T> {
    try {
      const response = await axiosInstance.post<T>(url, data);
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  async put<T>(url: string, data?: unknown): Promise<T> {
    try {
      const response = await axiosInstance.put<T>(url, data);
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  async patch<T>(url: string, data?: unknown): Promise<T> {
    try {
      const response = await axiosInstance.patch<T>(url, data);
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  async delete<T>(url: string, config?: { data?: unknown }): Promise<T> {
    try {
      const response = await axiosInstance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },
};

export default apiClient;
