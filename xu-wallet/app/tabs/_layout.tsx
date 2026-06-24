// app/tabs/_layout.tsx
import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';
import { useTheme } from '../../mobile/theme/ThemeProvider';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      <BottomNav />
    </View>
  );
}