// app/receive/index.tsx — Modernised Receive screen
import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, Share, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../mobile/theme/primitives/Text';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { useWallet } from '../../context/WalletContext';
import { CHAIN_META, type Chain } from '../../mobile/services/chainService';

const CHAINS: Chain[] = ['rustox', 'ethereum', 'bnb', 'polygon', 'solana'];

const CHAIN_ICONS: Record<Chain, string> = {
  rustox: 'R',
  ethereum: 'Ξ',
  bnb: 'B',
  polygon: 'M',
  solana: '◎',
};

export default function Receive() {
  const t = useTheme();
  const router = useRouter();
  const { walletAddresses, activeAccount } = useWallet();
  const [chain, setChain] = useState<Chain>('rustox');
  const [copied, setCopied] = useState(false);

  const address = walletAddresses?.[chain] ?? '';
  const meta = CHAIN_META[chain];

  const handleCopy = useCallback(async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [address]);

  const handleShare = useCallback(() => {
    if (!address) return;
    Share.share({
      message: address,
      title: `My ${meta.name} address`,
    });
  }, [address, meta.name]);

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
          <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 18, color: t.palette.text }}>Receive</Text>
          <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 11, color: t.palette.textFaint }}>
            {activeAccount?.name ?? 'My Wallet'}
          </Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* ── Chain selector pills ─────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 8 }}
        >
          {CHAINS.map((c) => {
            const cm = CHAIN_META[c];
            const active = c === chain;
            return (
              <Pressable
                key={c}
                onPress={() => setChain(c)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 16, paddingVertical: 10,
                  borderRadius: t.radius.pill,
                  backgroundColor: active ? cm.accent + '18' : t.palette.surface,
                  borderWidth: active ? 1.5 : 1,
                  borderColor: active ? cm.accent : t.palette.hairline,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: cm.accent,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Manrope_700Bold', color: '#0B0B0F' }}>
                    {CHAIN_ICONS[c]}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: active ? cm.accent : t.palette.textMuted }}>
                  {cm.symbol}
                </Text>
                {active && (
                  <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: cm.accent + '30' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'InterTight_600SemiBold', color: cm.accent }}>
                      SELECTED
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── QR card ──────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: t.radius.xl,
            padding: 28,
            alignItems: 'center',
            shadowColor: meta.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 8,
          }}>
            {address ? (
              <View style={{ position: 'relative' }}>
                <QRCode
                  value={address}
                  size={220}
                  backgroundColor="#FFFFFF"
                  color="#0B0B0F"
                  quietZone={8}
                />
                {/* Chain logo overlay */}
                <View style={{
                  position: 'absolute',
                  alignSelf: 'center',
                  top: 89,
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: meta.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                }}>
                  <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 16, color: '#0B0B0F' }}>
                    {CHAIN_ICONS[chain]}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="body" color="textFaint">No address</Text>
              </View>
            )}

            {/* Network badge below QR */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              marginTop: 20, paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: t.radius.pill,
              backgroundColor: meta.accent + '15',
              borderWidth: 1, borderColor: meta.accent + '40',
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meta.accent }} />
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: meta.accent }}>
                {meta.name} Network
              </Text>
            </View>
          </View>
        </View>

        {/* ── Address display ───────────────────────────── */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View style={{
            backgroundColor: t.palette.surface,
            borderRadius: t.radius.lg,
            borderWidth: 1,
            borderColor: t.palette.hairline,
            padding: 16,
          }}>
            <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textMuted, letterSpacing: 0.6, marginBottom: 10 }}>
              {meta.name.toUpperCase()} ADDRESS
            </Text>
            <Text style={{
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 13,
              color: t.palette.text,
              lineHeight: 22,
            }}>
              {address || '—'}
            </Text>
          </View>
        </View>

        {/* ── Action buttons ────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginBottom: 16 }}>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 16,
              borderRadius: t.radius.md,
              backgroundColor: copied ? t.palette.success + '18' : t.palette.surface,
              borderWidth: copied ? 1.5 : 1,
              borderColor: copied ? t.palette.success : t.palette.hairline,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={18}
              color={copied ? t.palette.success : t.palette.text}
            />
            <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: copied ? t.palette.success : t.palette.text }}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 16,
              borderRadius: t.radius.md,
              backgroundColor: t.palette.surface,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="share-social-outline" size={18} color={t.palette.text} />
            <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: t.palette.text }}>Share</Text>
          </Pressable>
        </View>

        {/* ── Warning banner ────────────────────────────── */}
        <View style={{ paddingHorizontal: 24 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: t.palette.rustoxSoft,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.palette.rustox + '60',
            padding: 14,
          }}>
            <Ionicons name="warning-outline" size={17} color={t.palette.rustox} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted, lineHeight: 20 }}>
              Only send <Text style={{ color: t.palette.text, fontFamily: 'InterTight_600SemiBold' }}>{meta.symbol}</Text> and{' '}
              {meta.isEVM ? 'ERC-20 tokens' : 'SPL tokens'} on the{' '}
              <Text style={{ color: meta.accent, fontFamily: 'InterTight_600SemiBold' }}>{meta.name}</Text> network
              to this address. Assets sent on the wrong network may be permanently lost.
            </Text>
          </View>
        </View>

        {/* ── Supported tokens hint ─────────────────────── */}
        {meta.isEVM && (
          <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
            <View style={{
              backgroundColor: t.palette.surface,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              padding: 14,
            }}>
              <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 11, color: t.palette.textMuted, letterSpacing: 0.6, marginBottom: 8 }}>
                SUPPORTED TOKENS
              </Text>
              <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted, lineHeight: 20 }}>
                This address accepts {meta.symbol} (native) and any ERC-20 token on {meta.name}.
                Use the "Import Token" button on the home screen to track custom tokens.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
