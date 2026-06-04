// WaterFlow mobile palette — "Deep Ocean" theme built from the SlideOcean
// teal palette (039AA1 · 056472 · 13404E · 04202B · 5C7687 · ADC3C9 · E4EDEC).
// Both light and dark expose the same keys so screens can swap freely.

export const darkColors = {
  primary: '#039AA1', // ocean teal (palette #1)
  primaryDark: '#056472', // deep teal (palette #2)
  primaryGlow: 'rgba(3,154,161,0.45)',
  accent: '#3FC1C9', // brightened teal for highlights/badges
  green: '#34D399',
  lime: '#D9E25A',
  gradientStart: '#039AA1',
  gradientEnd: '#0FB8C0',

  bg: '#04202B', // deepest navy (palette #4)
  bgElevated: '#0A2E3A', // headers / tab bar
  card: '#13404E', // cards (palette #3)
  cardBorder: 'rgba(3,154,161,0.22)',

  text: '#E4EDEC', // off-white (palette #7)
  textMuted: '#8AA6B2', // lightened slate for legibility on dark surfaces
  border: 'rgba(92,118,135,0.22)', // slate (palette #5)

  success: '#34D399',
  warning: '#E8C15A',
  error: '#F87171',
  white: '#FFFFFF',
  isDark: true,
};

// Light theme — "Ember Cream": warm red/cream palette
// (F56C4C · F02D1B · CE2F22 · 3A1916 · D9C8AF · EAD8BB · F2E7C9).
export const lightColors: typeof darkColors = {
  primary: '#CE2F22', // deep red (palette #3)
  primaryDark: '#A8241A', // darker red for pressed/emphasis
  primaryGlow: 'rgba(206,47,34,0.28)',
  accent: '#F56C4C', // coral (palette #1)
  green: '#2E9E5B',
  lime: '#C2870A',
  gradientStart: '#F02D1B', // bright red (palette #2)
  gradientEnd: '#F56C4C', // coral (palette #1)

  bg: '#F2E7C9', // pale cream (palette #7)
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: 'rgba(58,25,22,0.12)', // warm brown tint (palette #4)

  text: '#3A1916', // dark brown (palette #4)
  textMuted: '#8A6E5A', // muted warm brown for secondary text
  border: 'rgba(58,25,22,0.14)',

  success: '#2E9E5B',
  warning: '#C2870A',
  error: '#D32F2F',
  white: '#FFFFFF',
  isDark: false,
};

export type AppColors = typeof darkColors;

// Default export used by screens not yet wired to the theme hook.
// Defaults to the dark "hero" theme so the whole app adopts the new look.
export const colors = darkColors;
