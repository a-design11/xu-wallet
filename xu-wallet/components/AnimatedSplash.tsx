// components/AnimatedSplash.tsx
// Cinematic animated logo reveal — replaces the static splash.png during startup.
// Shows while fonts + context load; fades out when the app is ready.

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const BG = '#0B0B0F';
const ACCENT = '#F2613D';
const RING_COLOR = '#F2613D';

interface Props {
  onFinish?: () => void;
  /** Duration of the full animation before onFinish fires. Default 2600 ms. */
  duration?: number;
}

export function AnimatedSplash({ onFinish, duration = 2600 }: Props) {
  // ── Core animation values ──────────────────────────────────────────
  const masterOpacity = useRef(new Animated.Value(1)).current;

  // Logo lettermark scale + opacity
  const logoScale = useRef(new Animated.Value(0.35)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Glow bloom (the soft halo behind the logo)
  const glowScale = useRef(new Animated.Value(0.1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Three expanding rings
  const ring1Scale = useRef(new Animated.Value(0.05)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.05)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0.05)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  // Wordmark below logo
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(18)).current;

  // Tagline
  const tagOpacity = useRef(new Animated.Value(0)).current;

  const spring = (val: Animated.Value, toValue: number, tension = 80, friction = 9) =>
    Animated.spring(val, { toValue, useNativeDriver: true, tension, friction });

  const tween = (
    val: Animated.Value,
    toValue: number,
    dur: number,
    delay = 0,
    easing = Easing.out(Easing.cubic)
  ) =>
    Animated.timing(val, {
      toValue,
      duration: dur,
      delay,
      easing,
      useNativeDriver: true,
    });

  useEffect(() => {
    // Fallback: always dismiss after duration + buffer, in case the animation
    // sequence callback doesn't fire on web (useNativeDriver fallback issue).
    const fallback = setTimeout(() => onFinish?.(), duration + 500);

    Animated.sequence([
      // Phase 1: glow blooms + logo springs in (0–700 ms)
      Animated.parallel([
        tween(glowOpacity, 0.55, 500),
        tween(glowScale, 1, 600, 0, Easing.out(Easing.exp)),
        spring(logoScale, 1, 60, 7),
        tween(logoOpacity, 1, 350),
      ]),

      // Phase 2: rings pulse outward in staggered waves (700–1450 ms)
      Animated.parallel([
        Animated.sequence([
          Animated.parallel([tween(ring1Opacity, 0.8, 150), tween(ring1Scale, 1.05, 400, 0, Easing.out(Easing.exp))]),
          tween(ring1Opacity, 0, 350),
        ]),
        Animated.sequence([
          Animated.delay(180),
          Animated.parallel([tween(ring2Opacity, 0.55, 150), tween(ring2Scale, 1.45, 500, 0, Easing.out(Easing.exp))]),
          tween(ring2Opacity, 0, 320),
        ]),
        Animated.sequence([
          Animated.delay(340),
          Animated.parallel([tween(ring3Opacity, 0.3, 150), tween(ring3Scale, 1.9, 600, 0, Easing.out(Easing.exp))]),
          tween(ring3Opacity, 0, 280),
        ]),
      ]),

      // Phase 3: wordmark + tagline fade in (post-rings, ~1450–2000 ms)
      Animated.parallel([
        tween(wordOpacity, 1, 350),
        tween(wordY, 0, 350, 0, Easing.out(Easing.cubic)),
        tween(tagOpacity, 1, 380, 100),
      ]),

      // Hold for ~450 ms so the user can read it
      Animated.delay(450),

      // Phase 4: fade the whole screen out (2450–2600 ms)
      tween(masterOpacity, 0, 260, 0, Easing.in(Easing.cubic)),
    ]).start(() => {
      clearTimeout(fallback);
      onFinish?.();
    });

    return () => clearTimeout(fallback);
  }, []);

  const LOGO_SIZE = Math.min(W, H) * 0.32;
  const RING_BASE = LOGO_SIZE * 1.2;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: BG, opacity: masterOpacity, alignItems: 'center', justifyContent: 'center' }]}>

      {/* Glow halo */}
      <Animated.View
        style={{
          position: 'absolute',
          width: LOGO_SIZE * 2.2,
          height: LOGO_SIZE * 2.2,
          borderRadius: LOGO_SIZE * 1.1,
          backgroundColor: ACCENT,
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
          // Simulate a soft glow with nested opacity
        }}
      />
      {/* Inner glow (brighter core) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: LOGO_SIZE * 1.1,
          height: LOGO_SIZE * 1.1,
          borderRadius: LOGO_SIZE * 0.55,
          backgroundColor: '#FF8A6A',
          opacity: Animated.multiply(glowOpacity, 0.6),
          transform: [{ scale: glowScale }],
        }}
      />

      {/* Ring 1 */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: RING_BASE,
            height: RING_BASE,
            borderRadius: RING_BASE / 2,
            borderColor: RING_COLOR,
            opacity: ring1Opacity,
            transform: [{ scale: ring1Scale }],
          },
        ]}
      />
      {/* Ring 2 */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: RING_BASE * 1.4,
            height: RING_BASE * 1.4,
            borderRadius: RING_BASE * 0.7,
            borderColor: RING_COLOR,
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />
      {/* Ring 3 */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: RING_BASE * 1.9,
            height: RING_BASE * 1.9,
            borderRadius: RING_BASE * 0.95,
            borderColor: RING_COLOR,
            opacity: ring3Opacity,
            transform: [{ scale: ring3Scale }],
          },
        ]}
      />

      {/* Logo lettermark */}
      <Animated.View
        style={{
          width: LOGO_SIZE,
          height: LOGO_SIZE,
          borderRadius: LOGO_SIZE * 0.28,
          backgroundColor: '#15151C',
          borderWidth: 1.5,
          borderColor: '#2A2A35',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          zIndex: 10,
        }}
      >
        {/* X — inner geometric mark */}
        <View style={{ alignItems: 'center', justifyContent: 'center', width: LOGO_SIZE * 0.55, height: LOGO_SIZE * 0.55 }}>
          {/* Diagonal bars for the X mark */}
          <View
            style={{
              position: 'absolute',
              width: LOGO_SIZE * 0.48,
              height: LOGO_SIZE * 0.065,
              backgroundColor: ACCENT,
              borderRadius: LOGO_SIZE * 0.02,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: LOGO_SIZE * 0.48,
              height: LOGO_SIZE * 0.065,
              backgroundColor: ACCENT,
              borderRadius: LOGO_SIZE * 0.02,
              transform: [{ rotate: '-45deg' }],
            }}
          />
          {/* U accent — small arc below X */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              width: LOGO_SIZE * 0.24,
              height: LOGO_SIZE * 0.065,
              backgroundColor: '#FF8A6A',
              borderRadius: LOGO_SIZE * 0.02,
              opacity: 0.85,
            }}
          />
        </View>
      </Animated.View>

      {/* Wordmark: XU WALLET */}
      <Animated.Text
        style={{
          marginTop: 28,
          fontFamily: 'Manrope_700Bold',
          fontSize: 22,
          letterSpacing: 6,
          color: '#F4F4F6',
          opacity: wordOpacity,
          transform: [{ translateY: wordY }],
          zIndex: 10,
        }}
      >
        XU WALLET
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text
        style={{
          marginTop: 8,
          fontFamily: 'InterTight_400Regular',
          fontSize: 12,
          letterSpacing: 1.5,
          color: ACCENT,
          opacity: tagOpacity,
          zIndex: 10,
          textTransform: 'uppercase',
        }}
      >
        Multi-chain · Non-custodial
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
});
