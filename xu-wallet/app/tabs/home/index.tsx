// app/tabs/home/index.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../mobile/theme/primitives/Text';
import { useTheme } from '../../../mobile/theme/ThemeProvider';
import { useWallet } from '../../../context/WalletContext';
import { BalanceCard } from '../../../components/BalanceCard';
import { TokenListItem } from '../../../components/TokenListItem';
import { BlockchainSwitcherSheet } from '../../../components/BlockchainSwitcherSheet';
import { WalletListSheet } from '../../../components/WalletListSheet';
import { ImportTokenSheet } from '../../../components/ImportTokenSheet';
import type { Chain } from '../../../mobile/services/chainService';
import { CHAIN_META } from '../../../mobile/services/chainService';
import * as Clipboard from 'expo-clipboard';

const BUILT_IN_CHAIN_FILTERS: Array<Chain | 'all'> = ['all', 'rustox', 'ethereum', 'bnb', 'polygon', 'solana'];

// Ordered list of chains to show in the market ticker
const MARKET_CHAINS: Chain[] = ['ethereum', 'bnb', 'polygon', 'solana', 'rustox'];

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const {
    tokens, refreshBalances, isLoadingBalances, lastRefreshedAt,
    selectedBlockchain, setSelectedBlockchain,
    selectedCustomChain, setSelectedCustomChain,
    customChains, walletAddress, activeAccount, accounts,
    prices,
  } = useWallet();

  const [hidden, setHidden]               = useState(false);
  const [filter, setFilter]               = useState<Chain | 'all' | string>('all');
  const [addressCopied, setAddressCopied] = useState(false);
  const [switcherOpen, setSwitcherOpen]   = useState(false);
  const [walletListOpen, setWalletListOpen]   = useState(false);
  const [importTokenOpen, setImportTokenOpen] = useState(false);

  const activeChainInfo = useMemo(() => {
    if (selectedCustomChain) {
      return { name: selectedCustomChain.name, accent: selectedCustomChain.accent, symbol: selectedCustomChain.symbol };
    }
    const m = CHAIN_META[selectedBlockchain];
    return { name: m.name, accent: m.accent, symbol: m.symbol };
  }, [selectedBlockchain, selectedCustomChain]);

  const visibleTokens = useMemo(() => {
    if (filter === 'all') return tokens;
    if (typeof filter === 'string' && filter.startsWith('custom_')) {
      return tokens.filter((tok) => tok.customChainId === filter);
    }
    return tokens.filter((tok) => tok.blockchain === filter && !tok.customChainId);
  }, [tokens, filter]);

  const totalUsd = useMemo(
    () => tokens.reduce((acc, x) => acc + (x.balanceUSD || 0), 0),
    [tokens]
  );
  const change24h = useMemo(() => {
    if (totalUsd === 0) return 0;
    const weighted = tokens.reduce((acc, x) => acc + (x.balanceUSD || 0) * (x.change24h || 0), 0);
    return weighted / totalUsd;
  }, [tokens, totalUsd]);

  const onRefresh = useCallback(() => { void refreshBalances(); }, [refreshBalances]);

  const onCopyAddress = useCallback(async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2500);
  }, [walletAddress]);

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoadingBalances} onRefresh={onRefresh} tintColor={t.palette.rustox} />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable
            onPress={() => setSwitcherOpen(true)}
            hitSlop={10}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingHorizontal: 10, paddingVertical: 7,
              borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.palette.hairline,
              backgroundColor: pressed ? t.palette.elevated : t.palette.surface, marginRight: 10,
            })}
          >
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: activeChainInfo.accent }} />
            <Text variant="caption" color="textMuted" style={{ maxWidth: 70 }} numberOfLines={1}>
              {activeChainInfo.name}
            </Text>
            <Ionicons name="chevron-down" size={12} color={t.palette.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => setWalletListOpen(true)}
            hitSlop={8}
            style={({ pressed }) => ({
              flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.75 : 1,
            })}
          >
            {activeAccount && (
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: activeAccount.color + '22',
                borderWidth: 1.5, borderColor: activeAccount.color,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 11, fontFamily: 'Manrope_700Bold', color: activeAccount.color }}>
                  {activeAccount.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textMuted">
                {accounts.length > 1 ? `${accounts.length} accounts` : 'XU × RustOx'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text variant="title" numberOfLines={1} style={{ maxWidth: 120 }}>
                  {activeAccount?.name ?? 'Wallet'}
                </Text>
                <Ionicons name="chevron-down" size={13} color={t.palette.textMuted} />
              </View>
            </View>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {shortAddress && (
              <Pressable
                onPress={onCopyAddress}
                hitSlop={8}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 10, paddingVertical: 6,
                  borderRadius: t.radius.pill, borderWidth: 1,
                  borderColor: addressCopied ? t.palette.success : t.palette.hairline,
                  backgroundColor: addressCopied ? `${t.palette.success}18` : t.palette.surface,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons
                  name={addressCopied ? 'checkmark' : 'copy-outline'}
                  size={13}
                  color={addressCopied ? t.palette.success : t.palette.textMuted}
                />
                <Text variant="caption" style={{ color: addressCopied ? t.palette.success : t.palette.textMuted }}>
                  {addressCopied ? 'Copied!' : shortAddress}
                </Text>
              </Pressable>
            )}
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={{ padding: 8 }}>
              <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={22} color={t.palette.text} />
            </Pressable>
          </View>
        </View>

        {/* Balance card */}
        <BalanceCard
          totalUsd={totalUsd}
          change24h={change24h}
          hidden={hidden}
          onToggleHide={() => setHidden((h) => !h)}
          onSend={() => router.push('/send')}
          onReceive={() => router.push('/receive')}
          onSwap={() => router.push('/tabs/swap')}
          onBuy={() => router.push('/tabs/swap')}
        />

        {/* ── Market Ticker ────────────────────────────────── */}
        <MarketTicker prices={prices} />

        {/* ── Chain filter chips ──────────────────────────── */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
        >
          {BUILT_IN_CHAIN_FILTERS.map((c) => {
            const label  = c === 'all' ? 'All' : CHAIN_META[c].symbol;
            const accent = c === 'all' ? t.palette.rustox : CHAIN_META[c].accent;
            const active = filter === c;
            return (
              <Pressable
                key={c} onPress={() => setFilter(c)}
                style={({ pressed }) => ({
                  paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
                  backgroundColor: active ? accent : t.palette.surface,
                  borderWidth: 1, borderColor: active ? accent : t.palette.hairline,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text variant="bodyMedium" color={active ? 'bg' : 'text'}>{label}</Text>
              </Pressable>
            );
          })}
          {customChains.map((cc) => {
            const active = filter === cc.id;
            return (
              <Pressable
                key={cc.id} onPress={() => setFilter(cc.id)}
                style={({ pressed }) => ({
                  paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999,
                  backgroundColor: active ? cc.accent : t.palette.surface,
                  borderWidth: 1, borderColor: active ? cc.accent : t.palette.hairline,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text variant="bodyMedium" style={{ color: active ? '#0B0B0F' : t.palette.text }}>
                  {cc.symbol}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Asset list header ───────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
        }}>
          <Text style={{ flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 14, color: t.palette.textMuted, letterSpacing: 0.5 }}>
            ASSETS
          </Text>
          <Pressable
            onPress={() => setImportTokenOpen(true)}
            hitSlop={10}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.palette.hairline,
              backgroundColor: pressed ? t.palette.elevated : t.palette.surface,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 14, color: t.palette.textMuted, lineHeight: 18 }}>+</Text>
            <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 12, color: t.palette.textMuted }}>
              Import Token
            </Text>
          </Pressable>
        </View>

        {/* ── Asset list ──────────────────────────────────── */}
        <View style={{ paddingTop: 4 }}>
          {visibleTokens.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
              <Ionicons name="wallet-outline" size={36} color={t.palette.textFaint} />
              <Text variant="body" color="textMuted" style={{ textAlign: 'center' }}>
                No assets on this chain yet.
              </Text>
              <Text variant="caption" color="textFaint" style={{ textAlign: 'center' }}>
                Pull down to refresh balances.
              </Text>
              <Pressable
                onPress={() => setImportTokenOpen(true)}
                style={({ pressed }) => ({
                  marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
                  borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.palette.hairline,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text variant="bodyMedium" color="textMuted">+ Import a token</Text>
              </Pressable>
            </View>
          ) : (
            visibleTokens.map((tok) => {
              const accent = tok.customChainId
                ? (customChains.find((c) => c.id === tok.customChainId)?.accent ?? t.palette.evm)
                : CHAIN_META[tok.blockchain]?.accent ?? t.palette.evm;
              return (
                <TokenListItem
                  key={tok.id}
                  token={{
                    id: tok.id,
                    symbol: tok.symbol,
                    name: tok.name,
                    balance: tok.balance,
                    balanceUSD: tok.balanceUSD,
                    change24h: tok.change24h,
                    logo: tok.logo,
                    accent,
                  }}
                  onPress={() => {
                    if (!tok.customChainId) router.push(`/token/${tok.id}`);
                  }}
                />
              );
            })
          )}
        </View>

        {lastRefreshedAt ? (
          <Text variant="caption" color="textFaint" style={{ textAlign: 'center', marginTop: 12 }}>
            Updated {new Date(lastRefreshedAt).toLocaleTimeString()}
          </Text>
        ) : null}
      </ScrollView>

      <BlockchainSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <WalletListSheet visible={walletListOpen} onClose={() => setWalletListOpen(false)} />
      <ImportTokenSheet visible={importTokenOpen} onClose={() => setImportTokenOpen(false)} />
    </SafeAreaView>
  );
}

// ── Market ticker component ──────────────────────────────────────────────────

interface PriceInfo { usd: number; change24h: number }

function MarketTicker({ prices }: { prices: Partial<Record<string, PriceInfo>> }) {
  const t = useTheme();

  const hasPrices = MARKET_CHAINS.some((c) => {
    const cgId = CHAIN_META[c].coingeckoId;
    return !!prices[c]?.usd || !!(prices as any)[cgId]?.usd;
  });

  if (!hasPrices) return null;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 4 }}>
      <Text style={{
        fontFamily: 'InterTight_500Medium', fontSize: 10,
        color: t.palette.textFaint, letterSpacing: 0.6, marginBottom: 8,
      }}>
        MARKET
      </Text>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {MARKET_CHAINS.map((chain) => {
          // prices can be keyed by chain id or coingeckoId depending on context
          const info = (prices as any)[chain] as PriceInfo | undefined;
          if (!info?.usd) return null;
          const meta     = CHAIN_META[chain];
          const isUp     = info.change24h >= 0;
          const changeAbs = Math.abs(info.change24h).toFixed(2);

          return (
            <View
              key={chain}
              style={{
                backgroundColor: t.palette.surface,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.palette.hairline,
                paddingHorizontal: 14,
                paddingVertical: 10,
                minWidth: 110,
                gap: 4,
              }}
            >
              {/* Symbol + chain dot */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: meta.accent }} />
                <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 13, color: t.palette.text }}>
                  {meta.symbol}
                </Text>
              </View>

              {/* Price */}
              <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 15, color: t.palette.text }}>
                ${info.usd >= 1000
                  ? info.usd.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : info.usd >= 1
                  ? info.usd.toFixed(2)
                  : info.usd.toFixed(4)
                }
              </Text>

              {/* 24h change */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons
                  name={isUp ? 'caret-up' : 'caret-down'}
                  size={10}
                  color={isUp ? t.palette.success : t.palette.danger}
                />
                <Text style={{
                  fontFamily: 'InterTight_600SemiBold',
                  fontSize: 11,
                  color: isUp ? t.palette.success : t.palette.danger,
                }}>
                  {changeAbs}%
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
