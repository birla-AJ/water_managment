import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCredentials, setBootstrapped, setProfileComplete, isProfileComplete } from '../store/slices/authSlice';
import { authApi, meApi } from '../api/endpoints';
import { setupNotifications } from '../services/notifications';
import { GradientView } from '../components/ui';
import WaterDrops from '../components/WaterDrops';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

const LOGO = require('../../assets/logo/waterflow-icon-1024.png');

export default function SplashScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  const [authReady, setAuthReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  // Animation values
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(22)).current;
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;
  const btn = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  // ── Bootstrap auth in the background (does NOT auto-navigate) ──────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('wf_tokens');
        if (raw) {
          const tokens = JSON.parse(raw);
          dispatch(setCredentials({ user: { id: '', name: '', mobile: '' }, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
          const me = await authApi.me();
          dispatch(setCredentials({ user: { id: me.id, name: me.name, mobile: me.mobile }, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
          try {
            dispatch(setProfileComplete(isProfileComplete(await meApi.profile())));
          } catch {
            dispatch(setProfileComplete(true));
          }
          setupNotifications();
        }
      } catch {
        await AsyncStorage.removeItem('wf_tokens');
      } finally {
        setAuthReady(true);
      }
    })();
  }, [dispatch]);

  // ── Entrance + looping animations ──────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(textY, { toValue: 0, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Sonar ripple: three concentric rings, phase-offset by ~800ms each.
    const RIPPLE_MS = 2400;
    const startRipple = (v: Animated.Value) =>
      Animated.loop(
        Animated.timing(v, { toValue: 1, duration: RIPPLE_MS, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ).start();

    startRipple(r1);
    const t2 = setTimeout(() => startRipple(r2), RIPPLE_MS / 3);
    const t3 = setTimeout(() => startRipple(r3), (RIPPLE_MS / 3) * 2);
    const tBtn = setTimeout(() => setMinTimePassed(true), 2000);
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(tBtn); };
  }, [fade, logoScale, r1, r2, r3, textY]);

  // Reveal the button once 2s have passed AND auth is resolved.
  const showButton = minTimePassed && authReady;
  useEffect(() => {
    if (!showButton) return;
    Animated.spring(btn, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, [showButton, btn, bob]);

  const proceed = () => dispatch(setBootstrapped());

  const rippleStyle = (v: Animated.Value) => ({
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.1] }) }],
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] }),
  });
  const bobX = bob.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });

  return (
    <View style={styles.container}>
      <WaterDrops count={18} />

      <View style={styles.center}>
        <View style={styles.logoBox}>
          {/* sonar ripple — three staggered rings behind the logo */}
          <Animated.View style={[styles.ring, rippleStyle(r1)]} />
          <Animated.View style={[styles.ring, rippleStyle(r2)]} />
          <Animated.View style={[styles.ring, rippleStyle(r3)]} />
          <Animated.View style={{ transform: [{ scale: logoScale }], opacity: fade }}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: fade, transform: [{ translateY: textY }], alignItems: 'center' }}>
          <Text style={styles.title}>WaterFlow</Text>
          <Text style={styles.subtitle}>Pure water, delivered.</Text>
        </Animated.View>
      </View>

      {/* Arrow button — fades in after 2s; routes based on auth */}
      <Animated.View
        pointerEvents={showButton ? 'auto' : 'none'}
        style={[
          styles.fabWrap,
          { opacity: btn, transform: [{ scale: btn }, { translateX: bobX }] },
        ]}
      >
        <Text style={styles.hint}>{accessToken ? 'Continue' : 'Get started'}</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={proceed}>
          <GradientView style={styles.fab}>
            <Icon name="arrow-right" size={30} color="#FFFFFF" />
          </GradientView>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    logoBox: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
    ring: {
      position: 'absolute',
      width: 150, height: 150, borderRadius: 75,
      borderWidth: 2, borderColor: colors.primary,
    },
    logo: {
      width: 148, height: 148,
      shadowColor: colors.primary, shadowOpacity: 0.6, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 16,
    },
    title: { fontSize: 38, fontWeight: '800', color: colors.text, marginTop: 24, letterSpacing: 0.5 },
    subtitle: { fontSize: 15, color: colors.textMuted, marginTop: 6 },

    fabWrap: { position: 'absolute', right: 26, bottom: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
    hint: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
    fab: {
      width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    },
  });
