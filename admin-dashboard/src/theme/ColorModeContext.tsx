import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme, ColorMode } from './theme';

interface ColorModeCtx {
  mode: ColorMode;
  toggle: () => void;
  setMode: (m: ColorMode) => void;
}

const Ctx = createContext<ColorModeCtx>({ mode: 'dark', toggle: () => {}, setMode: () => {} });

export const useColorMode = () => useContext(Ctx);

const STORAGE_KEY = 'wf_color_mode';

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  const setMode = (m: ColorMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  };

  const ctx = useMemo<ColorModeCtx>(
    () => ({ mode, setMode, toggle: () => setMode(mode === 'dark' ? 'light' : 'dark') }),
    [mode],
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <Ctx.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Ctx.Provider>
  );
}
