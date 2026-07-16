import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import hi from './locales/hi.json';

export const SUPPORTED_LANGUAGES = ['en', 'hi'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Single side-effect init (imported once from main.tsx). Language resolution:
// saved localStorage (via detector, key 'wf_lang') → browser → 'en'. The saved
// user.language from the backend is applied explicitly on login / app boot.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'wf_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
