import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, Animated, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { sendPhoneOtp } from '../services/phoneAuth';
import { errorMessage } from '../api/client';
import { PrimaryButton, GradientView } from '../components/ui';
import WaterDrops from '../components/WaterDrops';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpLogin'>;

export default function OtpLoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Invalid number', 'Enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOtp(mobile);
      navigation.navigate('OtpVerify', { mobile });
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
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
          <Text style={styles.brand}>WaterFlow</Text>
          <Text style={styles.tagline}>Pure water, delivered.</Text>
        </View>

        <Animated.View style={[styles.sheet, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>We'll send an OTP to your mobile number</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="Mobile number"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={10}
              value={mobile}
              onChangeText={(value) => setMobile(value.replace(/\D/g, '').slice(0, 10))}
              returnKeyType="done"
              blurOnSubmit
            />
          </View>
          <PrimaryButton title="Send OTP" onPress={sendOtp} loading={loading} />
        </Animated.View>
      </ScrollView>
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
  });
