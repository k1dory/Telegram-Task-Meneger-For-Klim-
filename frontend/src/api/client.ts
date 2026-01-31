import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { User } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'taskmanager_token';

interface AuthResponse {
  token: string;
  user: User;
}

// Token stored in memory for immediate access
let currentToken: string | null = localStorage.getItem(TOKEN_KEY);

// Create axios instance
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - ALWAYS add token from memory
client.interceptors.request.use(
  (config) => {
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Don't clear token on 401 - might be a timing issue
      console.warn('401 Unauthorized');
    }

    if (error.response?.data) {
      const data = error.response.data as { message?: string; error?: string };
      return Promise.reject(new Error(data.message || data.error || 'An error occurred'));
    }
    if (error.request) {
      return Promise.reject(new Error('Network error'));
    }
    return Promise.reject(new Error(error.message || 'Unknown error'));
  }
);

// API functions
export const apiClient = {
  async authenticate(initData: string): Promise<AuthResponse> {
    const response = await client.post<AuthResponse>('/auth/telegram', {
      init_data: initData,
    });

    const token = response.data.token;

    // Save token to memory AND localStorage
    currentToken = token;
    localStorage.setItem(TOKEN_KEY, token);

    return response.data;
  },

  isAuthenticated(): boolean {
    return !!currentToken;
  },

  getToken(): string | null {
    return currentToken;
  },

  logout(): void {
    currentToken = null;
    localStorage.removeItem(TOKEN_KEY);
  },

  async getCurrentUser(): Promise<User> {
    const response = await client.get<User>('/auth/me');
    return response.data;
  },

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.get<T>(url, config);
    return response.data;
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.post<T>(url, data, config);
    return response.data;
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.put<T>(url, data, config);
    return response.data;
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.patch<T>(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.delete<T>(url, config);
    return response.data;
  },
};

export default apiClient;
