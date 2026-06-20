// WaterFlow mobile palette — warm "WaterFlow" brand.
// Deep teal primary (#055152), warm gold accent (#DABD71), fresh green glow
// (#179A33), cream grounds. The app is LIGHT-THEME ONLY — dark mode removed.

export const lightColors = {
  primary: '#055152', // --Primary-clr (deep teal)
  primaryDark: '#033C3D', // pressed / emphasis
  primaryGlow: 'rgba(5,81,82,0.25)',
  accent: '#DABD71', // warm gold for highlights/badges
  green: '#179A33', // fresh green
  lime: '#C68A3E', // warm amber secondary accent
  gradientStart: '#0A6E6F', // button gradient start (teal)
  gradientEnd: '#0E8C84', // button gradient end (lighter teal)

  // Transparent canvas → the cream gradient backdrop (bgTop → bgBottom) shows
  // through every screen.
  bg: 'transparent',
  bgTop: '#F3EADC', // backdrop gradient top (warm cream)
  bgBottom: '#FFFDF9', // backdrop gradient bottom (warm white)
  surface: '#FAF3E8', // opaque fill for inputs / sheets (light cream)
  bgElevated: '#FFFDF9', // headers / tab bar (warm white)
  card: '#FFFDF9', // cards (warm white)
  cardBorder: 'rgba(5,81,82,0.12)', // faint teal hairline

  text: '#1D1D1D', // ink
  textMuted: '#5B5B5C', // muted grey for secondary text
  border: 'rgba(5,81,82,0.14)',

  success: '#2E7D32',
  warning: '#CA8A04',
  error: '#D32F2F',
  white: '#FFFFFF',
  isDark: false,
};

export type AppColors = typeof lightColors;

// Dark mode has been removed project-wide. `darkColors` is kept as an alias of
// the single light palette so any legacy import resolves to the light theme.
export const darkColors: AppColors = lightColors;

// Default export used by screens not yet wired to the theme hook.
export const colors = lightColors;
