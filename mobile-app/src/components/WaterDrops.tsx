import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, View, StyleSheet, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeContext';

const { height, width } = Dimensions.get('window');

/** A single realistic, glassy water teardrop (translucent fill + bright glass edge + highlight). */
function GlassDrop({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: 'rgba(125,221,255,0.16)',
        borderWidth: 1.6,
        borderColor: 'rgba(190,245,255,0.85)',
        borderTopLeftRadius: size * 0.08, // sharp corner → drop tip
        borderTopRightRadius: size * 0.5,
        borderBottomLeftRadius: size * 0.5,
        borderBottomRightRadius: size * 0.5,
        transform: [{ rotate: '45deg' }],
        shadowColor: '#7DDDFF',
        shadowOpacity: 0.9,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
      }}
    >
      {/* bright specular highlight */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.26,
          left: size * 0.26,
          width: size * 0.26,
          height: size * 0.34,
          borderRadius: size * 0.17,
          backgroundColor: 'rgba(255,255,255,0.9)',
          transform: [{ rotate: '-45deg' }],
        }}
      />
      {/* soft secondary glint */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.22,
          right: size * 0.22,
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: 'rgba(190,245,255,0.6)',
        }}
      />
    </View>
  );
}

function Drop({ color, glass }: { color: string; glass: boolean }) {
  // Stable randomised properties per droplet.
  const startX = useMemo(() => Math.random() * width, []);
  const size = useMemo(() => (glass ? 18 + Math.random() * 22 : 8 + Math.random() * 16), [glass]);
  const duration = useMemo(() => (glass ? 5000 + Math.random() * 4000 : 4200 + Math.random() * 4200), [glass]);
  const delay = useMemo(() => Math.random() * 5000, []);
  const maxOpacity = useMemo(
    () => (glass ? 0.7 + Math.random() * 0.3 : 0.18 + Math.random() * 0.4),
    [glass],
  );

  const y = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const run = () => {
      y.setValue(-size - 10);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(y, {
          toValue: height + 40,
          duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: maxOpacity, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: Math.max(500, duration - 700), useNativeDriver: true }),
        ]),
      ]).start(({ finished }) => { if (finished && mounted) run(); });
    };
    const t = setTimeout(run, delay);
    return () => { mounted = false; clearTimeout(t); };
  }, [delay, duration, maxOpacity, size, opacity, y]);

  return (
    <Animated.View style={{ position: 'absolute', left: startX, transform: [{ translateY: y }], opacity }}>
      {glass ? <GlassDrop size={size} /> : <Icon name="water" size={size} color={color} />}
    </Animated.View>
  );
}

/**
 * Decorative animated water droplets that fall behind/over the content.
 * `glass` renders realistic transparent glassy teardrops (great over UI);
 * otherwise stylised accent-coloured drops.
 */
export default function WaterDrops({
  count = 16, color, glass = false,
}: { count?: number; color?: string; glass?: boolean }) {
  const { colors } = useTheme();
  const c = color ?? colors.accent;
  const drops = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {drops.map((i) => <Drop key={i} color={c} glass={glass} />)}
    </View>
  );
}
