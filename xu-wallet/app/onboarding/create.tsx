// app/onboarding/create.tsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as bip39 from 'bip39';
import { Text } from '../../mobile/theme/primitives/Text';
import { Button } from '../../mobile/theme/primitives/Pressable';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';

export default function Create() {
  const t = useTheme();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const mnemonic = bip39.generateMnemonic(128); // 12 words
      router.push({
        pathname: '/onboarding/recovery',
        params: { mnemonic },
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScreenHeader
        title="Create wallet"
        subtitle="Generate a fresh 12-word recovery phrase"
      />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            backgroundColor: t.palette.surface,
            borderRadius: t.radius.lg,
            padding: 20,
            borderWidth: 1,
            borderColor: t.palette.hairline,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="shield-checkmark" size={20} color={t.palette.rustox} />
            <Text variant="subtitle" style={{ marginLeft: 8 }}>Self-custody</Text>
          </View>
          <Text variant="body" color="textMuted">
            XU Wallet is non-custodial. Your 12-word recovery phrase is the *only* way to
            restore access. We never store it. Write it down somewhere safe before
            continuing.
          </Text>
        </View>

        <View style={{ marginTop: 24, gap: 12 }}>
          {[
            'BIP-39 12-word mnemonic',
            'HD derivation m/44\'/60\'/0\'/0',
            'Native RustOx + EVM + Solana support',
            'Encrypted with device SecureStore',
          ].map((line) => (
            <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: t.palette.rustox,
                }}
              />
              <Text variant="body" color="text">{line}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ padding: 16 }}>
        <Button
          title={generating ? 'Generating…' : 'Generate phrase'}
          loading={generating}
          onPress={generate}
        />
      </View>
    </SafeAreaView>
  );
}