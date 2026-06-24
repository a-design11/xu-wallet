// app/tabs/settings/index.tsx
import React from 'react';
import { View, ScrollView, Switch, Pressable, Alert, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../mobile/theme/primitives/Text';
import { useTheme } from '../../../mobile/theme/ThemeProvider';
import { useWallet } from '../../../context/WalletContext';
import { ScreenHeader } from '../../../components/ScreenHeader';

export default function Settings() {
  const t = useTheme();
  const router = useRouter();
  const {
    biometricEnabled,
    setBiometricEnabled,
    autoLockTimer,
    setAutoLockTimer,
    setIsLocked,
    resetWallet,
    network,
    setNetwork,
  } = useWallet();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenHeader title="Settings" />

        <Section title="Security">
          <Row
            icon="finger-print-outline"
            label="Biometric unlock"
            right={
              <Switch
                value={biometricEnabled}
                onValueChange={(v) => setBiometricEnabled(v)}
                thumbColor={biometricEnabled ? t.palette.rustox : t.palette.textMuted}
                trackColor={{ true: t.palette.rustoxSoft, false: t.palette.hairline }}
              />
            }
          />
          <Row
            icon="time-outline"
            label="Auto-lock"
            right={
              <Pressable
                onPress={() => {
                  const opts = [0, 1, 5, 15, 60];
                  Alert.alert(
                    'Auto-lock',
                    'Lock the wallet when in the background.',
                    opts.map((m) => ({
                      text: m === 0 ? 'Off' : `${m} min`,
                      onPress: () => setAutoLockTimer(m),
                    }))
                  );
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text variant="bodyMedium" color="textMuted">
                  {autoLockTimer === 0 ? 'Off' : `${autoLockTimer} min`}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={t.palette.textMuted} />
              </Pressable>
            }
          />
          <Row
            icon="lock-closed-outline"
            label="Lock now"
            onPress={() => setIsLocked(true)}
          />
          <Row
            icon="key-outline"
            label="Change PIN"
            onPress={() => router.push('/settings/security')}
          />
        </Section>

        <Section title="Networks">
          <Row
            icon="globe-outline"
            label="Active network"
            right={
              <Pressable
                onPress={() =>
                  Alert.alert('Network', undefined, [
                    { text: 'Mainnet', onPress: () => setNetwork('mainnet') },
                    { text: 'Testnet', onPress: () => setNetwork('testnet') },
                  ])
                }
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text variant="bodyMedium" color="textMuted">{network}</Text>
                <Ionicons name="chevron-forward" size={14} color={t.palette.textMuted} />
              </Pressable>
            }
          />
          <Row
            icon="server-outline"
            label="Custom RPC"
            onPress={() => router.push('/settings/networks')}
          />
        </Section>

        <Section title="Wallet">
          <Row
            icon="refresh-outline"
            label="Reset wallet"
            danger
            onPress={() =>
              Alert.alert(
                'Reset wallet?',
                'This deletes your wallet from this device. Make sure you have your recovery phrase.',
                [
                  { text: 'Cancel' },
                  { text: 'Reset', style: 'destructive', onPress: () => resetWallet() },
                ]
              )
            }
          />
        </Section>

        <Section title="About">
          <Row
            icon="information-circle-outline"
            label="Version"
            right={<Text variant="bodyMedium" color="textMuted">v2.0.0</Text>}
          />
          <Row
            icon="document-text-outline"
            label="Documentation"
            onPress={() => Linking.openURL('https://docs.rustox.io').catch(() => null)}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://rustox.io/privacy').catch(() => null)}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
      <Text variant="caption" color="textMuted" style={{ marginBottom: 8 }}>
        {title.toUpperCase()}
      </Text>
      <View
        style={{
          backgroundColor: t.palette.surface,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.palette.hairline,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  right,
  onPress,
  danger,
}: {
  icon: any;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: t.palette.hairline,
        backgroundColor: pressed ? t.palette.elevated : 'transparent',
      })}
    >
      <Ionicons
        name={icon}
        size={18}
        color={danger ? t.palette.danger : t.palette.text}
      />
      <Text
        variant="body"
        color={danger ? 'danger' : 'text'}
        style={{ flex: 1, marginLeft: 12 }}
      >
        {label}
      </Text>
      {right ?? (onPress ? (
        <Ionicons name="chevron-forward" size={14} color={t.palette.textFaint} />
      ) : null)}
    </Pressable>
  );
}
