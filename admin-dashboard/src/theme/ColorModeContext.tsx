import { ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';

// The dashboard is light-theme only. This provider simply applies the single
// WaterFlow light theme; dark mode has been removed project-wide.
export function ColorModeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
