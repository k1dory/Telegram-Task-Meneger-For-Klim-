import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import type { User } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'taskmanager_token';

// Extend window type
declare global {
  interface Window {
    __APP_TOKEN__?: string;
  }
}

interface AuthResponse {
  token: string;
  user: User;
}

// Initialize token from localStorage to window
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    window.__APP_TOKEN__ = stored;
  }
}

// Get token from window
function getToken(): string | null {
  if (typeof window !== 'undefined' && window.__APP_TOKEN__) {
    return window.__APP_TOKEN__;
  }
  return null;
}

// Set token
function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    window.__APP_TOKEN__ = token;
    localStorage.setItem(TOKEN_KEY, token);
  }
}

// Clear token
function clearToken(): void {
  if (typeof window !== 'undefined') {
    delete window.__APP_TOKEN__;
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Create axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

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

// Make request with auth
async function request<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    let response;
    if (method === 'get' || method === 'delete') {
      response = await axiosInstance[method]<T>(url, { ...config, headers });
    } else {
      response = await axiosInstance[method]<T>(url, data, { ...config, headers });
    }
    return response.data;
  } catch (error) {
    throw handleError(error as AxiosError);
  }
}

// API functions
export const apiClient = {
  async authenticate(initData: string): Promise<AuthResponse> {
    try {
      const response = await axiosInstance.post<AuthResponse>('/auth/telegram', {
        init_data: initData,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      // Save token to window and localStorage
      setToken(response.data.token);

      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  isAuthenticated(): boolean {
    return !!getToken();
  },

  getToken,

  logout(): void {
    clearToken();
  },

  async getCurrentUser(): Promise<User> {
    return request<User>('get', '/auth/me');
  },

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request<T>('get', url, undefined, config);
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>('post', url, data, config);
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>('put', url, data, config);
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>('patch', url, data, config);
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request<T>('delete', url, undefined, config);
  },
};

export default apiClient;
