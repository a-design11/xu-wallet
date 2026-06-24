// mobile/theme/tokens.ts
// Single source of truth for design tokens.
// Industry-grade design system for XU × RustOx.

export const palette = {
  // surfaces
  bg: '#0B0B0F',
  surface: '#15151C',
  elevated: '#1E1E27',
  hairline: '#27272F',

  // text
  text: '#F4F4F6',
  textMuted: '#9B9BA8',
  textFaint: '#6B6B78',

  // chain accents
  rustox: '#F2613D',
  rustoxSoft: '#3A1A12',
  evm: '#7A5CFF',
  evmSoft: '#1F1A3A',
  solana: '#3DDC97',
  solanaSoft: '#103526',

  // states
  success: '#3DDC97',
  warning: '#F2B23D',
  danger: '#E5484D',
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const motion = {
  // cubic-bezier easing tokens
  ease: 'cubic-bezier(.2,.8,.2,1)',
  easeOut: 'cubic-bezier(.16,1,.3,1)',
  dur: {
    fast: 150,
    base: 250,
    slow: 400,
  },
} as const;

export const type = {
  display: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: 'InterTight_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: 'InterTight_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: 'InterTight_500Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: 'InterTight_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  mono: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
} as const;

export type Palette = typeof palette;
export type Type = typeof type;