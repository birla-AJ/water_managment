import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN';

interface User {
  id: string;
  name: string;
  mobile: string;
  role?: UserRole;
  email?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  bootstrapped: boolean;
  // false → force the onboarding/details screen before the app proper.
  // Defaults to true so existing flows are unaffected until proven incomplete.
  profileComplete: boolean;
}

const initialState: AuthState = { user: null, accessToken: null, refreshToken: null, bootstrapped: false, profileComplete: true };

/** A profile counts as complete once it has a real (non-placeholder) name and a delivery address. */
export const isProfileComplete = (p?: { name?: string | null; address?: string | null } | null): boolean =>
  !!p && !!p.name?.trim() && !/^Customer \d{4}$/.test(p.name.trim()) && !!p.address?.trim();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setProfileComplete: (state, action: PayloadAction<boolean>) => {
      state.profileComplete = action.payload;
    },
    setBootstrapped: (state) => {
      state.bootstrapped = true;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.profileComplete = true;
    },
  },
});

export const { setCredentials, setTokens, setUser, setProfileComplete, setBootstrapped, logout } = authSlice.actions;
export default authSlice.reducer;
