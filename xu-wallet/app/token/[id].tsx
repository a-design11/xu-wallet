// app/token/[id].tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../mobile/theme/primitives/Text';
import { Button } from '../../mobile/theme/primitives/Pressable';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { useWallet } from '../../context/WalletContext';
import { getToken, tokenIdFor } from '../../mobile/services/tokenRegistry';
import { getErc20Balance, CHAIN_META, getGasPrice } from '../../mobile/services/chainService';
import { getTokenPriceByContract } from '../../mobile/services/priceService';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AddressDisplay } from '../../components/AddressDisplay';

export default function TokenDetail() {
  const t = useTheme();
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { walletAddresses, network, refreshBalances, isLoadingBalances } = useWallet();
  const entry = getToken(id);
  const [balance, setBalance] = useState(0);
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState(0);
  const [gas, setGas] = useState<{ baseFee: number; priority: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!entry || !walletAddresses) return;
      const holder = walletAddresses[entry.chain];
      if (!holder) return;
      try {
        if (entry.isNative) {
          const bal = await getErc20Balance(entry.chain, '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', holder, entry.decimals, network).catch(() => 0);
          if (!cancelled) setBalance(bal);
        } else if (entry.contractAddress) {
          const bal = await getErc20Balance(entry.chain, entry.contractAddress, holder, entry.decimals, network).catch(() => 0);
          if (!cancelled) setBalance(bal);
        }
        if (entry.contractAddress) {
          const p = await getTokenPriceByContract(entry.chain, entry.contractAddress);
          if (!cancelled && p) {
            setPrice(p.usd);
            setChange(p.change24h);
          }
        }
        const g = await getGasPrice(entry.chain, network);
        if (!cancelled) setGas(g);
      } catch {
        /* ignore */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [entry, walletAddresses, network]);

  if (!entry) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="body" color="textMuted">Token not found.</Text>
      </SafeAreaView>
    );
  }

  const meta = CHAIN_META[entry.chain];
  const valueUsd = price ? balance * price : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScreenHeader title={entry.symbol} subtitle={entry.name} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoadingBalances}
            onRefresh={refreshBalances}
            tintColor={t.palette.rustox}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <View
          style={{
            backgroundColor: t.palette.surface,
            borderRadius: t.radius.xl,
            padding: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: t.palette.hairline,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: meta.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text variant="title" color="bg">{entry.symbol.slice(0, 2)}</Text>
          </View>
          <Text variant="display" color="text">{balance.toFixed(entry.decimals < 6 ? 4 : 2)}</Text>
          <Text variant="caption" color="textMuted">{entry.symbol}</Text>
          {price ? (
            <Text variant="subtitle" color="text" style={{ marginTop: 8 }}>
              ${valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Text>
          ) : null}
          {price ? (
            <Text
              variant="caption"
              style={{ color: change >= 0 ? t.palette.success : t.palette.danger, marginTop: 4 }}
            >
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}% (24h)
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Button title="Send" onPress={() => router.push('/send')} />
          <Button title="Receive" variant="secondary" onPress={() => router.push('/receive')} />
          <Button title="Swap" variant="secondary" onPress={() => router.push('/tabs/swap')} />
        </View>

        <View style={{ marginTop: 20, gap: 12 }}>
          <Card title="Contract">
            <Text variant="mono" color="text">
              {entry.contractAddress ?? 'Native asset'}
            </Text>
          </Card>
          <Card title="Network">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.accent }} />
              <Text variant="body" color="text">{meta.name}</Text>
            </View>
          </Card>
          <Card title="My address">
            <AddressDisplay address={walletAddresses?.[entry.chain] ?? ''} />
          </Card>
          {gas && entry.chain !== 'solana' ? (
            <Card title="Network fee">
              <Row label="Base fee" value={`${gas.baseFee.toFixed(2)} gwei`} />
              <Row label="Priority" value={`${gas.priority.toFixed(2)} gwei`} />
            </Card>
          ) : null}
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
      }}
    >
      <Text variant="caption" color="textMuted" style={{ marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text variant="caption" color="textMuted">{label}</Text>
      <Text variant="caption" color="text">{value}</Text>
    </View>
  );
}