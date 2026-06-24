// app/send/index.tsx — Modernised Send screen
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View, ScrollView, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../mobile/theme/primitives/Text';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { useWallet } from '../../context/WalletContext';
import { getGasPrice, CHAIN_META } from '../../mobile/services/chainService';
import type { Chain } from '../../mobile/services/chainService';
import * as Clipboard from 'expo-clipboard';

const CHAINS: Chain[] = ['rustox', 'ethereum', 'bnb', 'polygon', 'solana'];
type GasTier = 'slow' | 'normal' | 'fast';

const GAS_MULTIPLIERS: Record<GasTier, number> = { slow: 0.8, normal: 1.0, fast: 1.4 };

export default function Send() {
  const t = useTheme();
  const router = useRouter();
  const { walletAddresses, tokens, network, prices, selectedBlockchain } = useWallet();

  const [chain, setChain] = useState<Chain>(selectedBlockchain ?? 'rustox');
  const [amount, setAmount] = useState('');
  const [to, setTo] = useState('');
  const [gasTier, setGasTier] = useState<GasTier>('normal');
  const [gas, setGas] = useState<{ baseFee: number; priority: number } | null>(null);
  const [gasLoading, setGasLoading] = useState(false);
  const [toError, setToError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [pasteLoading, setPasteLoading] = useState(false);

  const meta = CHAIN_META[chain];
  const isSolana = chain === 'solana';
  const nativeToken = tokens.find((x) => x.blockchain === chain && !x.contractAddress);
  const nativeBal = nativeToken?.balance ?? 0;
  const nativePrice = prices[chain]?.usd ?? 0;

  // Imported ERC-20 tokens on this chain
  const chainTokens = useMemo(
    () => tokens.filter((x) => x.blockchain === chain && !!x.contractAddress),
    [tokens, chain]
  );

  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  useEffect(() => { setSelectedTokenId(''); }, [chain]);

  const selectedToken = selectedTokenId
    ? tokens.find((x) => x.id === selectedTokenId)
    : null;

  const displayBalance = selectedToken ? selectedToken.balance : nativeBal;
  const displaySymbol = selectedToken ? selectedToken.symbol : meta.symbol;
  const displayPrice = selectedToken ? 0 : nativePrice; // token USD price TBD

  const amountNum = parseFloat(amount) || 0;
  const amountUsd = amountNum * displayPrice;

  // Gas fetch
  useEffect(() => {
    if (isSolana) { setGas(null); return; }
    setGasLoading(true);
    let cancelled = false;
    getGasPrice(chain, network)
      .then((g) => { if (!cancelled) setGas(g); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGasLoading(false); });
    return () => { cancelled = true; };
  }, [chain, network, isSolana]);

  const gasGwei = useMemo(() => {
    if (!gas) return null;
    const base = (gas.baseFee + gas.priority) * GAS_MULTIPLIERS[gasTier];
    return base;
  }, [gas, gasTier]);

  const estimatedGasCost = useMemo(() => {
    if (!gasGwei || isSolana) return null;
    // 21000 gas units for a simple transfer
    const costEth = (gasGwei * 21000) / 1e9;
    return costEth;
  }, [gasGwei, isSolana]);

  // Validation
  const validateAddress = useCallback((v: string) => {
    if (!v) { setToError(''); return; }
    if (isSolana) {
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v.trim())) {
        setToError('Invalid Solana address');
      } else setToError('');
    } else {
      if (!/^0x[0-9a-fA-F]{40}$/.test(v.trim())) {
        setToError('Invalid EVM address (must start with 0x)');
      } else setToError('');
    }
  }, [isSolana]);

  const validateAmount = useCallback((v: string) => {
    const n = parseFloat(v);
    if (!v) { setAmountError(''); return; }
    if (isNaN(n) || n <= 0) { setAmountError('Enter a valid amount'); return; }
    if (n > displayBalance) { setAmountError('Insufficient balance'); return; }
    setAmountError('');
  }, [displayBalance]);

  const handlePaste = useCallback(async () => {
    setPasteLoading(true);
    try {
      const clip = await Clipboard.getStringAsync();
      if (clip) { setTo(clip.trim()); validateAddress(clip.trim()); }
    } finally { setPasteLoading(false); }
  }, [validateAddress]);

  const handleMaxAmount = useCallback(() => {
    const maxVal = estimatedGasCost && !selectedToken
      ? Math.max(0, displayBalance - estimatedGasCost * 1.2)
      : displayBalance;
    setAmount(maxVal.toFixed(8).replace(/\.?0+$/, ''));
    validateAmount(String(maxVal));
  }, [displayBalance, estimatedGasCost, selectedToken, validateAmount]);

  const isValid = to.length > 0 && !toError && amount.length > 0 && !amountError && amountNum > 0;

  const fromAddr = walletAddresses?.[chain] ?? '';
  const shortFrom = fromAddr ? `${fromAddr.slice(0, 6)}…${fromAddr.slice(-4)}` : '—';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 18, color: t.palette.text }}>Send</Text>
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: t.palette.textFaint }}>
              from {shortFrom}
            </Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

          {/* ── Chain selector ─────────────────────────────── */}
          <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textMuted, letterSpacing: 0.6, marginBottom: 10 }}>
            NETWORK
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
            {CHAINS.map((c) => {
              const cm = CHAIN_META[c];
              const active = c === chain;
              return (
                <Pressable
                  key={c}
                  onPress={() => setChain(c)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 7,
                    paddingHorizontal: 14, paddingVertical: 10,
                    borderRadius: t.radius.pill,
                    backgroundColor: active ? cm.accent + '18' : t.palette.surface,
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? cm.accent : t.palette.hairline,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: cm.accent }} />
                  <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: active ? cm.accent : t.palette.textMuted }}>
                    {cm.symbol}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Token selector (if imported ERC-20s exist) ── */}
          {chainTokens.length > 0 && (
            <>
              <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textMuted, letterSpacing: 0.6, marginBottom: 10 }}>
                ASSET
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                {[{ id: '', symbol: meta.symbol, name: meta.name }, ...chainTokens].map((tok) => {
                  const active = selectedTokenId === tok.id;
                  return (
                    <Pressable
                      key={tok.id || 'native'}
                      onPress={() => setSelectedTokenId(tok.id)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14, paddingVertical: 10,
                        borderRadius: t.radius.pill,
                        backgroundColor: active ? t.palette.rustoxSoft : t.palette.surface,
                        borderWidth: active ? 1.5 : 1,
                        borderColor: active ? t.palette.rustox : t.palette.hairline,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: active ? t.palette.rustox : t.palette.textMuted }}>
                        {tok.symbol}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* ── Recipient ────────────────────────────────── */}
          <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textMuted, letterSpacing: 0.6, marginBottom: 10 }}>
            RECIPIENT
          </Text>
          <View style={{
            backgroundColor: t.palette.surface,
            borderRadius: t.radius.lg,
            borderWidth: toError ? 1.5 : 1,
            borderColor: toError ? t.palette.danger : t.palette.hairline,
            padding: 16, marginBottom: 6,
          }}>
            <TextInput
              value={to}
              onChangeText={(v) => { setTo(v); validateAddress(v); }}
              placeholder={isSolana ? 'Solana address (base58)' : '0x… EVM address'}
              placeholderTextColor={t.palette.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                color: t.palette.text,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                minHeight: 48,
              }}
              multiline
            />
            <Pressable
              onPress={handlePaste}
              style={({ pressed }) => ({
                alignSelf: 'flex-end', marginTop: 8,
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 10, paddingVertical: 5,
                borderRadius: t.radius.pill,
                backgroundColor: pressed ? t.palette.elevated : t.palette.bg,
                borderWidth: 1, borderColor: t.palette.hairline,
              })}
            >
              {pasteLoading
                ? <ActivityIndicator size="small" color={t.palette.textMuted} />
                : <Ionicons name="clipboard-outline" size={13} color={t.palette.textMuted} />}
              <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 12, color: t.palette.textMuted }}>Paste</Text>
            </Pressable>
          </View>
          {toError ? (
            <Text style={{ color: t.palette.danger, fontFamily: 'InterTight_400Regular', fontSize: 12, marginBottom: 16 }}>
              {toError}
            </Text>
          ) : <View style={{ height: 16 }} />}

          {/* ── Amount card ──────────────────────────────── */}
          <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textMuted, letterSpacing: 0.6, marginBottom: 10 }}>
            AMOUNT
          </Text>
          <View style={{
            backgroundColor: t.palette.surface,
            borderRadius: t.radius.lg,
            borderWidth: amountError ? 1.5 : 1,
            borderColor: amountError ? t.palette.danger : t.palette.hairline,
            padding: 20, marginBottom: 6,
          }}>
            {/* Big number input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TextInput
                value={amount}
                onChangeText={(v) => { setAmount(v); validateAmount(v); }}
                placeholder="0"
                placeholderTextColor={t.palette.textFaint}
                keyboardType="decimal-pad"
                style={{
                  flex: 1,
                  color: t.palette.text,
                  fontFamily: 'Manrope_700Bold',
                  fontSize: 36,
                  letterSpacing: -1,
                }}
              />
              <View style={{
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: t.radius.pill,
                backgroundColor: t.palette.elevated,
                borderWidth: 1, borderColor: t.palette.hairline,
              }}>
                <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 15, color: t.palette.text }}>
                  {displaySymbol}
                </Text>
              </View>
            </View>

            {/* USD equivalent */}
            {displayPrice > 0 && amountNum > 0 && (
              <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted, marginTop: 4 }}>
                ≈ ${amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
              </Text>
            )}

            {/* Balance row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.palette.hairline }}>
              <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 12, color: t.palette.textFaint }}>
                Balance: {displayBalance.toFixed(isSolana ? 6 : 4)} {displaySymbol}
                {displayPrice > 0 ? ` · $${(displayBalance * displayPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''}
              </Text>
              <Pressable
                onPress={handleMaxAmount}
                style={({ pressed }) => ({
                  paddingHorizontal: 10, paddingVertical: 4,
                  borderRadius: t.radius.pill,
                  backgroundColor: pressed ? t.palette.rustoxSoft : t.palette.elevated,
                  borderWidth: 1, borderColor: t.palette.rustox + '60',
                })}
              >
                <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 11, color: t.palette.rustox }}>MAX</Text>
              </Pressable>
            </View>
          </View>
          {amountError ? (
            <Text style={{ color: t.palette.danger, fontFamily: 'InterTight_400Regular', fontSize: 12, marginBottom: 16 }}>
              {amountError}
            </Text>
          ) : <View style={{ height: 16 }} />}

          {/* ── Gas / fee card ───────────────────────────── */}
          {!isSolana ? (
            <>
              <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textMuted, letterSpacing: 0.6, marginBottom: 10 }}>
                NETWORK FEE
              </Text>
              <View style={{
                backgroundColor: t.palette.surface,
                borderRadius: t.radius.lg,
                borderWidth: 1,
                borderColor: t.palette.hairline,
                overflow: 'hidden',
                marginBottom: 20,
              }}>
                {/* Tier selector */}
                <View style={{ flexDirection: 'row' }}>
                  {(['slow', 'normal', 'fast'] as GasTier[]).map((tier) => {
                    const active = gasTier === tier;
                    const labels = { slow: '🐢 Slow', normal: '⚡ Normal', fast: '🚀 Fast' };
                    const colors = { slow: t.palette.textMuted, normal: t.palette.evm, fast: t.palette.rustox };
                    return (
                      <Pressable
                        key={tier}
                        onPress={() => setGasTier(tier)}
                        style={({ pressed }) => ({
                          flex: 1,
                          paddingVertical: 14,
                          alignItems: 'center',
                          backgroundColor: active ? colors[tier] + '18' : 'transparent',
                          borderBottomWidth: active ? 2 : 0,
                          borderBottomColor: colors[tier],
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: active ? colors[tier] : t.palette.textMuted }}>
                          {labels[tier]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Fee details */}
                <View style={{ padding: 16, gap: 8 }}>
                  {gasLoading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color={t.palette.textMuted} />
                      <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted }}>
                        Fetching gas price…
                      </Text>
                    </View>
                  ) : gas ? (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted }}>Gas price</Text>
                        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: t.palette.text }}>
                          {gasGwei?.toFixed(2)} gwei
                        </Text>
                      </View>
                      {estimatedGasCost && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted }}>Estimated fee</Text>
                          <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: t.palette.text }}>
                            ~{estimatedGasCost.toFixed(6)} {meta.symbol}
                            {nativePrice > 0 ? ` · $${(estimatedGasCost * nativePrice).toFixed(4)}` : ''}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted }}>
                      Gas price unavailable
                    </Text>
                  )}
                </View>
              </View>
            </>
          ) : (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: t.palette.solanaSoft,
              borderRadius: t.radius.md,
              borderWidth: 1, borderColor: t.palette.solana + '40',
              padding: 14, marginBottom: 20,
            }}>
              <Ionicons name="checkmark-circle" size={16} color={t.palette.solana} />
              <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted, flex: 1 }}>
                Solana transaction fee: ~0.000005 SOL (≈$0.001)
              </Text>
            </View>
          )}

          {/* ── Summary card ─────────────────────────────── */}
          {isValid && (
            <View style={{
              backgroundColor: t.palette.elevated,
              borderRadius: t.radius.lg,
              borderWidth: 1,
              borderColor: meta.accent + '40',
              padding: 16,
              marginBottom: 20,
              gap: 10,
            }}>
              <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textMuted, letterSpacing: 0.6 }}>
                TRANSACTION SUMMARY
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 14, color: t.palette.textMuted }}>Sending</Text>
                <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 14, color: t.palette.text }}>
                  {amount} {displaySymbol}
                  {displayPrice > 0 ? ` ($${amountUsd.toFixed(2)})` : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 14, color: t.palette.textMuted }}>Network</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: meta.accent }} />
                  <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: meta.accent }}>
                    {meta.name}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 14, color: t.palette.textMuted }}>To</Text>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 12, color: t.palette.text }}>
                  {to.slice(0, 8)}…{to.slice(-6)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── CTA ──────────────────────────────────────── */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
          backgroundColor: t.palette.bg,
          borderTopWidth: 1, borderTopColor: t.palette.hairline,
        }}>
          <Pressable
            onPress={() => {/* TODO: broadcast tx */}}
            disabled={!isValid}
            style={({ pressed }) => ({
              backgroundColor: isValid ? meta.accent : t.palette.hairline,
              borderRadius: t.radius.md,
              paddingVertical: 18,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="send" size={18} color={isValid ? '#fff' : t.palette.textFaint} />
            <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 17, color: isValid ? '#fff' : t.palette.textFaint }}>
              Review & Send
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
