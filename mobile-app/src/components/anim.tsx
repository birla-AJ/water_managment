import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ViewStyle, TextStyle } from 'react-native';

/** Fades + slides its children up on mount. Use `delay` to stagger a list. */
export function FadeSlideIn({
  children, delay = 0, offset = 18, style,
}: { children: React.ReactNode; delay?: number; offset?: number; style?: ViewStyle }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [delay, t]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Pressable that springs down slightly on touch for tactile feedback. */
export function PressableScale({
  children, onPress, style,
}: { children: React.ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Continuously pulses (scales) its children — an always-on subtle motion. */
export function Pulse({
  children, style, min = 1, max = 1.12, duration = 900,
}: { children: React.ReactNode; style?: ViewStyle; min?: number; max?: number; duration?: number }) {
  const scale = useRef(new Animated.Value(min)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: max, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: min, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, min, max, duration]);
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

/** Counts up from 0 to `value` on mount / when value changes. */
export function AnimatedNumber({
  value, duration = 900, style, format,
}: { value: number; duration?: number; style?: TextStyle | TextStyle[]; format?: (n: number) => string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value, duration, anim]);
  return <Animated.Text style={style}>{format ? format(display) : String(Math.round(display))}</Animated.Text>;
}
