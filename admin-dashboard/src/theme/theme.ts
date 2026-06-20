import { createTheme, Theme } from '@mui/material/styles';

// Project is light-theme only. Kept as a literal type for any legacy imports.
export type ColorMode = 'light';

// ── WATERFLOW warm brand palette ─────────────────────────────────────────────
// Deep teal primary, warm gold accent, fresh green glow, cream grounds.
export const ACCENT_TEAL = '#055152'; // --Primary-clr
export const ACCENT_TEAL_DEEP = '#033C3D'; // hover / pressed
export const ACCENT_GOLD = '#DABD71'; // warm gold accent
export const ACCENT_GREEN = '#179A33'; // fresh green glow / positive

// Brand gradients.
export const BRAND_GRADIENT = 'linear-gradient(135deg, #0A6E6F 0%, #055152 100%)'; // primary teal
export const BRAND_GRADIENT_GOLD = 'linear-gradient(135deg, #E7D199 0%, #DABD71 100%)'; // gold accent
export const BRAND_GRADIENT_GREEN = 'linear-gradient(135deg, #2BB14A 0%, #179A33 100%)'; // green

export const BRAND_GRADIENT_SOFT =
  'linear-gradient(135deg, rgba(5,81,82,0.10) 0%, rgba(218,189,113,0.20) 100%)';

// Back-compat: callers used to pass a mode; we always return the light soft gradient now.
export const gradientSoft = (_mode?: ColorMode) => BRAND_GRADIENT_SOFT;

// Warm page background (the cream "page section" gradient + soft glow blobs).
export const PAGE_BG =
  'radial-gradient(900px 500px at 100% -5%, rgba(242,226,197,0.55), transparent 60%), ' +
  'radial-gradient(820px 460px at -5% 110%, rgba(250,237,221,0.65), transparent 55%), ' +
  'linear-gradient(180deg, #F4F4F4 0%, #F3EADC 47.12%, #FCF3E7 86.54%)';

// Shared chart / accent rotation — warm, harmonious.
export const CHART_COLORS = ['#055152', '#DABD71', '#179A33', '#0E8C84', '#C68A3E', '#7C9A91'];

export function getTheme(_mode?: ColorMode): Theme {
  const bgDefault = '#FCF3E7';
  const bgPaper = '#FFFDF9';
  const cardBg = 'linear-gradient(160deg, #FFFDF9 0%, #FAF3E8 100%)';
  const borderCol = 'rgba(5,81,82,0.14)';
  const cardShadow = '0 1px 2px rgba(5,81,82,0.05), 0 12px 30px -16px rgba(5,81,82,0.18)';
  const glow = 'rgba(5,81,82,0.38)';

  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#055152', light: '#0E8C84', dark: '#033C3D' },
      secondary: { main: '#C29B45', light: '#E7D199', dark: '#B8954A' },
      background: { default: bgDefault, paper: bgPaper },
      success: { main: '#2E7D32' },
      warning: { main: '#CA8A04' },
      error: { main: '#D32F2F' },
      info: { main: '#2563EB' },
      text: { primary: '#1D1D1D', secondary: '#5B5B5C' },
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
            backgroundImage: PAGE_BG,
            backgroundAttachment: 'fixed',
          },
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': {
            background: 'rgba(5,81,82,0.28)',
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
          root: {
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 12,
            paddingInline: 18,
            transition: 'transform .18s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease, filter .18s ease',
            '&:hover': { transform: 'translateY(-2px)' },
            '&:active': { transform: 'translateY(0)' },
          },
          containedPrimary: {
            backgroundImage: BRAND_GRADIENT,
            color: '#FFFFFF',
            boxShadow: `0 10px 22px -8px ${glow}`,
            '&:hover': { backgroundImage: BRAND_GRADIENT, filter: 'brightness(1.1)', boxShadow: `0 16px 32px -8px ${glow}` },
          },
          containedSecondary: {
            backgroundImage: BRAND_GRADIENT_GOLD,
            color: '#3A2E0E',
            '&:hover': { backgroundImage: BRAND_GRADIENT_GOLD, filter: 'brightness(1.06)', boxShadow: '0 16px 32px -8px rgba(218,189,113,0.55)' },
          },
          outlined: {
            borderColor: borderCol,
            '&:hover': {
              borderColor: ACCENT_TEAL,
              backgroundColor: 'rgba(5,81,82,0.06)',
              boxShadow: `0 8px 20px -10px ${glow}`,
            },
          },
          text: {
            '&:hover': { backgroundColor: 'rgba(5,81,82,0.08)' },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'background-color .18s ease, color .18s ease, transform .18s ease',
            '&:hover': {
              backgroundColor: 'rgba(5,81,82,0.10)',
              color: ACCENT_TEAL,
              transform: 'translateY(-1px)',
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color .15s ease',
            '&:hover:not(.MuiTableRow-head)': { backgroundColor: 'rgba(5,81,82,0.05)' },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            transition: 'background-color .15s ease, color .15s ease',
            '&:hover': { backgroundColor: 'rgba(5,81,82,0.08)', color: ACCENT_TEAL },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: 'box-shadow .18s ease',
            '& fieldset': { borderColor: borderCol, transition: 'border-color .18s ease' },
            '&:hover fieldset': { borderColor: 'rgba(5,81,82,0.40)' },
            '&.Mui-focused': { boxShadow: '0 0 0 4px rgba(5,81,82,0.12)' },
            '&.Mui-focused fieldset': { borderColor: ACCENT_TEAL, borderWidth: 2 },
          },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiTableCell: {
        styleOverrides: { head: { fontWeight: 700, color: '#5B5B5C' } },
      },
      MuiAppBar: { styleOverrides: { root: { backgroundImage: 'none' } } },
    },
  });
}

// Single light theme for the whole dashboard.
export const theme = getTheme();
