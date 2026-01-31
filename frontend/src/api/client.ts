import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { User } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'taskmanager_token';

interface AuthResponse {
  token: string;
  user: User;
}

// Store token globally, not in class instance
let authToken: string = localStorage.getItem(TOKEN_KEY) || '';

console.log('[API Client] Initial token from localStorage:', authToken ? `${authToken.substring(0, 20)}...` : 'EMPTY');

// Create axios instance
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token
client.interceptors.request.use(
  (config) => {
    // ALWAYS read from localStorage to avoid any module caching issues
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const token = storedToken || authToken || '';
    console.log('[API Client] Request:', config.method?.toUpperCase(), config.url);
    console.log('[API Client] Token check - localStorage:', storedToken ? `${storedToken.substring(0, 20)}...` : 'EMPTY', 'global:', authToken ? 'SET' : 'EMPTY');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('[API Client] Added Authorization header with token:', token.substring(0, 20) + '...');
    } else {
      console.warn('[API Client] NO TOKEN AVAILABLE!');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized');
    }

    // Format error
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
    console.log('[API Client] authenticate() called');
    const response = await client.post<AuthResponse>('/auth/telegram', {
      init_data: initData,
    });

    // Save token globally AND to localStorage
    const token = response.data.token;
    console.log('[API Client] Received token from server:', token ? `${token.substring(0, 30)}...` : 'EMPTY');

    authToken = token;
    localStorage.setItem(TOKEN_KEY, token);

    // Verify immediately
    const verifyGlobal = authToken;
    const verifyStorage = localStorage.getItem(TOKEN_KEY);
    console.log('[API Client] VERIFY after save:');
    console.log('[API Client]   - Global authToken:', verifyGlobal ? `${verifyGlobal.substring(0, 20)}...` : 'EMPTY');
    console.log('[API Client]   - localStorage:', verifyStorage ? `${verifyStorage.substring(0, 20)}...` : 'EMPTY');
    console.log('[API Client]   - Match:', verifyGlobal === verifyStorage);

    return response.data;
  },

  isAuthenticated(): boolean {
    return !!authToken;
  },

  getToken(): string {
    return authToken;
  },

  logout(): void {
    authToken = '';
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
