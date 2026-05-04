import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Auth wrapper: adds JWT token to all API requests.
 * Token is stored in localStorage on login and included automatically.
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('saturn-token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('saturn-token', token);
  } else {
    localStorage.removeItem('saturn-token');
  }
}

/**
 * Parse an API error response into a consistent error message string.
 * Handles both old format ({ error, message }) and new standard format
 * ({ success: false, error, code, status }).
 */
export function parseApiError(response: any): string {
  if (!response) return 'Unknown error';
  // New standard format: { success: false, error, code, status }
  if (response.success === false && response.error) return response.error;
  // Old format: { error: '...', message: '...' }
  if (response.error) return typeof response.error === 'string' ? response.error : 'Unknown error';
  if (response.message) return response.message;
  if (typeof response === 'string') return response;
  return 'Unknown error';
}

/**
 * Authenticated fetch: wraps the global fetch() and adds the JWT Bearer token.
 * Use this for ALL API calls that need authentication.
 * On non-OK responses, throws the parsed error message.
 */
export async function api(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(input, {
    ...init,
    headers,
  });
}

/**
 * Like api() but automatically throws on non-2xx responses with the parsed error.
 */
export async function apiOrThrow(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await api(input, init);
  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(parseApiError(data));
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      throw e;
    }
  }
  return res;
}
