import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { config } from '../config';
import { store } from '../store';
import { setTokens, logout } from '../store/slices/authSlice';

export const api = axios.create({ baseURL: config.apiUrl, timeout: 15000 });

api.interceptors.request.use(async (cfg) => {
  const token = store.getState().auth.accessToken;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  // Tell the backend which language to localize server messages in.
  cfg.headers['Accept-Language'] = i18n.language || 'en';
  if (__DEV__) {
    const method = (cfg.method ?? 'get').toUpperCase();
    const url = `${cfg.baseURL ?? config.apiUrl}${cfg.url ?? ''}`;
    console.log('[WaterFlow API] request', {
      method,
      url,
      hasToken: Boolean(token),
      params: cfg.params,
    });
  }
  return cfg;
});

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = store.getState().auth.refreshToken;
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${config.apiUrl}/auth/refresh`, { refreshToken });
    const tokens = { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken };
    store.dispatch(setTokens(tokens));
    await AsyncStorage.setItem('wf_tokens', JSON.stringify(tokens));
    return tokens.accessToken;
  } catch {
    store.dispatch(logout());
    await AsyncStorage.removeItem('wf_tokens');
    return null;
  }
}

api.interceptors.response.use(
  (r) => {
    if (__DEV__) {
      console.log('[WaterFlow API] response', {
        status: r.status,
        url: `${r.config.baseURL ?? config.apiUrl}${r.config.url ?? ''}`,
      });
    }
    return r;
  },
  async (error) => {
    const original = error.config;
    if (__DEV__) {
      console.log('[WaterFlow API] error', {
        status: error.response?.status,
        url: original ? `${original.baseURL ?? config.apiUrl}${original.url ?? ''}` : undefined,
        message: error.response?.data?.message ?? error.message,
        code: error.code,
      });
    }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? doRefresh();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export const errorMessage = (err: any): string =>
  err?.response?.data?.message ?? err?.message ?? 'Something went wrong';
