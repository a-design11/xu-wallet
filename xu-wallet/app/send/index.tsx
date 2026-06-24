// app/send/index.tsx
import React, { useMemo, useState } from 'react';
import { View, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../mobile/theme/primitives/Text';
import { Button } from '../../mobile/theme/primitives/Pressable';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { useWallet } from '../../context/WalletContext';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ChainChip } from '../../components/ChainChip';
import { tokensForChain } from '../../mobile/services/tokenRegistry';
import { getGasPrice, CHAIN_META } from '../../mobile/services/chainService';
import type { Chain } from '../../mobile/services/chainService';

// Solana included — was missing before.
const CHAINS: Chain[] = ['rustox', 'ethereum', 'bnb', 'polygon', 'solana'];

export default function Send() {
  const t = useTheme();
  const router = useRouter();
  const { walletAddresses, tokens, network } = useWallet();
  const [chain, setChain] = useState<Chain>('rustox');
  const list = useMemo(() => tokensForChain(chain).filter((x) => !x.isNative), [chain]);
  const native = tokens.find((x) => x.blockchain === chain && !x.contractAddress);
  const [tokenId, setTokenId] = useState(list[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [to, setTo] = useState('');
  const [gas, setGas] = useState<{ baseFee: number; priority: number } | null>(null);
  const isSolana = chain === 'solana';
  const meta = CHAIN_META[chain];

  React.useEffect(() => {
    setTokenId(list[0]?.id ?? '');
    setGas(null);
  }, [chain]);

  React.useEffect(() => {
    if (isSolana) return; // No EVM gas on Solana
    let cancelled = false;
    (async () => {
      const g = await getGasPrice(chain, network);
      if (!cancelled) setGas(g);
    })();
    return () => {
      cancelled = true;
    };
  }, [chain, network, isSolana]);

  const token = list.find((x) => x.id === tokenId);
  const balanceToken = tokens.find((x) => x.id === tokenId);
  const valid = to.length >= 10 && Number(amount) > 0;

  // Validate address format per chain
  const addressHint = isSolana
    ? 'Base58 Solana address'
    : '0x… EVM address';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScreenHeader
        title="Send"
        subtitle={`From ${walletAddresses?.[chain]?.slice(0, 8) ?? '—'}…`}
      />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CHAINS.map((c) => (
            <ChainChip key={c} chain={c} active={c === chain} onPress={() => setChain(c)} />
          ))}
        </ScrollView>

        {/* recipient */}
        <View
          style={{
            backgroundColor: t.palette.surface,
            borderRadius: t.radius.lg,
            borderWidth: 1,
            borderColor: t.palette.hairline,
            padding: 14,
            marginTop: 16,
          }}
        >
          <Text variant="caption" color="textMuted">Recipient address</Text>
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder={addressHint}
            placeholderTextColor={t.palette.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              color: t.palette.text,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 14,
              paddingTop: 6,
            }}
          />
        </View>

        {/* token selector when chain has ERC-20 tokens */}
        {list.length > 0 && !isSolana ? (
          <View
            style={{
              backgroundColor: t.palette.surface,
              borderRadius: t.radius.lg,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              padding: 14,
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <Text variant="caption" color="textMuted" style={{ width: '100%' }}>Token</Text>
            {[{ id: '', symbol: meta.symbol, name: `${meta.name} (native)` }, ...list].map((tok) => (
              <Pressable
                key={tok.id}
                onPress={() => setTokenId(tok.id)}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: t.radius.pill,
                  borderWidth: 1,
                  borderColor: tokenId === tok.id ? t.palette.rustox : t.palette.hairline,
                  backgroundColor: tokenId === tok.id ? t.palette.rustoxSoft : 'transparent',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text variant="bodyMedium" color={tokenId === tok.id ? 'rustox' : 'textMuted'}>
                  {tok.symbol}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* amount */}
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" color="textMuted">Amount</Text>
            <Pressable
              onPress={() => balanceToken && setAmount(String(balanceToken.balance))}
              hitSlop={8}
            >
              <Text variant="caption" color="textMuted">
                Balance: {native ? native.balance.toFixed(isSolana ? 6 : 4) : '0'} {meta.symbol}
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.0"
              placeholderTextColor={t.palette.textFaint}
              keyboardType="decimal-pad"
              style={{ flex: 1, color: t.palette.text, fontSize: 28, fontWeight: '600' }}
            />
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: t.radius.pill,
                backgroundColor: t.palette.elevated,
                borderWidth: 1,
                borderColor: t.palette.hairline,
              }}
            >
              <Text variant="bodyMedium">{isSolana ? 'SOL' : token?.symbol ?? meta.symbol}</Text>
            </View>
          </View>
        </View>

        {/* gas / fee */}
        {!isSolana ? (
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
            <Text variant="caption" color="textMuted">Network fee</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {['Slow', 'Normal', 'Fast'].map((g, i) => (
                <View
                  key={g}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: t.radius.md,
                    backgroundColor: i === 1 ? t.palette.rustoxSoft : t.palette.bg,
                    borderWidth: 1,
                    borderColor: i === 1 ? t.palette.rustox : t.palette.hairline,
                    alignItems: 'center',
                  }}
                >
                  <Text variant="bodyMedium" color={i === 1 ? 'rustox' : 'text'}>{g}</Text>
                  {gas ? (
                    <Text variant="caption" color={i === 1 ? 'rustox' : 'textMuted'}>
                      {(((gas.baseFee + gas.priority) * (i + 1)) / 3).toFixed(2)} gwei
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
            {native ? (
              <Text variant="caption" color="textMuted" style={{ marginTop: 8 }}>
                Gas paid in {native.symbol}
              </Text>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              backgroundColor: t.palette.surface,
              borderRadius: t.radius.lg,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              padding: 14,
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="information-circle-outline" size={16} color={t.palette.textMuted} />
            <Text variant="caption" color="textMuted">
              Solana transaction fee ~0.000005 SOL
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <Button title="Review & sign" disabled={!valid} onPress={() => router.push('/tabs/home')} />
      </View>
    </SafeAreaView>
  );
}
