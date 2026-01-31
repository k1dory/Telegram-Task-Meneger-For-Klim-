import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { User } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'taskmanager_token';

interface AuthResponse {
  token: string;
  user: User;
}

// Create axios instance
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize token from localStorage on module load
const storedToken = localStorage.getItem(TOKEN_KEY);
if (storedToken) {
  client.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

// Response interceptor for error handling
client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - clearing token');
      localStorage.removeItem(TOKEN_KEY);
      delete client.defaults.headers.common['Authorization'];
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

    // Save token to localStorage and set in axios defaults
    localStorage.setItem(TOKEN_KEY, token);
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    return response.data;
  },

  isAuthenticated(): boolean {
    return !!client.defaults.headers.common['Authorization'];
  },

  getToken(): string | undefined {
    const auth = client.defaults.headers.common['Authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.substring(7);
    }
    return undefined;
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    delete client.defaults.headers.common['Authorization'];
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
