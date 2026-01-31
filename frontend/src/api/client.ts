import type { User } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Token storage with multiple fallbacks
class TokenManager {
  private memoryToken: string | null = null;
  private readonly STORAGE_KEY = 'taskmanager_token';

  constructor() {
    // Try to restore token from localStorage on init
    this.restoreFromStorage();
  }

  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && stored.length > 0) {
        this.memoryToken = stored;
      }
    } catch {
      // Storage not available
    }

    // Also try sessionStorage as fallback
    if (!this.memoryToken) {
      try {
        const sessionStored = sessionStorage.getItem(this.STORAGE_KEY);
        if (sessionStored && sessionStored.length > 0) {
          this.memoryToken = sessionStored;
        }
      } catch {
        // Storage not available
      }
    }
  }

  get(): string | null {
    return this.memoryToken;
  }

  set(token: string): void {
    if (!token || token.length === 0) {
      return;
    }

    this.memoryToken = token;

    // Save to localStorage
    try {
      localStorage.setItem(this.STORAGE_KEY, token);
    } catch {
      // Storage not available
    }

    // Also save to sessionStorage as backup
    try {
      sessionStorage.setItem(this.STORAGE_KEY, token);
    } catch {
      // Storage not available
    }
  }

  clear(): void {
    this.memoryToken = null;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Storage not available
    }
  }

  isValid(): boolean {
    return this.memoryToken !== null && this.memoryToken.length > 0;
  }
}

const tokenManager = new TokenManager();

interface AuthResponse {
  token: string;
  user: User;
}

// Deprecated - use tokenManager directly
function getToken(): string | null {
  return tokenManager.get();
}

function setToken(token: string): void {
  tokenManager.set(token);
}

function clearToken(): void {
  tokenManager.clear();
}

// Make fetch request with auth
async function request<T>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const token = tokenManager.get();

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
    if (!initData || initData.length === 0) {
      throw new Error('No initData provided for authentication');
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ init_data: initData }),
      });
    } catch (fetchError) {
      throw new Error('Network error: ' + (fetchError instanceof Error ? fetchError.message : 'fetch failed'));
    }

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

    const responseText = await response.text();

    let data: AuthResponse;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error('Invalid server response');
    }

    if (!data.token) {
      throw new Error('Server did not return authentication token');
    }

    // Save token to memory and storage
    tokenManager.set(data.token);

    // Verify token was saved
    if (!tokenManager.isValid()) {
      throw new Error('Failed to save authentication token');
    }

    return data;
  },

  isAuthenticated(): boolean {
    return tokenManager.isValid();
  },

  getToken() {
    return tokenManager.get();
  },

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
