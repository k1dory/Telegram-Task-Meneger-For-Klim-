import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { User } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'taskmanager_token';

interface AuthResponse {
  token: string;
  user: User;
}

// Token storage - both in memory and localStorage
let memoryToken: string | null = null;

// Get token from memory or localStorage
function getToken(): string | null {
  if (memoryToken) return memoryToken;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    memoryToken = stored;
    return stored;
  }
  return null;
}

// Set token in both memory and localStorage
function setToken(token: string): void {
  memoryToken = token;
  localStorage.setItem(TOKEN_KEY, token);
}

// Clear token
function clearToken(): void {
  memoryToken = null;
  localStorage.removeItem(TOKEN_KEY);
}

// Create axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get headers with auth
function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Response error handler
function handleError(error: AxiosError): never {
  if (error.response?.status === 401) {
    console.warn('401 Unauthorized');
  }

  if (error.response?.data) {
    const data = error.response.data as { message?: string; error?: string };
    throw new Error(data.message || data.error || 'An error occurred');
  }
  if (error.request) {
    throw new Error('Network error');
  }
  throw new Error(error.message || 'Unknown error');
}

// API functions with explicit headers
export const apiClient = {
  async authenticate(initData: string): Promise<AuthResponse> {
    try {
      const response = await axiosInstance.post<AuthResponse>('/auth/telegram', {
        init_data: initData,
      });

      // Save token
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
    try {
      const response = await axiosInstance.get<User>('/auth/me', {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axiosInstance.get<T>(url, {
        ...config,
        headers: { ...getAuthHeaders(), ...config?.headers },
      });
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axiosInstance.post<T>(url, data, {
        ...config,
        headers: { ...getAuthHeaders(), ...config?.headers },
      });
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axiosInstance.put<T>(url, data, {
        ...config,
        headers: { ...getAuthHeaders(), ...config?.headers },
      });
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axiosInstance.patch<T>(url, data, {
        ...config,
        headers: { ...getAuthHeaders(), ...config?.headers },
      });
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axiosInstance.delete<T>(url, {
        ...config,
        headers: { ...getAuthHeaders(), ...config?.headers },
      });
      return response.data;
    } catch (error) {
      throw handleError(error as AxiosError);
    }
  },
};

export default apiClient;
