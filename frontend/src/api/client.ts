import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { User } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'taskmanager_token';

interface AuthResponse {
  token: string;
  user: User;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string = '';

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem(TOKEN_KEY) || '';

    this.setupInterceptors();
  }

  // Authenticate with Telegram initData and get JWT
  async authenticate(initData: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/telegram', {
      init_data: initData,
    });

    this.token = response.data.token;
    localStorage.setItem(TOKEN_KEY, this.token);
    console.log('Auth successful, token saved');

    return response.data;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Get current token
  getToken(): string {
    return this.token;
  }

  // Clear token on logout
  logout(): void {
    this.token = '';
    localStorage.removeItem(TOKEN_KEY);
  }

  // Get current user
  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  private setupInterceptors() {
    // Request interceptor - ALWAYS add token from current state
    this.client.interceptors.request.use(
      (config) => {
        // Reload token from localStorage in case it was updated
        const currentToken = this.token || localStorage.getItem(TOKEN_KEY) || '';
        if (currentToken) {
          config.headers['Authorization'] = `Bearer ${currentToken}`;
        }
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}, hasToken: ${!!currentToken}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.warn('401 Unauthorized - token may be invalid or expired');
        }

        if (error.response?.status === 429) {
          console.error('Rate limited');
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private formatError(error: AxiosError): Error {
    if (error.response?.data) {
      const data = error.response.data as { message?: string; error?: string };
      return new Error(data.message || data.error || 'An error occurred');
    }
    if (error.request) {
      return new Error('Network error. Please check your connection.');
    }
    return new Error(error.message || 'An unexpected error occurred');
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
