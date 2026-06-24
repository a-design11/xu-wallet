// components/ImportTokenSheet.tsx
// Chain-isolated token import modal.
//
// Design guarantee: the chain is locked to whatever the user has selected
// before opening. An Ethereum token import NEVER touches BNB/Polygon/Solana
// storage — each chain's token list is strictly isolated.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  TextInput,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../mobile/theme/primitives/Text';
import { useTheme } from '../mobile/theme/ThemeProvider';
import { useWallet } from '../context/WalletContext';
import { getErc20Meta, CHAIN_META } from '../mobile/services/chainService';
import type { Chain, Network } from '../mobile/services/chainService';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = Math.min(SCREEN_H * 0.82, 600);

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Stage = 'input' | 'preview' | 'done';

interface TokenMeta {
  symbol: string;
  name: string;
  decimals: number;
}

function isEvmAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

function isSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());
}

const CHAIN_LABELS: Record<Chain, string> = {
  rustox: 'RustOx',
  ethereum: 'Ethereum',
  bnb: 'BNB Chain',
  polygon: 'Polygon',
  solana: 'Solana',
};

export function ImportTokenSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const {
    selectedBlockchain,
    selectedCustomChain,
    network,
    importTokenRecord,
    isTokenImported,
  } = useWallet();

  // Lock the chain at open time — prevents accidental cross-chain imports
  const [lockedChain, setLockedChain] = useState<Chain>('ethereum');

  const slideY = useRef(new Animated.Value(SHEET_H)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  const [stage, setStage] = useState<Stage>('input');
  const [contractAddr, setContractAddr] = useState('');
  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    if (visible) {
      // Snapshot the chain at open time
      const chain = selectedCustomChain ? 'ethereum' : selectedBlockchain;
      setLockedChain(chain as Chain);
      setMounted(true);
      setStage('input');
      setContractAddr('');
      setTokenMeta(null);
      setFetchError('');
      setImportError('');
      Animated.parallel([
        Animated.timing(slideY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: SHEET_H, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const close = useCallback(() => { onClose(); }, [onClose]);

  const handleLookup = useCallback(async () => {
    const addr = contractAddr.trim();
    setFetchError('');
    setTokenMeta(null);

    if (lockedChain === 'solana') {
      // Solana SPL: validate address format and show placeholder meta
      if (!isSolanaAddress(addr)) {
        setFetchError('Enter a valid Solana mint address (base58, 32-44 chars).');
        return;
      }
      // SPL token metadata lookup requires Metaplex — show a manual entry form
      setTokenMeta({ symbol: 'SPL', name: 'Solana SPL Token', decimals: 9 });
      setStage('preview');
      return;
    }

    if (!isEvmAddress(addr)) {
      setFetchError(`Enter a valid ${CHAIN_LABELS[lockedChain]} contract address (0x…).`);
      return;
    }

    if (isTokenImported(lockedChain, addr)) {
      setFetchError('This token is already imported on this chain.');
      return;
    }

    setFetching(true);
    try {
      const meta = await getErc20Meta(lockedChain, addr, network as Network);
      if (!meta) {
        setFetchError('Could not fetch token info. Check the address and try again.');
        return;
      }
      setTokenMeta(meta);
      setStage('preview');
    } catch (e: any) {
      setFetchError(e?.message ?? 'Failed to fetch token info.');
    } finally {
      setFetching(false);
    }
  }, [contractAddr, lockedChain, network, isTokenImported]);

  const handleImport = useCallback(async () => {
    if (!tokenMeta) return;
    setImporting(true);
    setImportError('');
    try {
      await importTokenRecord({
        chain: lockedChain,
        contractAddress: contractAddr.trim(),
        symbol: tokenMeta.symbol,
        name: tokenMeta.name,
        decimals: tokenMeta.decimals,
      });
      setStage('done');
    } catch (e: any) {
      setImportError(e?.message ?? 'Failed to import token.');
    } finally {
      setImporting(false);
    }
  }, [tokenMeta, lockedChain, contractAddr, importTokenRecord]);

  if (!mounted) return null;

  const chainMeta = CHAIN_META[lockedChain];
  const accent = chainMeta?.accent ?? t.palette.rustox;
  const chainLabel = CHAIN_LABELS[lockedChain] ?? lockedChain;
  const isSolana = lockedChain === 'solana';

  const inputStyle = {
    backgroundColor: t.palette.elevated,
    borderWidth: 1,
    borderColor: t.palette.hairline,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: t.palette.text,
    fontFamily: 'JetBrainsMono_400Regular' as const,
    fontSize: 13,
    marginBottom: 12,
  };

  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={close}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', opacity: overlayOpacity }} />
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={close} />
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SHEET_H,
          backgroundColor: t.palette.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          transform: [{ translateY: slideY }],
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: t.palette.hairline }} />
        </View>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingVertical: 12,
          borderBottomWidth: 1, borderBottomColor: t.palette.hairline,
        }}>
          {stage !== 'input' && stage !== 'done' && (
            <Pressable onPress={() => setStage('input')} hitSlop={10} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 18, color: t.palette.textMuted }}>←</Text>
            </Pressable>
          )}
          <Text style={{ flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 17, color: t.palette.text }}>
            Import Token
          </Text>
          <Pressable onPress={close} hitSlop={10}>
            <Text style={{ fontSize: 20, color: t.palette.textMuted }}>✕</Text>
          </Pressable>
        </View>

        {/* ── Chain lock indicator ────────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: accent + '12',
          borderBottomWidth: 1,
          borderBottomColor: accent + '30',
          gap: 10,
        }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
          <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 13, color: accent }}>
            {chainLabel}
          </Text>
          <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 12, color: t.palette.textFaint, flex: 1 }}>
            · This token will only appear on {chainLabel}
          </Text>
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: accent + '22' }}>
            <Text style={{ fontSize: 9, fontFamily: 'InterTight_600SemiBold', color: accent, letterSpacing: 0.6 }}>
              LOCKED
            </Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* ── INPUT STAGE ──────────────────────────────────────── */}
          {stage === 'input' && (
            <>
              <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 13, color: t.palette.textMuted, marginBottom: 8 }}>
                {isSolana ? 'Token Mint Address' : 'Contract Address'}
              </Text>
              <TextInput
                style={inputStyle}
                placeholder={isSolana ? 'Base58 mint address…' : '0x…'}
                placeholderTextColor={t.palette.textFaint}
                value={contractAddr}
                onChangeText={(v) => { setContractAddr(v); setFetchError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleLookup}
              />

              {isSolana && (
                <View style={{ backgroundColor: t.palette.elevated, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 12, color: t.palette.textMuted, lineHeight: 18 }}>
                    Enter a Solana SPL token mint address. Full metadata lookup for SPL tokens is coming in a future update.
                  </Text>
                </View>
              )}

              {fetchError ? (
                <Text style={{ color: t.palette.danger, fontFamily: 'InterTight_400Regular', fontSize: 13, marginBottom: 12 }}>
                  {fetchError}
                </Text>
              ) : null}

              <Pressable
                onPress={handleLookup}
                disabled={fetching || !contractAddr.trim()}
                style={({ pressed }) => ({
                  backgroundColor: (!contractAddr.trim() || fetching) ? t.palette.hairline : accent,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center' as const,
                  flexDirection: 'row' as const,
                  justifyContent: 'center' as const,
                  gap: 10,
                  opacity: pressed ? 0.85 : 1,
                  marginTop: 4,
                })}
              >
                {fetching && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 }}>
                  {fetching ? 'Looking up…' : 'Look Up Token'}
                </Text>
              </Pressable>
            </>
          )}

          {/* ── PREVIEW STAGE ─────────────────────────────────────── */}
          {stage === 'preview' && tokenMeta && (
            <>
              <View style={{
                backgroundColor: t.palette.elevated,
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: accent + '30',
              }}>
                {/* Token avatar */}
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: accent + '22',
                  borderWidth: 2,
                  borderColor: accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 18, color: accent }}>
                    {tokenMeta.symbol.slice(0, 2)}
                  </Text>
                </View>

                <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 22, color: t.palette.text, marginBottom: 4 }}>
                  {tokenMeta.symbol}
                </Text>
                <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 15, color: t.palette.textMuted, marginBottom: 12 }}>
                  {tokenMeta.name}
                </Text>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: t.palette.surface, borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textFaint, marginBottom: 4 }}>
                      DECIMALS
                    </Text>
                    <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 17, color: t.palette.text }}>
                      {tokenMeta.decimals}
                    </Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: t.palette.surface, borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textFaint, marginBottom: 4 }}>
                      NETWORK
                    </Text>
                    <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 14, color: accent }}>
                      {chainLabel}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12, backgroundColor: t.palette.surface, borderRadius: 10, padding: 12 }}>
                  <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textFaint, marginBottom: 4 }}>
                    CONTRACT
                  </Text>
                  <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: t.palette.textMuted }} numberOfLines={2}>
                    {contractAddr.trim()}
                  </Text>
                </View>
              </View>

              <View style={{ backgroundColor: accent + '12', borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', gap: 10 }}>
                <Text style={{ fontSize: 16 }}>🔒</Text>
                <Text style={{ flex: 1, fontFamily: 'InterTight_400Regular', fontSize: 12, color: t.palette.textMuted, lineHeight: 18 }}>
                  This token will be imported exclusively on {chainLabel}. It will not appear on any other chain.
                </Text>
              </View>

              {importError ? (
                <Text style={{ color: t.palette.danger, fontFamily: 'InterTight_400Regular', fontSize: 13, marginBottom: 12 }}>
                  {importError}
                </Text>
              ) : null}

              <Pressable
                onPress={handleImport}
                disabled={importing}
                style={({ pressed }) => ({
                  backgroundColor: importing ? t.palette.hairline : accent,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center' as const,
                  flexDirection: 'row' as const,
                  justifyContent: 'center' as const,
                  gap: 10,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {importing && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 }}>
                  {importing ? 'Importing…' : `Import ${tokenMeta.symbol}`}
                </Text>
              </Pressable>
            </>
          )}

          {/* ── DONE STAGE ────────────────────────────────────────── */}
          {stage === 'done' && tokenMeta && (
            <View style={{ alignItems: 'center', paddingTop: 32, gap: 16 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: t.palette.success + '22',
                borderWidth: 2, borderColor: t.palette.success,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 32 }}>✓</Text>
              </View>

              <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 20, color: t.palette.text }}>
                {tokenMeta.symbol} Imported
              </Text>
              <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 14, color: t.palette.textMuted, textAlign: 'center', lineHeight: 22 }}>
                {tokenMeta.name} has been added to your {chainLabel} token list.
                Pull down on the home screen to refresh your balance.
              </Text>

              <Pressable
                onPress={close}
                style={({ pressed }) => ({
                  backgroundColor: t.palette.elevated,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 32,
                  marginTop: 16,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 15, color: t.palette.text }}>
                  Done
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
