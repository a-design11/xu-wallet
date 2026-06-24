// mobile/theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { palette, type, spacing, radius, motion } from './tokens';

export type Theme = {
  palette: typeof palette;
  type: typeof type;
  spacing: typeof spacing;
  radius: typeof radius;
  motion: typeof motion;
  isDark: boolean;
};

const Ctx = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light'; // dark-first
  const value = useMemo<Theme>(
    () => ({ palette, type, spacing, radius, motion, isDark }),
    [isDark]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(Ctx);
  if (!t) throw new Error('useTheme must be used within ThemeProvider');
  return t;
}