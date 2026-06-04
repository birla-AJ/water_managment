import { createTheme, Theme } from '@mui/material/styles';

export type ColorMode = 'light' | 'dark';

// ── NAUTICLEAN brand gradients (teal → cyan → emerald) ───────────────────────
export const BRAND_GRADIENT = 'linear-gradient(135deg, #2DD4BF 0%, #22D3EE 100%)';
export const BRAND_GRADIENT_GREEN = 'linear-gradient(135deg, #2DD4BF 0%, #34D399 100%)';
export const BRAND_GRADIENT_SOFT_DARK =
  'linear-gradient(135deg, rgba(45,212,191,0.18) 0%, rgba(34,211,238,0.10) 100%)';
export const BRAND_GRADIENT_SOFT_LIGHT =
  'linear-gradient(135deg, rgba(13,148,136,0.14) 0%, rgba(34,211,238,0.10) 100%)';

export const gradientSoft = (mode: ColorMode) =>
  mode === 'dark' ? BRAND_GRADIENT_SOFT_DARK : BRAND_GRADIENT_SOFT_LIGHT;

// Back-compat alias for existing imports.
export const BRAND_GRADIENT_SOFT = BRAND_GRADIENT_SOFT_DARK;

// Glow shadow used on primary buttons / active chips.
const glow = 'rgba(45,212,191,0.45)';

export function getTheme(mode: ColorMode): Theme {
  const isDark = mode === 'dark';

  const bgDefault = isDark ? '#07120F' : '#EEF4F2';
  const bgPaper = isDark ? '#0E1B18' : '#FFFFFF';
  const cardBg = isDark
    ? 'linear-gradient(160deg, #102420 0%, #0C1815 100%)'
    : 'linear-gradient(160deg, #FFFFFF 0%, #F7FBFA 100%)';
  const borderCol = isDark ? 'rgba(45,212,191,0.14)' : 'rgba(13,148,136,0.14)';
  const cardShadow = isDark
    ? '0 1px 2px rgba(0,0,0,0.4), 0 18px 40px -22px rgba(0,0,0,0.7)'
    : '0 1px 2px rgba(16,24,40,0.04), 0 12px 30px -16px rgba(16,24,40,0.18)';

  return createTheme({
    palette: {
      mode,
      primary: { main: isDark ? '#2DD4BF' : '#0D9488', light: '#5EEAD4', dark: '#0F766E' },
      secondary: { main: isDark ? '#22D3EE' : '#0891B2', light: '#67E8F9', dark: '#0E7490' },
      background: { default: bgDefault, paper: bgPaper },
      success: { main: isDark ? '#34D399' : '#059669' },
      warning: { main: isDark ? '#D9E25A' : '#CA8A04' },
      error: { main: isDark ? '#F87171' : '#DC2626' },
      info: { main: isDark ? '#38BDF8' : '#0EA5E9' },
      text: {
        primary: isDark ? '#E6F2EE' : '#0B1F1A',
        secondary: isDark ? '#7C9A91' : '#5A736C',
      },
      divider: borderCol,
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: 'Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
      h4: { fontWeight: 800, letterSpacing: -0.5 },
      h5: { fontWeight: 800, letterSpacing: -0.3 },
      h6: { fontWeight: 700 },
      overline: { fontWeight: 700, letterSpacing: 1.5 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: bgDefault,
            backgroundImage: isDark
              ? 'radial-gradient(1100px 600px at 100% -5%, rgba(34,211,238,0.06), transparent 60%), radial-gradient(900px 500px at -5% 110%, rgba(52,211,153,0.05), transparent 55%)'
              : 'none',
            backgroundAttachment: 'fixed',
          },
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(45,212,191,0.25)' : 'rgba(13,148,136,0.25)',
            borderRadius: 8,
          },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: `1px solid ${borderCol}`,
            backgroundImage: cardBg,
            boxShadow: cardShadow,
            transition: 'transform .22s ease, box-shadow .22s ease, border-color .22s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 700, borderRadius: 12, paddingInline: 18 },
          containedPrimary: {
            backgroundImage: BRAND_GRADIENT,
            color: isDark ? '#04201C' : '#FFFFFF',
            boxShadow: `0 10px 22px -8px ${glow}`,
            '&:hover': { backgroundImage: BRAND_GRADIENT, filter: 'brightness(1.07)', boxShadow: `0 12px 26px -6px ${glow}` },
          },
          outlined: { borderColor: borderCol },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            '& fieldset': { borderColor: borderCol },
          },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiTableCell: {
        styleOverrides: { head: { fontWeight: 700, color: isDark ? '#7C9A91' : '#5A736C' } },
      },
      MuiAppBar: { styleOverrides: { root: { backgroundImage: 'none' } } },
    },
  });
}

// Default export kept for any direct imports (dark by default — matches the brand).
export const theme = getTheme('dark');
