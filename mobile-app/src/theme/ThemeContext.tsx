import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, AppColors } from './colors';

interface ThemeCtx {
  colors: AppColors;
  isDark: boolean;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ colors: darkColors, isDark: true, toggle: () => {} });

export const useTheme = () => useContext(Ctx);

const STORAGE_KEY = 'wf_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light') setIsDark(false);
      else if (v === 'dark') setIsDark(true);
    });
  }, []);

  const toggle = () =>
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });

  const value = useMemo<ThemeCtx>(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, toggle }),
    [isDark],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
