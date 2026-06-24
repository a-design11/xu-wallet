// app/onboarding/welcome.tsx
import React, { useState } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../mobile/theme/primitives/Text';
import { Button } from '../../mobile/theme/primitives/Pressable';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { useRouter } from 'expo-router';

const SLIDES = [
  {
    title: 'Your keys. Your crypto.',
    body: 'A non-custodial wallet built for the RustOx era — and every chain you actually use.',
  },
  {
    title: 'Multi-chain by default.',
    body: 'RustOx, Ethereum, BNB, Polygon and Solana in one elegant mobile surface.',
  },
  {
    title: 'Sign less. Browse more.',
    body: 'WalletConnect v2, in-app dApp browser with phishing protection, 1inch swaps.',
  },
];

const { width } = Dimensions.get('window');

export default function Welcome() {
  const t = useTheme();
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScrollView
        pagingEnabled
        horizontal
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIdx(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={{ width, padding: 24, justifyContent: 'center' }}>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 30,
                backgroundColor: t.palette.rustoxSoft,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
                marginBottom: 32,
                borderWidth: 1,
                borderColor: t.palette.rustox,
              }}
            >
              <Text variant="display" color="rustox">
                X
              </Text>
            </View>
            <Text variant="display" color="text" style={{ textAlign: 'center' }}>
              {s.title}
            </Text>
            <Text
              variant="body"
              color="textMuted"
              style={{ textAlign: 'center', marginTop: 12, paddingHorizontal: 16 }}
            >
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === idx ? t.palette.rustox : t.palette.hairline,
            }}
          />
        ))}
      </View>

      <View style={{ padding: 16, gap: 10 }}>
        <Button title="Create new wallet" onPress={() => router.push('/onboarding/create')} />
        <Button
          title="Import existing wallet"
          variant="secondary"
          onPress={() => router.push('/onboarding/import')}
        />
      </View>
    </SafeAreaView>
  );
}