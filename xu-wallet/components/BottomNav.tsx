// components/BottomNav.tsx
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../mobile/theme/ThemeProvider';

const TABS = [
  { href: '/tabs/home', label: 'Wallet', icon: 'wallet' as const, iconActive: 'wallet' as const },
  { href: '/tabs/swap', label: 'Swap', icon: 'swap-horizontal' as const, iconActive: 'swap-horizontal' as const },
  { href: '/tabs/browser', label: 'dApps', icon: 'globe-outline' as const, iconActive: 'globe' as const },
  { href: '/tabs/settings', label: 'Settings', icon: 'settings-outline' as const, iconActive: 'settings' as const },
];

export function BottomNav() {
  const t = useTheme();
  const router = useRouter();
  const path = usePathname();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: t.palette.bg,
          borderTopColor: t.palette.hairline,
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = path.startsWith(tab.href);
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.push(tab.href as any)}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <Ionicons
              name={active ? tab.iconActive : tab.icon}
              size={24}
              color={active ? t.palette.rustox : t.palette.textMuted}
            />
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                marginTop: 6,
                backgroundColor: active ? t.palette.rustox : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 48,
  },
});