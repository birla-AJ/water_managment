import React, { createContext, useContext, useMemo } from 'react';
import { lightColors, AppColors } from './colors';

interface ThemeCtx {
  colors: AppColors;
  isDark: boolean;
  /** No-op: the app is light-theme only (dark mode removed). Kept for API compatibility. */
  toggle: () => void;
}

// The app is light-theme only. `isDark` is always false and `toggle` is a no-op;
// both are retained so existing consumers keep compiling.
const Ctx = createContext<ThemeCtx>({ colors: lightColors, isDark: false, toggle: () => {} });

export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<ThemeCtx>(
    () => ({ colors: lightColors, isDark: false, toggle: () => {} }),
    [],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
