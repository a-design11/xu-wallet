// mobile/theme/primitives/Pressable.tsx
import React from 'react';
import {
  Pressable as RNPressable,
  PressableProps,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../ThemeProvider';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

// Remove the dead `PALETTE` constant — it was never read and shadowed by
// `makePalette(t.palette)[variant]` below, which is the actual source of
// truth. Keeping it would be misleading to anyone editing this file later.

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  ...rest
}: PressableProps & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  const t = useTheme();
  const palette = makePalette(t.palette)[variant];
  return (
    <RNPressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: t.radius.md,
          minHeight: 52,
          paddingHorizontal: t.spacing.lg,
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        (disabled || loading) && { opacity: 0.5 },
        style as any,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon}
          <Text
            style={{
              color: variant === 'secondary' ? t.palette.text : '#0B0B0F',
              fontFamily: t.type.bodyMedium.fontFamily,
              fontSize: t.type.bodyMedium.fontSize,
              fontWeight: '600',
            }}
          >
            {title}
          </Text>
        </View>
      )}
    </RNPressable>
  );
}

function makePalette(p: any) {
  return {
    primary: { bg: p.rustox, border: p.rustox, fg: '#0B0B0F' },
    secondary: { bg: p.surface, border: p.hairline, fg: p.text },
    ghost: { bg: 'transparent', border: 'transparent', fg: p.text },
    danger: { bg: p.danger, border: p.danger, fg: '#0B0B0F' },
  };
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});