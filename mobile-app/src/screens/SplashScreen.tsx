import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCredentials, setBootstrapped, setProfileComplete, isProfileComplete } from '../store/slices/authSlice';
import { authApi, meApi } from '../api/endpoints';
import { setupNotifications } from '../services/notifications';
import { GradientView } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

const SPLASH = require('../../assets/splash.png');

export default function SplashScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  const [authReady, setAuthReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  // Animation values
  const fade = useRef(new Animated.Value(0)).current;
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
          const isAdmin = me.role === 'ADMIN' || me.role === 'SUPER_ADMIN';
          const role = me.role === 'DRIVER' ? 'DRIVER' : isAdmin ? me.role : 'CUSTOMER';
          dispatch(setCredentials({ user: { id: me.id, name: me.name, mobile: me.mobile, role, email: me.email }, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
          if (role === 'DRIVER') {
            // Drivers have no customer onboarding step.
            dispatch(setProfileComplete(true));
            setupNotifications('DRIVER');
          } else if (isAdmin) {
            // Admins go straight to the admin dashboard; no onboarding / push setup.
            dispatch(setProfileComplete(true));
          } else {
            try {
              dispatch(setProfileComplete(isProfileComplete(await meApi.profile())));
            } catch {
              dispatch(setProfileComplete(true));
            }
            setupNotifications('CUSTOMER');
          }
        }
      } catch {
        await AsyncStorage.removeItem('wf_tokens');
      } finally {
        setAuthReady(true);
      }
    })();
  }, [dispatch]);

  // ── Entrance animation + reveal timer ──────────────────────────────────────
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 750, useNativeDriver: true }).start();
    const tBtn = setTimeout(() => setMinTimePassed(true), 2000);
    return () => clearTimeout(tBtn);
  }, [fade]);

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
  const bobX = bob.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <ImageBackground source={SPLASH} style={styles.bg} resizeMode="cover" />
      </Animated.View>

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
    bg: { flex: 1, width: '100%', height: '100%' },

    fabWrap: { position: 'absolute', right: 26, bottom: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
    hint: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    fab: {
      width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    },
  });
