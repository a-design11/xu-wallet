// mobile/theme/primitives/Text.tsx
import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';

type Variant = keyof ReturnType<typeof useTheme>['type'];

export function Text({
  variant = 'body',
  color = 'text',
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  const t = useTheme();
  const v = t.type[variant];
  return (
    <RNText
      {...rest}
      style={[
        v as any,
        { color: (t.palette as any)[color] ?? color },
        style,
      ]}
    />
  );
}