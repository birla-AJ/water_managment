import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import hi from './locales/hi.json';

export const SUPPORTED_LANGUAGES = ['en', 'hi'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANG_STORAGE_KEY = 'wf_lang';

// Init synchronously with English so the first render always has strings. The
// saved language (AsyncStorage / server) is applied during Splash bootstrap via
// applyStoredLanguage() before the app UI shows.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

/** Read the persisted language (if any) and apply it. Call during app bootstrap. */
export async function applyStoredLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'hi') {
      await i18n.changeLanguage(saved);
    }
  } catch {
    /* ignore — stays on default */
  }
}

/** Change language and persist it locally. Server sync happens in the caller. */
export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function currentLanguage(): AppLanguage {
  return (i18n.language?.startsWith('hi') ? 'hi' : 'en') as AppLanguage;
}

export default i18n;
