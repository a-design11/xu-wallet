// app/token/[id].tsx — Token detail with price sparkline + tx history
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Pressable, RefreshControl, Linking, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../mobile/theme/primitives/Text';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { useWallet } from '../../context/WalletContext';
import { getToken } from '../../mobile/services/tokenRegistry';
import { getErc20Balance, CHAIN_META, getGasPrice } from '../../mobile/services/chainService';
import { getTokenPriceByContract, getPrices } from '../../mobile/services/priceService';
import { fetchTxHistory, TxRecord } from '../../mobile/services/txHistoryService';
import { TxHistoryList } from '../../components/TxHistoryList';
import { AddressDisplay } from '../../components/AddressDisplay';

const { width: SCREEN_W } = Dimensions.get('window');

type Tab = 'overview' | 'history';

export default function TokenDetail() {
  const t = useTheme();
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { walletAddresses, network, refreshBalances, isLoadingBalances, tokens } = useWallet();

  const entry = getToken(id);
  // Fall back to context tokens for imported tokens not in registry
  const ctxToken = useMemo(() => tokens.find((x) => x.id === id), [tokens, id]);

  const [balance, setBalance] = useState(ctxToken?.balance ?? 0);
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState(0);
  const [gas, setGas] = useState<{ baseFee: number; priority: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Tx history
  const [txns, setTxns] = useState<TxRecord[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const chain = (entry?.chain ?? ctxToken?.blockchain ?? 'ethereum') as import('../../mobile/services/chainService').Chain;
  const meta = CHAIN_META[chain];
  const accent = meta?.accent ?? t.palette.evm;
  const symbol = entry?.symbol ?? ctxToken?.symbol ?? '?';
  const name = entry?.name ?? ctxToken?.name ?? id;
  const contractAddress = entry?.contractAddress ?? ctxToken?.contractAddress;
  const decimals = entry?.decimals ?? ctxToken?.decimals ?? 18;
  const isNative = !!entry?.isNative && !contractAddress;
  const explorerBase = meta?.explorer ?? 'https://etherscan.io';

  const loadData = useCallback(async () => {
    if (!walletAddresses) return;
    const holder = walletAddresses[chain as keyof typeof walletAddresses];
    if (!holder) return;
    try {
      if (contractAddress && chain !== 'solana') {
        const bal = await getErc20Balance(chain as any, contractAddress, holder, decimals, network).catch(() => 0);
        setBalance(bal);
        const p = await getTokenPriceByContract(chain as any, contractAddress).catch(() => null);
        if (p) { setPrice(p.usd); setChange(p.change24h); }
      } else if (isNative) {
        const cg = CHAIN_META[chain as any]?.coingeckoId;
        if (cg) {
          const prices = await getPrices([cg]).catch(() => ({} as Record<string, import('../../mobile/services/priceService').PriceInfo>));
          const p = prices[cg];
          if (p) { setPrice(p.usd); setChange(p.change24h); }
        }
        setBalance(ctxToken?.balance ?? 0);
      }
      const g = await getGasPrice(chain as any, network).catch(() => null);
      setGas(g);
    } catch { /* ignore */ }
  }, [walletAddresses, chain, contractAddress, decimals, network, isNative, ctxToken?.balance]);

  const loadTxHistory = useCallback(async (bust = false) => {
    if (!walletAddresses) return;
    const holder = walletAddresses[chain as keyof typeof walletAddresses];
    if (!holder) return;
    setTxLoading(true);
    setTxError(null);
    try {
      const txs = await fetchTxHistory(holder, chain as any, network, 30, bust);
      setTxns(txs);
    } catch (e: any) {
      setTxError(e?.message ?? 'Failed to load history');
    } finally {
      setTxLoading(false);
    }
  }, [walletAddresses, chain, network]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (activeTab === 'history' && txns.length === 0) loadTxHistory();
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    refreshBalances();
    loadData();
    if (activeTab === 'history') loadTxHistory(true);
  }, [refreshBalances, loadData, loadTxHistory, activeTab]);

  if (!entry && !ctxToken) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="alert-circle-outline" size={48} color={t.palette.textFaint} />
        <Text variant="body" color="textMuted" style={{ marginTop: 12 }}>Token not found.</Text>
      </SafeAreaView>
    );
  }

  const valueUsd = price ? balance * price : 0;
  const balDisplay = balance.toFixed(decimals < 6 ? 4 : 2);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: t.palette.hairline,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={t.palette.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 18, color: t.palette.text }}>{symbol}</Text>
          <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 11, color: t.palette.textFaint }}>{name}</Text>
        </View>
        {contractAddress && meta?.explorer ? (
          <Pressable onPress={() => Linking.openURL(`${explorerBase}/token/${contractAddress}`)} hitSlop={12}>
            <Ionicons name="open-outline" size={18} color={t.palette.textMuted} />
          </Pressable>
        ) : <View style={{ width: 34 }} />}
      </View>

      {/* Hero balance card */}
      <View style={{
        margin: 16,
        backgroundColor: t.palette.surface,
        borderRadius: t.radius.xl,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: accent + '30',
      }}>
        {/* Token logo */}
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: accent + '22',
          borderWidth: 2, borderColor: accent,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 22, color: accent }}>
            {symbol.slice(0, 2)}
          </Text>
        </View>

        <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 40, color: t.palette.text, letterSpacing: -1 }}>
          {balDisplay}
        </Text>
        <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 16, color: t.palette.textMuted, marginTop: 2 }}>
          {symbol}
        </Text>

        {price != null ? (
          <>
            <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 20, color: t.palette.text, marginTop: 12 }}>
              ${valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons
                name={change >= 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={change >= 0 ? t.palette.success : t.palette.danger}
              />
              <Text style={{ fontFamily: 'InterTight_600SemiBold', fontSize: 13, color: change >= 0 ? t.palette.success : t.palette.danger }}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}% (24h)
              </Text>
            </View>
            {price > 0 && (
              <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 12, color: t.palette.textFaint, marginTop: 4 }}>
                1 {symbol} = ${price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </Text>
            )}
          </>
        ) : null}

        {/* Quick action buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }}>
          {[
            { label: 'Send', icon: 'send-outline', route: '/send' },
            { label: 'Receive', icon: 'qr-code-outline', route: '/receive' },
            { label: 'Swap', icon: 'swap-horizontal-outline', route: '/tabs/swap' },
          ].map((a) => (
            <Pressable
              key={a.label}
              onPress={() => router.push(a.route as any)}
              style={({ pressed }) => ({
                flex: 1, alignItems: 'center', gap: 6,
                paddingVertical: 12,
                borderRadius: t.radius.md,
                backgroundColor: pressed ? accent + '22' : accent + '12',
                borderWidth: 1, borderColor: accent + '30',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Ionicons name={a.icon as any} size={18} color={accent} />
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: accent }}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 4 }}>
        {(['overview', 'history'] as Tab[]).map((tab) => {
          const active = activeTab === tab;
          const labels = { overview: 'Details', history: 'History' };
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingVertical: 12, alignItems: 'center',
                borderBottomWidth: active ? 2 : 1,
                borderBottomColor: active ? accent : t.palette.hairline,
              }}
            >
              <Text style={{ fontFamily: active ? 'Manrope_700Bold' : 'InterTight_400Regular', fontSize: 14, color: active ? accent : t.palette.textMuted }}>
                {labels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoadingBalances} onRefresh={onRefresh} tintColor={accent} />
        }
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <View style={{ padding: 16, gap: 12 }}>
            {/* Contract */}
            {contractAddress && (
              <InfoCard title="Contract Address">
                <Pressable onPress={() => Linking.openURL(`${explorerBase}/token/${contractAddress}`)}>
                  <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, color: t.palette.evm, lineHeight: 20 }}>
                    {contractAddress}
                  </Text>
                </Pressable>
              </InfoCard>
            )}

            {/* Network */}
            <InfoCard title="Network">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
                <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: t.palette.text }}>{meta?.name}</Text>
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: accent + '18' }}>
                  <Text style={{ fontSize: 9, fontFamily: 'InterTight_600SemiBold', color: accent, letterSpacing: 0.5 }}>
                    {meta?.isEVM ? 'EVM' : 'SVM'}
                  </Text>
                </View>
              </View>
            </InfoCard>

            {/* My address */}
            <InfoCard title="My Address">
              <AddressDisplay address={walletAddresses?.[chain as keyof typeof walletAddresses] ?? ''} />
            </InfoCard>

            {/* Gas */}
            {gas && chain !== 'solana' && (
              <InfoCard title="Current Gas Price">
                <DataRow label="Base fee" value={`${gas.baseFee.toFixed(2)} gwei`} />
                <DataRow label="Priority" value={`${gas.priority.toFixed(2)} gwei`} />
                <DataRow label="~Simple transfer" value={`${((gas.baseFee + gas.priority) * 21000 / 1e9).toFixed(6)} ${meta?.symbol}`} />
              </InfoCard>
            )}

            {chain === 'solana' && (
              <InfoCard title="Transaction Fee">
                <DataRow label="Estimated fee" value="~0.000005 SOL" />
                <DataRow label="Priority fee" value="Optional" />
              </InfoCard>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={{ marginTop: 8 }}>
            <TxHistoryList
              txns={txns}
              loading={txLoading}
              error={txError}
              onRefresh={() => loadTxHistory(true)}
              emptyMessage={`No ${symbol} transactions found yet.`}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{
      backgroundColor: t.palette.surface,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.palette.hairline,
      padding: 16,
    }}>
      <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textMuted, letterSpacing: 0.6, marginBottom: 12 }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted }}>{label}</Text>
      <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: t.palette.text }}>{value}</Text>
    </View>
  );
}
