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
 * Authenticated fetch: wraps the global fetch() and adds the JWT Bearer token.
 * Use this for ALL API calls that need authentication.
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
