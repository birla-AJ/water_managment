// Small shared validators for admin forms. Keep messages identical to the
// backend (Zod) so client and server agree on what's valid.

/** A valid 10-digit Indian mobile (starts 6–9). */
export const isMobile = (v: string): boolean => /^[6-9]\d{9}$/.test(v);

/** Strip non-digits and any country-code prefix → keep the last 10 digits. */
export const sanitizeMobile = (v: string): string => v.replace(/\D/g, '').slice(-10);

export const isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Returns an error string for a required text value, or '' when valid. */
export const required = (v: string, label = 'This field'): string =>
  v.trim() ? '' : `${label} is required`;
