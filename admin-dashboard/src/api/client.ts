import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '../app/store';
import { setCredentials, logout } from '../features/auth/authSlice';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({ baseURL: API_URL });

// Attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh-on-401 with a single-flight guard
let refreshing: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  const refresh = store.getState().auth.refreshToken;
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh });
    const { accessToken, refreshToken: newRefresh } = data.data;
    const user = store.getState().auth.user;
    store.dispatch(setCredentials({ accessToken, refreshToken: newRefresh, user }));
    return accessToken;
  } catch {
    store.dispatch(logout());
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? refreshToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err: unknown): string {
  const e = err as AxiosError<{ message?: string }>;
  return e.response?.data?.message ?? e.message ?? 'Something went wrong';
}
