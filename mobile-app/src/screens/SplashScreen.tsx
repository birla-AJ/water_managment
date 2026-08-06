import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCredentials, setBootstrapped, setProfileComplete, isProfileComplete } from '../store/slices/authSlice';
import { authApi, meApi } from '../api/endpoints';
import { setupNotifications } from '../services/notifications';
import { getCurrentLocationSilent } from '../services/location';
import { setPendingLocation } from '../services/pendingLocation';
import { applyStoredLanguage, setAppLanguage } from '../i18n';

export default function SplashScreen() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  const [authReady, setAuthReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  // Animation values
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(24)).current;
  const btn = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  // ── Bootstrap auth in the background (does NOT auto-navigate) ──────────────
  useEffect(() => {
    (async () => {
      // Apply the locally-saved language before anything renders.
      await applyStoredLanguage();

      // Best-effort, silent location permission + fix — used only to prefill a
      // brand-new customer's row on their very first OTP verify. Never blocks
      // splash and never shows an alert; stays null all session if declined.
      getCurrentLocationSilent().then(setPendingLocation);

      try {
        const raw = await AsyncStorage.getItem('wf_tokens');
        if (raw) {
          const tokens = JSON.parse(raw);
          dispatch(setCredentials({ user: { id: '', name: '', mobile: '' }, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
          const me = await authApi.me();
          const isAdmin = me.role === 'ADMIN' || me.role === 'SUPER_ADMIN';
          const role = me.role === 'DRIVER' ? 'DRIVER' : isAdmin ? me.role : 'CUSTOMER';
          // Sync language from the server (may have changed on another device).
          if (me.language === 'en' || me.language === 'hi') await setAppLanguage(me.language);
          dispatch(setCredentials({ user: { id: me.id, name: me.name, mobile: me.mobile, role, email: me.email, language: me.language }, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
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
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const tBtn = setTimeout(() => setMinTimePassed(true), 2000);
    return () => clearTimeout(tBtn);
  }, [fade, rise]);

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
      <LinearGradient
        colors={['#F2FBFB', '#D2F0EF', '#9FDEDD']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Brand block: water-bottle trio inside a soft medallion + wordmark ── */}
      <Animated.View style={[styles.brand, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <View style={styles.medallion}>
          <View style={styles.jars}>
            <Icon name="bottle-soda-classic" size={64} color={AQUA.light} style={styles.jarSide} />
            <Icon name="bottle-soda-classic" size={104} color={AQUA.teal} style={styles.jarTall} />
            <Icon name="bottle-soda-classic" size={78} color={AQUA.deep} style={styles.jarSide} />
          </View>
        </View>

        <Text style={styles.eyebrow}>{t('splash.eyebrow')}</Text>
        <Text style={styles.wordmark}>
          <Text style={{ color: AQUA.ink }}>Water</Text>
          <Text style={{ color: AQUA.teal }}>Flow</Text>
        </Text>
      </Animated.View>

      {/* ── Bottom water wave ── */}
      <View pointerEvents="none" style={styles.splashWrap}>
        <Icon name="water" size={22} color="rgba(255,255,255,0.85)" style={[styles.dropFloat, { left: '24%', bottom: 168 }]} />
        <Icon name="water" size={15} color="rgba(255,255,255,0.7)" style={[styles.dropFloat, { left: '70%', bottom: 182 }]} />
        {/* two offset white layers form an organic crest, no native SVG needed */}
        <View style={styles.waveBack} />
        <View style={styles.waveFront} />
      </View>

      {/* Arrow button — fades in after 2s; routes based on auth */}
      <Animated.View
        pointerEvents={showButton ? 'auto' : 'none'}
        style={[
          styles.fabWrap,
          { opacity: btn, transform: [{ scale: btn }, { translateX: bobX }] },
        ]}
      >
        <Text style={styles.hint}>{accessToken ? t('splash.continue') : t('splash.getStarted')}</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={proceed}>
          <LinearGradient colors={[AQUA.deep, AQUA.teal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
            <Icon name="arrow-right" size={30} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// The splash is always the light "aqua" design, so its palette is fixed here
// (independent of the dark/light app theme) to guarantee legible contrast.
const AQUA = {
  ink: '#0E3A3C',
  deep: '#0A6E72',
  teal: '#16A8AE',
  light: '#54C6CB',
  muted: '#5E8487',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2FBFB' },

  brand: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 90 },

  // Soft translucent medallion behind the bottle trio.
  medallion: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  jarSide: { marginHorizontal: -8, marginBottom: 4 },
  jarTall: { marginHorizontal: -6 },

  eyebrow: { marginTop: 30, fontSize: 12, fontWeight: '700', letterSpacing: 4, color: AQUA.muted },
  wordmark: { marginTop: 6, fontSize: 44, fontWeight: '800', letterSpacing: -0.5 },

  // Bottom water wave — two offset white layers for an organic crest.
  splashWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  waveBack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 168,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderTopLeftRadius: 90,
    borderTopRightRadius: 170,
  },
  waveFront: {
    height: 132,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 170,
    borderTopRightRadius: 80,
  },
  dropFloat: { position: 'absolute' },

  fabWrap: { position: 'absolute', right: 26, bottom: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { color: AQUA.deep, fontSize: 14, fontWeight: '800' },
  fab: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    shadowColor: AQUA.teal, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
});
