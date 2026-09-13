export const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://127.0.0.1:5001').replace(/\/$/, '');

type ApiFetchOptions = RequestInit & {
  timeoutMs?: number;
  auth?: boolean;
};

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export function getAuthToken() {
  const token = localStorage.getItem('teckstudio_auth_token');
  return token && !token.startsWith('offline_') ? token : null;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { timeoutMs = 30000, auth = true, headers, signal, ...init } = options;
  const controller = new AbortController();
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const token = auth ? getAuthToken() : null;

  const requestHeaders = new Headers(headers);
  if (token && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && typeof init.body === 'string' && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  try {
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    try {
      return await fetch(apiUrl(path), {
        ...init,
        headers: requestHeaders,
        credentials: init.credentials || 'include',
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (signal?.aborted && !timedOut) {
          throw new DOMException('Backend request aborted.', 'AbortError');
        }
        throw new Error(`Backend request timed out after ${timeoutMs}ms: ${apiUrl(path)}`, { cause: error });
      }
      throw error;
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function apiJson<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const response = await apiFetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error || payload?.detail || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }
  return payload as T;
}
