import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authApi, meApi } from '../api/endpoints';
import { confirmPhoneOtp } from '../services/phoneAuth';
import { errorMessage } from '../api/client';
import { PrimaryButton } from '../components/ui';
import { useAppDispatch } from '../store/hooks';
import { setCredentials, setProfileComplete, isProfileComplete } from '../store/slices/authSlice';
import { setupNotifications } from '../services/notifications';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerify'>;

const LENGTH = 6;

export default function OtpVerifyScreen({ route }: Props) {
  const { mobile } = route.params;
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [focused, setFocused] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);
  const dispatch = useAppDispatch();

  const submit = async (code: string) => {
    if (code.length !== LENGTH) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      // Verify the code with Firebase, then exchange the Firebase token for our JWT.
      const firebaseToken = await confirmPhoneOtp(code);
      const res = await authApi.firebaseLogin(firebaseToken);
      await AsyncStorage.setItem('wf_tokens', JSON.stringify({ accessToken: res.accessToken, refreshToken: res.refreshToken }));

      // Drivers skip the customer onboarding entirely and go straight to the
      // driver dashboard. The backend decides the role from the phone number.
      if (res.user.role === 'DRIVER') {
        dispatch(setProfileComplete(true));
        dispatch(setCredentials({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken }));
        setupNotifications('DRIVER');
        return;
      }

      // Admins go straight to the admin dashboard — no customer onboarding/profile.
      if (res.user.role === 'ADMIN' || res.user.role === 'SUPER_ADMIN') {
        dispatch(setProfileComplete(true));
        dispatch(setCredentials({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken }));
        return;
      }

      // Decide up-front whether to force the onboarding screen, so the navigator
      // never flashes the main tabs first. New signups always onboard; returning
      // users only if their profile is still incomplete.
      let complete = !res.isNew;
      if (!res.isNew) {
        dispatch(setCredentials({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken }));
        try {
          complete = isProfileComplete(await meApi.profile());
        } catch {
          complete = true; // don't block login if the profile fetch fails
        }
      }
      dispatch(setProfileComplete(complete));
      dispatch(setCredentials({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken }));
      setupNotifications('CUSTOMER');
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (text: string, index: number) => {
    const clean = text.replace(/\D/g, '');

    // Handle paste / multi-char entry — distribute across boxes.
    if (clean.length > 1) {
      const next = [...digits];
      for (let i = 0; i < clean.length && index + i < LENGTH; i++) next[index + i] = clean[i];
      setDigits(next);
      const lastFilled = Math.min(index + clean.length, LENGTH) - 1;
      inputs.current[Math.min(lastFilled + 1, LENGTH - 1)]?.focus();
      const joined = next.join('');
      if (joined.length === LENGTH) submit(joined);
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (clean && index < LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    const joined = next.join('');
    if (joined.length === LENGTH && !joined.includes('')) submit(joined);
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>Sent to +91 {mobile}</Text>

      <View style={styles.boxRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            style={[
              styles.box,
              focused === i && styles.boxFocused,
              !!d && styles.boxFilled,
            ]}
            value={d}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            onFocus={() => setFocused(i)}
            keyboardType="number-pad"
            maxLength={LENGTH}
            textAlign="center"
            selectionColor={colors.primary}
            returnKeyType="done"
            autoFocus={i === 0}
          />
        ))}
      </View>

      <PrimaryButton title="Verify & Continue" onPress={() => submit(digits.join(''))} loading={loading} />
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 24 },
    subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 32 },
    boxRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    box: {
      width: 48,
      height: 58,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    boxFilled: {
      borderColor: colors.primary,
    },
    boxFocused: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.6,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 6,
    },
  });
