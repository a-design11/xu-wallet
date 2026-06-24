// components/WalletConnectModal.tsx
// Pre-connect modal shown before any dApp is opened.
// Lets the user choose which chain + address to expose to the dApp,
// and confirms intent before the WebView loads.

import React, { useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../mobile/theme/primitives/Text';
import { Button } from '../mobile/theme/primitives/Pressable';
import { useTheme } from '../mobile/theme/ThemeProvider';
import { useWallet } from '../context/WalletContext';
import { CHAIN_META } from '../mobile/services/chainService';
import type { Chain } from '../mobile/services/chainService';
import * as Clipboard from 'expo-clipboard';

const { height: H } = Dimensions.get('window');

// Chains that dApps can realistically connect to via WalletConnect
const CONNECTABLE_CHAINS: Chain[] = ['ethereum', 'bnb', 'polygon', 'rustox'];

interface Props {
  visible: boolean;
  dappUrl: string;
  dappName: string;
  onConnect: (chain: Chain, address: string) => void;
  onDismiss: () => void;
}

export function WalletConnectModal({ visible, dappUrl, dappName, onConnect, onDismiss }: Props) {
  const t = useTheme();
  const { walletAddresses } = useWallet();
  const [selectedChain, setSelectedChain] = useState<Chain>('ethereum');
  const [copied, setCopied] = useState(false);

  const address = walletAddresses?.[selectedChain] ?? '';
  const meta = CHAIN_META[selectedChain];

  // Try to detect which chain the dApp might prefer based on URL
  React.useEffect(() => {
    if (!visible) return;
    const lc = dappUrl.toLowerCase();
    if (lc.includes('solana') || lc.includes('magic eden') || lc.includes('magiceden')) return;
    if (lc.includes('bnb') || lc.includes('pancake') || lc.includes('bsc')) setSelectedChain('bnb');
    else if (lc.includes('polygon') || lc.includes('matic')) setSelectedChain('polygon');
    else if (lc.includes('rustox') || lc.includes('rox')) setSelectedChain('rustox');
    else setSelectedChain('ethereum');
  }, [visible, dappUrl]);

  async function copyAddress() {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleConnect() {
    if (!address) return;
    onConnect(selectedChain, address);
  }

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : 'No address';

  // Extract hostname for display
  let hostname = dappUrl;
  try {
    hostname = new URL(dappUrl).hostname;
  } catch {
    /* use raw url */
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
      >
        <Pressable
          onPress={() => {}} // prevent backdrop tap from closing when tapping sheet
          style={[
            styles.sheet,
            {
              backgroundColor: t.palette.surface,
              borderColor: t.palette.hairline,
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: t.palette.hairline }]} />

          {/* dApp header */}
          <View style={styles.dappRow}>
            <View
              style={[
                styles.dappIcon,
                { backgroundColor: t.palette.elevated, borderColor: t.palette.hairline },
              ]}
            >
              <Ionicons name="globe-outline" size={24} color={t.palette.rustox} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subtitle">{dappName || hostname}</Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>{hostname}</Text>
            </View>
            <Pressable onPress={onDismiss} hitSlop={10}>
              <Ionicons name="close" size={22} color={t.palette.textMuted} />
            </Pressable>
          </View>

          {/* Connection info */}
          <View
            style={[
              styles.infoBox,
              { backgroundColor: t.palette.elevated, borderColor: t.palette.hairline },
            ]}
          >
            <Ionicons name="link-outline" size={14} color={t.palette.rustox} />
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
              This dApp will see your{' '}
              <Text variant="caption" color="text">{meta.name}</Text> address and request
              transaction signatures. You approve every transaction individually.
            </Text>
          </View>

          {/* Chain selector */}
          <Text variant="caption" color="textMuted" style={{ marginBottom: 10, marginTop: 20 }}>
            CONNECT WITH
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {CONNECTABLE_CHAINS.map((c) => {
              const m = CHAIN_META[c];
              const active = selectedChain === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setSelectedChain(c)}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: t.radius.pill,
                    borderWidth: 1.5,
                    borderColor: active ? m.accent : t.palette.hairline,
                    backgroundColor: active ? `${m.accent}22` : t.palette.bg,
                    opacity: pressed ? 0.85 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  })}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: m.accent,
                    }}
                  />
                  <Text
                    variant="bodyMedium"
                    style={{ color: active ? m.accent : t.palette.text }}
                  >
                    {m.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Address preview */}
          <View
            style={[
              styles.addressBox,
              { backgroundColor: t.palette.bg, borderColor: t.palette.hairline },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textMuted">{meta.name} address</Text>
              <Text variant="mono" color="text" style={{ marginTop: 2 }}>
                {address}
              </Text>
            </View>
            <Pressable onPress={copyAddress} hitSlop={8} style={styles.copyBtn}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={16}
                color={copied ? t.palette.success : t.palette.textMuted}
              />
            </Pressable>
          </View>

          {/* Actions */}
          <View style={{ gap: 10, marginTop: 20 }}>
            <Button title={`Connect to ${dappName || hostname}`} onPress={handleConnect} />
            <Button title="Cancel" variant="secondary" onPress={onDismiss} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 36,
    maxHeight: H * 0.85,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  dappRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  dappIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copyBtn: {
    padding: 6,
  },
});
