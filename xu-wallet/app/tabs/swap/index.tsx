// app/tabs/swap/index.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../mobile/theme/primitives/Text';
import { Button } from '../../../mobile/theme/primitives/Pressable';
import { useTheme } from '../../../mobile/theme/ThemeProvider';
import { useWallet } from '../../../context/WalletContext';
import { ChainChip } from '../../../components/ChainChip';
import { tokensForChain } from '../../../mobile/services/tokenRegistry';
import { getSwapQuote, SwapQuote } from '../../../mobile/services/swapService';
import type { Chain } from '../../../mobile/services/chainService';

// Swap only supports EVM chains (1inch / ParaSwap don't support Solana)
const CHAINS: Chain[] = ['rustox', 'ethereum', 'bnb', 'polygon'];

/**
 * Safely convert a decimal amount string to the smallest-unit integer string
 * without floating-point precision loss.
 *
 * We split the amount at the decimal point and work with strings so we never
 * run through Number arithmetic on values > Number.MAX_SAFE_INTEGER.
 */
function toBaseUnits(amount: string, decimals: number): string {
  const [intPart, fracPart = ''] = amount.split('.');
  // Pad or truncate the fractional part to `decimals` digits
  const frac = fracPart.padEnd(decimals, '0').slice(0, decimals);
  const combined = (intPart + frac).replace(/^0+/, '') || '0';
  return BigInt(combined).toString();
}

export default function Swap() {
  const t = useTheme();
  const router = useRouter();
  const { walletAddresses, refreshBalances } = useWallet();
  const [chain, setChain] = useState<Chain>('rustox');
  const tokenList = tokensForChain(chain);
  const [from, setFrom] = useState(tokenList[0]?.id ?? '');
  const [to, setTo] = useState(tokenList[1]?.id ?? tokenList[0]?.id ?? '');
  const [amount, setAmount] = useState('1');
  const [slippage, setSlippage] = useState(0.5);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setFrom(tokenList[0]?.id ?? '');
    setTo(tokenList[1]?.id ?? tokenList[0]?.id ?? '');
    setQuote(null);
  }, [chain]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!amount || !from || !to || !walletAddresses) return;
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return;
      setLoading(true);
      setErr(null);
      try {
        const fromEntry = tokenList.find((t) => t.id === from);
        const toEntry = tokenList.find((t) => t.id === to);
        if (!fromEntry || !toEntry) return;

        // Use string-based conversion to avoid IEEE-754 precision loss for high-decimal tokens.
        const baseAmount = toBaseUnits(amount, fromEntry.decimals);

        const q = await getSwapQuote({
          chain: chain as any,
          fromToken: fromEntry.contractAddress ?? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          toToken: toEntry.contractAddress ?? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          amount: baseAmount,
          fromAddress: walletAddresses[chain] ?? '',
          slippage,
          // Pass actual decimals so the aggregator quote is correct for non-18-decimal tokens (USDC etc.)
          srcDecimals: fromEntry.decimals,
          destDecimals: toEntry.decimals,
        });
        if (!cancelled) setQuote(q);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Failed to fetch quote');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [chain, from, to, amount, slippage, walletAddresses, tokenList]);

  function flip() {
    const a = from;
    setFrom(to);
    setTo(a);
    setQuote(null);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text variant="title">Swap</Text>
        <Text variant="caption" color="textMuted">Best price across 1inch and ParaSwap</Text>

        {/* chain selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 12 }}
        >
          {CHAINS.map((c) => (
            <ChainChip key={c} chain={c} active={c === chain} onPress={() => setChain(c)} />
          ))}
        </ScrollView>

        {/* from */}
        <Card>
          <Text variant="caption" color="textMuted">From</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={t.palette.textFaint}
              style={{
                flex: 1,
                color: t.palette.text,
                fontSize: 28,
                fontWeight: '600',
              }}
            />
            <TokenPicker
              selected={from}
              onSelect={setFrom}
              tokens={tokenList}
            />
          </View>
        </Card>

        {/* swap icon */}
        <View style={{ alignItems: 'center', marginVertical: -8 }}>
          <Pressable
            onPress={flip}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: t.palette.elevated,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              alignItems: 'center',
              justifyContent: 'center',
              transform: pressed ? [{ scale: 0.9 }] : undefined,
            })}
          >
            <Ionicons name="swap-vertical" size={20} color={t.palette.rustox} />
          </Pressable>
        </View>

        {/* to */}
        <Card>
          <Text variant="caption" color="textMuted">To (estimated)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <TextInput
              value={
                quote
                  ? (Number(quote.toAmount) /
                      10 ** (tokenList.find((tt) => tt.id === to)?.decimals ?? 18)
                    ).toFixed(6)
                  : '0.0'
              }
              editable={false}
              style={{ flex: 1, color: t.palette.text, fontSize: 28, fontWeight: '600' }}
              placeholderTextColor={t.palette.textFaint}
            />
            <TokenPicker selected={to} onSelect={setTo} tokens={tokenList} />
          </View>
        </Card>

        {/* settings */}
        <Card style={{ marginTop: 16 }}>
          <Text variant="caption" color="textMuted">Slippage tolerance</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {[0.1, 0.5, 1, 3].map((p) => (
              <Pressable
                key={p}
                onPress={() => setSlippage(p)}
                style={({ pressed }) => ({
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: t.radius.pill,
                  borderWidth: 1,
                  borderColor: slippage === p ? t.palette.rustox : t.palette.hairline,
                  backgroundColor: slippage === p ? t.palette.rustoxSoft : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text variant="bodyMedium" color={slippage === p ? 'rustox' : 'textMuted'}>
                  {p}%
                </Text>
              </Pressable>
            ))}
          </View>
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <ActivityIndicator color={t.palette.rustox} />
              <Text variant="caption" color="textMuted">Fetching quote…</Text>
            </View>
          ) : null}
          {quote ? (
            <View style={{ marginTop: 12 }}>
              <Row label="Source" value={quote.source} />
              <Row label="Estimated gas" value={`${quote.estimatedGas.toLocaleString()} units`} />
            </View>
          ) : null}
          {err ? (
            <Text variant="caption" color="danger" style={{ marginTop: 8 }}>{err}</Text>
          ) : null}
        </Card>

        <View style={{ marginTop: 24 }}>
          <Button
            title={quote ? `Swap via ${quote.source}` : 'Quote pending'}
            disabled={!quote || loading}
            onPress={() => {
              router.push('/send');
              void refreshBalances();
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.palette.surface,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.palette.hairline,
        padding: 16,
        marginTop: 12,
        ...style,
      }}
    >
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

function TokenPicker({
  selected,
  onSelect,
  tokens,
}: {
  selected: string;
  onSelect: (id: string) => void;
  tokens: ReturnType<typeof tokensForChain>;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const entry = tokens.find((x) => x.id === selected);
  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: t.radius.pill,
          backgroundColor: t.palette.elevated,
          borderWidth: 1,
          borderColor: t.palette.hairline,
        }}
      >
        <Text variant="bodyMedium" color="text">{entry?.symbol ?? '—'}</Text>
        <Ionicons name="chevron-down" size={14} color={t.palette.textMuted} />
      </Pressable>
      {open ? (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 48,
            backgroundColor: t.palette.elevated,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.palette.hairline,
            padding: 6,
            minWidth: 160,
            zIndex: 10,
          }}
        >
          {tokens.map((tok) => (
            <Pressable
              key={tok.id}
              onPress={() => {
                onSelect(tok.id);
                setOpen(false);
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: pressed ? t.palette.surface : 'transparent',
              })}
            >
              <Text variant="bodyMedium" color="text">{tok.symbol}</Text>
              <Text variant="caption" color="textMuted">{tok.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
