import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '@/store/auth';
import type { ApiError } from '@/types';

export const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/v1';

export const api = axios.create({ baseURL: API_BASE, timeout: 60_000 });

const CLIENT_KEY = import.meta.env.VITE_CLIENT_KEY as string | undefined;
api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Requested-With'] = 'LeadCRM';
  if (CLIENT_KEY) config.headers['X-Client-Key'] = CLIENT_KEY;
  return config;
});

/** Builds a same-origin (or VITE_API_URL) URL for signed view streams used by <iframe>/<video>/<img>. */
export const apiUrl = (path: string) => `${import.meta.env.VITE_API_URL || ''}${path.startsWith('/api') ? path : `/api/v1${path}`}`;

let refreshing: Promise<string | null> | null = null;

/** On 401, refresh once (de-duplicated across concurrent requests), then retry the original call. */
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<{ error?: ApiError }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthRoute = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      refreshing ??= useAuth.getState().refresh().finally(() => { refreshing = null; });
      const token = await refreshing;
      if (token) { original.headers.Authorization = `Bearer ${token}`; return api(original); }
      useAuth.getState().logout(true);
    }
    return Promise.reject(error);
  },
);

/** Extracts a human-readable message from an API error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: ApiError } | undefined;
    const details = body?.error?.details;
    if (Array.isArray(details) && details.length && typeof details[0] === 'object' && 'message' in details[0]) return `${body!.error!.message}: ${(details as { message: string }[]).map((d) => d.message).join('; ')}`;
    if (details && typeof details === 'object' && 'issues' in (details as object)) return ((details as { issues: string[] }).issues).join(' ');
    return body?.error?.message || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export function errorDetails(err: unknown): unknown {
  return axios.isAxiosError(err) ? (err.response?.data as { error?: ApiError } | undefined)?.error?.details : undefined;
}

/** Downloads a protected CSV endpoint with the bearer token. */
export async function downloadFile(path: string, fileName: string) {
  const res = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const qs = (params: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)) p.set(k, Array.isArray(v) ? v.join(',') : String(v)); });
  const s = p.toString(); return s ? `?${s}` : '';
};
