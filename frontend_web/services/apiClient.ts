// ---------------------------------------------------------------------------
// Thin fetch wrapper for the investigating-officer API.
//
// Every service in this folder goes through here, so the base URL, auth token
// and error handling are defined once.
// ---------------------------------------------------------------------------

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

const INVESTIGATION_ROOT = `${API_BASE}/api/investigation`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type QueryValue = string | number | boolean | undefined | null;

const buildQuery = (params?: Record<string, QueryValue>): string => {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    // Empty strings and 'All'/'all' mean "no filter" — drop them so the
    // server doesn't try to match on a sentinel value.
    if (value === undefined || value === null || value === '') return;
    if (value === 'All' || value === 'all') return;
    search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (() => {
    try {
      return localStorage.getItem('kaaval_web_token');
    } catch {
      return null;
    }
  })();

  const response = await fetch(`${INVESTIGATION_ROOT}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      /* response had no JSON body */
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiGet = <T>(path: string, params?: Record<string, QueryValue>): Promise<T> =>
  request<T>(`${path}${buildQuery(params)}`);

export const apiPost = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });

export const apiPatch = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
