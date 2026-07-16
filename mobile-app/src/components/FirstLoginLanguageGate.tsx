import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../store/hooks';
import LanguageSelectModal from './LanguageSelectModal';

const flagKey = (id: string) => `wf_lang_chosen:${id}`;

// Shows the language-selection modal once, the first time a user reaches the
// app after login on this device/account. Rendered globally so it survives the
// navigator switching screens right after login.
export default function FirstLoginLanguageGate() {
  const { accessToken, user } = useAppSelector((s) => s.auth);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!accessToken || !user?.id) return;
      const chosen = await AsyncStorage.getItem(flagKey(user.id));
      if (active && !chosen) setOpen(true);
    })();
    return () => {
      active = false;
    };
  }, [accessToken, user?.id]);

  const close = async () => {
    if (user?.id) await AsyncStorage.setItem(flagKey(user.id), '1');
    setOpen(false);
  };

  if (!accessToken) return null;
  return <LanguageSelectModal visible={open} onClose={close} />;
}
