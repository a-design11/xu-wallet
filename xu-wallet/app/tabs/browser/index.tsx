// app/tabs/browser/index.tsx
import React, { useState, useCallback } from 'react';
import { View, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Text } from '../../../mobile/theme/primitives/Text';
import { useTheme } from '../../../mobile/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { isPhishing } from '../../../mobile/services/phishing';
import { WalletConnectModal } from '../../../components/WalletConnectModal';
import type { Chain } from '../../../mobile/services/chainService';

const POPULAR = [
  { name: 'RustOx Swap', url: 'https://swap.rustox.io', accent: '#F2613D' },
  { name: 'Uniswap', url: 'https://app.uniswap.org', accent: '#FF007A' },
  { name: 'OpenSea', url: 'https://opensea.io', accent: '#2081E2' },
  { name: 'Aave', url: 'https://app.aave.com', accent: '#B6509E' },
  { name: 'PancakeSwap', url: 'https://pancakeswap.finance', accent: '#D1884F' },
  { name: '1inch', url: 'https://app.1inch.io', accent: '#1F314F' },
  { name: 'Magic Eden', url: 'https://magiceden.io', accent: '#E42575' },
  { name: 'RustOx Stake', url: 'https://stake.rustox.io', accent: '#F2613D' },
];

export default function Browser() {
  const t = useTheme();
  const [url, setUrl] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  // WalletConnect pre-connect state
  const [wcPending, setWcPending] = useState<{ url: string; name: string } | null>(null);

  const open = useCallback(async (target: string) => {
    let normalized = target.trim();
    if (!normalized) return;
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;

    const host = (() => {
      try { return new URL(normalized).host.toLowerCase(); } catch { return ''; }
    })();

    if (await isPhishing(host)) {
      setWarning(`Phishing site blocked: ${host}`);
      return;
    }

    setWarning(null);

    // Show WalletConnect pre-connect modal before loading the dApp
    const dappName = POPULAR.find((p) => normalized.startsWith(p.url))?.name ?? host;
    setWcPending({ url: normalized, name: dappName });
  }, []);

  function onWcConnect(_chain: Chain, _address: string) {
    // User confirmed which chain + account to use.
    // In a full WalletConnect v2 implementation, we would initialise the Web3Wallet
    // provider here with the chosen address and chain so the dApp gets the correct
    // accounts array. For now we record the choice and open the dApp.
    if (wcPending) {
      setActive(wcPending.url);
      setLoading(true);
    }
    setWcPending(null);
  }

  function onWcDismiss() {
    setWcPending(null);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      {active ? (
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 10,
              gap: 8,
              borderBottomWidth: 1,
              borderBottomColor: t.palette.hairline,
            }}
          >
            <Pressable onPress={() => setActive(null)} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={22} color={t.palette.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {active}
              </Text>
            </View>
            {/* WalletConnect indicator */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: t.radius.pill,
                backgroundColor: t.palette.elevated,
                borderWidth: 1,
                borderColor: t.palette.hairline,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: t.palette.success,
                }}
              />
              <Text variant="caption" color="textMuted">Connected</Text>
            </View>
            <Pressable onPress={() => setActive(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color={t.palette.text} />
            </Pressable>
          </View>

          {warning ? (
            <View style={{ padding: 12, backgroundColor: t.palette.danger }}>
              <Text variant="caption" color="bg">{warning}</Text>
            </View>
          ) : null}

          <WebView
            source={{ uri: active }}
            onLoadEnd={() => setLoading(false)}
            style={{ flex: 1, backgroundColor: t.palette.bg }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', padding: 8 }}>
                <ActivityIndicator color={t.palette.rustox} />
              </View>
            )}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text variant="title">dApps</Text>
          <Text variant="caption" color="textMuted" style={{ marginBottom: 12 }}>
            Select chain and account before connecting
          </Text>

          {warning ? (
            <View
              style={{
                backgroundColor: `${t.palette.danger}22`,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.palette.danger,
                padding: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="shield-outline" size={16} color={t.palette.danger} />
              <Text variant="caption" color="danger" style={{ flex: 1 }}>{warning}</Text>
            </View>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: t.palette.surface,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 8,
            }}
          >
            <Ionicons name="search" size={16} color={t.palette.textMuted} />
            <TextInput
              value={url}
              onChangeText={setUrl}
              onSubmitEditing={() => open(url)}
              placeholder="Search or paste URL"
              placeholderTextColor={t.palette.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              style={{ flex: 1, color: t.palette.text, fontSize: 14 }}
            />
            {url.length > 0 ? (
              <Pressable onPress={() => open(url)} hitSlop={8}>
                <Ionicons name="arrow-forward-circle" size={22} color={t.palette.rustox} />
              </Pressable>
            ) : null}
          </View>

          <Text variant="subtitle" style={{ marginTop: 24, marginBottom: 12 }}>Popular</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {POPULAR.map((d) => (
              <Pressable
                key={d.url}
                onPress={() => open(d.url)}
                style={({ pressed }) => ({
                  flexBasis: '47%',
                  flexGrow: 1,
                  backgroundColor: t.palette.surface,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.palette.hairline,
                  padding: 14,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: d.accent,
                    marginBottom: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="globe-outline" size={18} color="#fff" />
                </View>
                <Text variant="bodyMedium">{d.name}</Text>
                <Text variant="caption" color="textMuted" numberOfLines={1}>{d.url}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* WalletConnect pre-connect modal */}
      <WalletConnectModal
        visible={wcPending !== null}
        dappUrl={wcPending?.url ?? ''}
        dappName={wcPending?.name ?? ''}
        onConnect={onWcConnect}
        onDismiss={onWcDismiss}
      />
    </SafeAreaView>
  );
}
