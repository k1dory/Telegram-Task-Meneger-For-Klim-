import type { User } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'taskmanager_token';

interface AuthResponse {
  token: string;
  user: User;
}

// Get token
function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Set token
function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage not available
  }
}

// Clear token
function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage not available
  }
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

    // Save token
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
