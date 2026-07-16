import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { setUser } from '../features/auth/authSlice';
import { authApi } from '../api/endpoints';
import type { AppLanguage } from '../i18n';

// Central place to switch language: updates i18next (which also caches to
// localStorage 'wf_lang' via the detector), reflects it on the Redux user
// (persisted to 'wf_auth'), and saves it to the backend for the logged-in admin.
export function useLanguage() {
  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const current = (i18n.language?.startsWith('hi') ? 'hi' : 'en') as AppLanguage;

  const change = useCallback(
    async (lang: AppLanguage) => {
      await i18n.changeLanguage(lang);
      if (user) dispatch(setUser({ ...user, language: lang }));
      // Best-effort server save; UI already switched regardless.
      try {
        await authApi.setLanguage(lang);
      } catch {
        /* ignore — language still applied locally */
      }
    },
    [i18n, dispatch, user],
  );

  return { current, change };
}
