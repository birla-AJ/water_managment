import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Admin } from '../../types';

interface AuthState {
  user: Admin | null;
  accessToken: string | null;
  refreshToken: string | null;
}

const persisted = (() => {
  try {
    return JSON.parse(localStorage.getItem('wf_auth') ?? 'null');
  } catch {
    return null;
  }
})();

const initialState: AuthState = persisted ?? { user: null, accessToken: null, refreshToken: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthState>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem('wf_auth', JSON.stringify(state));
    },
    setUser: (state, action: PayloadAction<Admin>) => {
      state.user = action.payload;
      localStorage.setItem('wf_auth', JSON.stringify(state));
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem('wf_auth');
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
