import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser } from '../store/slices/authSlice';
import { authApi } from '../api/endpoints';
import { setAppLanguage, currentLanguage, AppLanguage } from '../i18n';

// Central language switch for the mobile app: updates i18next, persists to
// AsyncStorage, reflects onto the Redux user, and saves to the backend.
export function useLanguage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  // Subscribe to i18n so consumers re-render on language change.
  useTranslation();
  const current = currentLanguage();

  const change = useCallback(
    async (lang: AppLanguage) => {
      await setAppLanguage(lang);
      if (user) dispatch(setUser({ ...user, language: lang }));
      try {
        await authApi.setLanguage(lang);
      } catch {
        /* ignore — applied locally regardless */
      }
    },
    [dispatch, user],
  );

  return { current, change };
}
