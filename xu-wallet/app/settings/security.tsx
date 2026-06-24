// app/settings/security.tsx
import React, { useState } from 'react';
import { View, ScrollView, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../mobile/theme/primitives/Text';
import { Button } from '../../mobile/theme/primitives/Pressable';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useWallet } from '../../context/WalletContext';
import { useRouter } from 'expo-router';
import { saveApiKey } from '../../mobile/services/walletService';

export default function Security() {
  const t = useTheme();
  const router = useRouter();
  const { biometricEnabled, setBiometricEnabled, apiKeyEvm, setApiKey } = useWallet();
  const [cg, setCg] = useState(apiKeyEvm ?? '');
  const [sol, setSol] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScreenHeader title="Security" subtitle="PIN, biometric, API keys" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Card title="Biometric unlock">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="body" color="text">Enable Face ID / Fingerprint</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={(v) => setBiometricEnabled(v)}
              thumbColor={biometricEnabled ? t.palette.rustox : t.palette.textMuted}
              trackColor={{ true: t.palette.rustoxSoft, false: t.palette.hairline }}
            />
          </View>
        </Card>

        <Card title="API keys (optional)">
          <Text variant="caption" color="textMuted" style={{ marginBottom: 8 }}>
            Keys unlock higher rate limits. Stored locally in SecureStore.
          </Text>
          <KeyField label="CoinGecko Pro" value={cg} onChange={setCg} onSave={() => setApiKey('coinGecko', cg)} />
          <KeyField label="Helius (Solana RPC)" value={sol} onChange={setSol} onSave={() => setApiKey('solana', sol)} />
        </Card>

        <View style={{ marginTop: 24 }}>
          <Button title="Done" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.palette.surface,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.palette.hairline,
        padding: 14,
        marginTop: 12,
      }}
    >
      <Text variant="caption" color="textMuted" style={{ marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

function KeyField({
  label,
  value,
  onChange,
  onSave,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 8 }}>
      <Text variant="caption" color="textMuted">{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 4,
          backgroundColor: t.palette.bg,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.palette.hairline,
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry
          placeholder="paste key"
          placeholderTextColor={t.palette.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, color: t.palette.text, fontSize: 14 }}
        />
        <Button title="Save" variant="ghost" onPress={onSave} />
      </View>
    </View>
  );
}