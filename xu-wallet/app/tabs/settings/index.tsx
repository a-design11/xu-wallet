// app/tabs/settings/index.tsx
import React, { useState, useCallback } from 'react';
import {
  View, ScrollView, Switch, Pressable, Alert, Linking, StyleSheet, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../mobile/theme/primitives/Text';
import { useTheme } from '../../../mobile/theme/ThemeProvider';
import { useWallet } from '../../../context/WalletContext';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { setGraphApiKey, loadGraphApiKey } from '../../../mobile/services/txHistoryService';
import { setCoinGeckoApiKey } from '../../../mobile/services/priceService';
import { saveApiKey, getApiKey } from '../../../mobile/services/walletService';

const GRAPH_STORAGE_KEY = 'xu_wallet_graph_api_key_v1';
const CG_STORAGE_KEY    = 'xu_wallet_cg_api_key_v1';

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

  // API key modal state
  const [keyModal, setKeyModal] = useState<'graph' | 'coingecko' | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [graphKeySet, setGraphKeySet] = useState(false);
  const [cgKeySet, setCgKeySet] = useState(false);

  // Load current key status on mount
  React.useEffect(() => {
    getApiKey(GRAPH_STORAGE_KEY).then((v) => setGraphKeySet(!!v));
    getApiKey(CG_STORAGE_KEY).then((v) => setCgKeySet(!!v));
  }, []);

  const openKeyModal = useCallback(async (type: 'graph' | 'coingecko') => {
    const storageKey = type === 'graph' ? GRAPH_STORAGE_KEY : CG_STORAGE_KEY;
    const current = await getApiKey(storageKey);
    setKeyInput(current ?? '');
    setKeySaved(false);
    setKeyModal(type);
  }, []);

  const saveKey = useCallback(async () => {
    if (!keyModal) return;
    const storageKey = keyModal === 'graph' ? GRAPH_STORAGE_KEY : CG_STORAGE_KEY;
    const trimmed = keyInput.trim();
    await saveApiKey(storageKey, trimmed || '');
    if (keyModal === 'graph') {
      setGraphApiKey(trimmed || null);
      setGraphKeySet(!!trimmed);
    } else {
      setCoinGeckoApiKey(trimmed || null);
      setCgKeySet(!!trimmed);
    }
    setKeySaved(true);
    setTimeout(() => setKeyModal(null), 800);
  }, [keyModal, keyInput]);

  const clearKey = useCallback(async () => {
    if (!keyModal) return;
    const storageKey = keyModal === 'graph' ? GRAPH_STORAGE_KEY : CG_STORAGE_KEY;
    await saveApiKey(storageKey, '');
    if (keyModal === 'graph') {
      setGraphApiKey(null);
      setGraphKeySet(false);
    } else {
      setCoinGeckoApiKey(null);
      setCgKeySet(false);
    }
    setKeyInput('');
    setKeyModal(null);
  }, [keyModal]);

  const modalTitle = keyModal === 'graph' ? 'The Graph API Key' : 'CoinGecko API Key';
  const modalHint = keyModal === 'graph'
    ? 'Get a free key at thegraph.com/studio. Enables richer transaction history via on-chain subgraphs.'
    : 'Get a key at coingecko.com/api. Increases rate limits for price data.';
  const modalPlaceholder = keyModal === 'graph'
    ? 'Paste your Graph API key…'
    : 'Paste your CoinGecko API key…';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <ScreenHeader title="Settings" />

        {/* ── Security ─────────────────────────────────── */}
        <Section title="Security">
          <Row
            icon="finger-print-outline"
            label="Biometric unlock"
            right={
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
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
          <Row icon="lock-closed-outline" label="Lock now" onPress={() => setIsLocked(true)} />
          <Row icon="key-outline" label="Change PIN" onPress={() => router.push('/settings/security')} />
        </Section>

        {/* ── Networks ──────────────────────────────────── */}
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
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                  backgroundColor: network === 'mainnet' ? t.palette.success + '18' : t.palette.warning + '18',
                }}>
                  <Text style={{ fontFamily: 'InterTight_600SemiBold', fontSize: 12,
                    color: network === 'mainnet' ? t.palette.success : t.palette.warning }}>
                    {network.toUpperCase()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={t.palette.textMuted} />
              </Pressable>
            }
          />
          <Row icon="server-outline" label="Custom RPC" onPress={() => router.push('/settings/networks')} />
        </Section>

        {/* ── API Keys ──────────────────────────────────── */}
        <Section title="API Keys">
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 12, color: t.palette.textMuted, lineHeight: 18, marginBottom: 12 }}>
              Optional keys to unlock richer data. Never shared with third parties.
            </Text>
          </View>
          <Row
            icon="git-network-outline"
            label="The Graph API Key"
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{
                  paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
                  backgroundColor: graphKeySet ? t.palette.success + '18' : t.palette.elevated,
                }}>
                  <Text style={{ fontFamily: 'InterTight_600SemiBold', fontSize: 11,
                    color: graphKeySet ? t.palette.success : t.palette.textFaint }}>
                    {graphKeySet ? 'SET' : 'NOT SET'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={t.palette.textMuted} />
              </View>
            }
            onPress={() => openKeyModal('graph')}
          />
          <Row
            icon="stats-chart-outline"
            label="CoinGecko API Key"
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{
                  paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
                  backgroundColor: cgKeySet ? t.palette.success + '18' : t.palette.elevated,
                }}>
                  <Text style={{ fontFamily: 'InterTight_600SemiBold', fontSize: 11,
                    color: cgKeySet ? t.palette.success : t.palette.textFaint }}>
                    {cgKeySet ? 'SET' : 'NOT SET'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={t.palette.textMuted} />
              </View>
            }
            onPress={() => openKeyModal('coingecko')}
          />
        </Section>

        {/* ── Wallet ────────────────────────────────────── */}
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

        {/* ── About ─────────────────────────────────────── */}
        <Section title="About">
          <Row icon="information-circle-outline" label="Version"
            right={<Text variant="bodyMedium" color="textMuted">v2.0.0</Text>} />
          <Row icon="document-text-outline" label="Documentation"
            onPress={() => Linking.openURL('https://docs.rustox.io').catch(() => null)} />
          <Row icon="shield-checkmark-outline" label="Privacy Policy"
            onPress={() => Linking.openURL('https://rustox.io/privacy').catch(() => null)} />
        </Section>
      </ScrollView>

      {/* ── API Key Modal ─────────────────────────────── */}
      <Modal visible={!!keyModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <Pressable
          style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}
          onPress={() => setKeyModal(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{
            backgroundColor: t.palette.surface,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            padding: 24,
            paddingBottom: 40,
          }}>
            {/* Handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: t.palette.hairline, alignSelf: 'center', marginBottom: 20 }} />

            <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 18, color: t.palette.text, marginBottom: 8 }}>
              {modalTitle}
            </Text>
            <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted, lineHeight: 20, marginBottom: 20 }}>
              {modalHint}
            </Text>

            <View style={{
              backgroundColor: t.palette.elevated,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              padding: 14,
              marginBottom: 16,
            }}>
              <TextInput
                value={keyInput}
                onChangeText={setKeyInput}
                placeholder={modalPlaceholder}
                placeholderTextColor={t.palette.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={{
                  color: t.palette.text,
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 13,
                  minHeight: 40,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(keyModal === 'graph' ? graphKeySet : cgKeySet) && (
                <Pressable
                  onPress={clearKey}
                  style={({ pressed }) => ({
                    flex: 1, paddingVertical: 16, borderRadius: t.radius.md,
                    backgroundColor: t.palette.danger + '18',
                    borderWidth: 1, borderColor: t.palette.danger + '40',
                    alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 15, color: t.palette.danger }}>Clear</Text>
                </Pressable>
              )}
              <Pressable
                onPress={saveKey}
                style={({ pressed }) => ({
                  flex: 2, paddingVertical: 16, borderRadius: t.radius.md,
                  backgroundColor: keySaved ? t.palette.success : t.palette.rustox,
                  alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center', gap: 8,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name={keySaved ? 'checkmark-circle' : 'save-outline'} size={18} color="#fff" />
                <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 15, color: '#fff' }}>
                  {keySaved ? 'Saved!' : 'Save Key'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
      <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textMuted,
        letterSpacing: 0.6, marginBottom: 8 }}>
        {title.toUpperCase()}
      </Text>
      <View style={{
        backgroundColor: t.palette.surface,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.palette.hairline,
        overflow: 'hidden',
      }}>
        {children}
      </View>
    </View>
  );
}

function Row({
  icon, label, right, onPress, danger,
}: {
  icon: any; label: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: t.palette.hairline,
        backgroundColor: pressed ? t.palette.elevated : 'transparent',
      })}
    >
      <Ionicons name={icon} size={18} color={danger ? t.palette.danger : t.palette.text} />
      <Text
        variant="body"
        color={danger ? 'danger' : 'text'}
        style={{ flex: 1, marginLeft: 12 }}
      >
        {label}
      </Text>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={14} color={t.palette.textFaint} /> : null)}
    </Pressable>
  );
}
