import type { User } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Store token in memory (localStorage doesn't work in Telegram WebView on iOS)
let authToken: string | null = null;

interface AuthResponse {
  token: string;
  user: User;
}

// Get token
function getToken(): string | null {
  return authToken;
}

// Set token
function setToken(token: string): void {
  authToken = token;
  // Also try localStorage as backup
  try {
    localStorage.setItem('taskmanager_token', token);
  } catch {
    // ignore
  }
}

// Clear token
function clearToken(): void {
  authToken = null;
  try {
    localStorage.removeItem('taskmanager_token');
  } catch {
    // ignore
  }
}

// Try to restore token from localStorage on init
try {
  const stored = localStorage.getItem('taskmanager_token');
  if (stored) {
    authToken = stored;
  }
} catch {
  // ignore
}

// Make fetch request with auth
async function request<T>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (data && method !== 'GET' && method !== 'DELETE') {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE_URL}${url}`, config);

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }

  // Handle empty response
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

// API functions
export const apiClient = {
  async authenticate(initData: string): Promise<AuthResponse> {
    const response = await fetch(`${BASE_URL}/auth/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ init_data: initData }),
    });

    if (!response.ok) {
      let errorMessage = 'Authentication failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    }

    const data: AuthResponse = await response.json();

    // Save token to memory
    setToken(data.token);

    return data;
  },

  isAuthenticated(): boolean {
    return !!getToken();
  },

  getToken,

  logout(): void {
    clearToken();
  },

  async getCurrentUser(): Promise<User> {
    return request<User>('GET', '/auth/me');
  },

  async get<T>(url: string): Promise<T> {
    return request<T>('GET', url);
  },

  async post<T>(url: string, data?: unknown): Promise<T> {
    return request<T>('POST', url, data);
  },

  async put<T>(url: string, data?: unknown): Promise<T> {
    return request<T>('PUT', url, data);
  },

  async patch<T>(url: string, data?: unknown): Promise<T> {
    return request<T>('PATCH', url, data);
  },

  async delete<T>(url: string, config?: { data?: unknown }): Promise<T> {
    if (config?.data) {
      // DELETE with body
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}${url}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify(config.data),
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      const text = await response.text();
      return text ? JSON.parse(text) : ({} as T);
    }
    return request<T>('DELETE', url);
  },
};

export default apiClient;
