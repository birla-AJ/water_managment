import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Keyboard, KeyboardAvoidingView, Platform, Animated, ScrollView, Modal, Pressable, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/endpoints';
import { errorMessage as apiErrorMessage } from '../api/client';
import { PrimaryButton, GradientView } from '../components/ui';
import WaterDrops from '../components/WaterDrops';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpLogin'>;

export default function OtpLoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const slide = useRef(new Animated.Value(40)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      Keyboard.dismiss();
      setLoginError(t('auth.invalidNumberMsg'));
      return;
    }
    setLoading(true);
    try {
      // Any mobile number can request an OTP now. Existing driver/admin/
      // customer numbers log straight in; a brand-new number gets a fresh
      // customer record on verify and is guided through registration.
      await authApi.requestOtp(mobile);
      navigation.navigate('OtpVerify', { mobile });
    } catch (e) {
      Keyboard.dismiss();
      setLoginError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <WaterDrops count={14} color={colors.primary} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <GradientView style={styles.logoBadge}>
            <Icon name="water" size={56} color="#FFFFFF" />
          </GradientView>
          <Text style={styles.brand}>{t('brand.name')}</Text>
          <Text style={styles.tagline}>{t('brand.tagline')}</Text>
        </View>

        <Animated.View style={[styles.sheet, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <Text style={styles.title}>{t('auth.login')}</Text>
          <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.mobileNumber')}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={10}
              value={mobile}
              onChangeText={(value) => setMobile(value.replace(/\D/g, '').slice(0, 10))}
              returnKeyType="done"
              blurOnSubmit
            />
          </View>
          <PrimaryButton title={t('auth.sendOtp')} onPress={sendOtp} loading={loading} />
        </Animated.View>
      </ScrollView>
      <Modal transparent visible={!!loginError} animationType="fade" onRequestClose={() => setLoginError(null)}>
        <Pressable style={styles.dialogBackdrop} onPress={() => setLoginError(null)}>
          <Pressable style={styles.dialogCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.dialogIcon}><Icon name="shield-alert-outline" size={28} color={colors.error} /></View>
            <Text style={styles.dialogTitle}>{t('otpLoginExtra.accessUnavailable')}</Text>
            <Text style={styles.dialogText}>{loginError}</Text>
            <TouchableOpacity style={styles.dialogButton} onPress={() => setLoginError(null)} activeOpacity={0.85}>
              <Text style={styles.dialogButtonText}>{t('otpLoginExtra.gotIt')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { flexGrow: 1, justifyContent: 'space-between' },
    header: { flex: 1, minHeight: 430, alignItems: 'center', justifyContent: 'center', paddingTop: 36 },
    logoBadge: {
      width: 104, height: 104, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary,
      shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12,
    },
    brand: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 18, letterSpacing: 0.5 },
    tagline: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
    sheet: {
      backgroundColor: colors.bgElevated, borderTopLeftRadius: 32, borderTopRightRadius: 32,
      padding: 24, paddingBottom: 44, borderWidth: 1, borderColor: colors.cardBorder, borderBottomWidth: 0,
    },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 22 },
    inputRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 16, marginBottom: 22,
    },
    prefix: { fontSize: 16, fontWeight: '800', color: colors.primary, marginRight: 10 },
    input: { flex: 1, fontSize: 16, paddingVertical: 16, color: colors.text },
    dialogBackdrop: { flex: 1, backgroundColor: 'rgba(4, 31, 31, 0.56)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    dialogCard: {
      width: '100%', maxWidth: 390, backgroundColor: colors.bgElevated, borderRadius: 24,
      borderWidth: 1, borderColor: colors.cardBorder, padding: 24,
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12,
    },
    dialogIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.error + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    dialogTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
    dialogText: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.textMuted, marginTop: 8 },
    dialogButton: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 24 },
    dialogButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  });
