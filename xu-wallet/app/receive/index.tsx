// app/receive/index.tsx
import React, { useState } from 'react';
import { View, ScrollView, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../mobile/theme/primitives/Text';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { useWallet } from '../../context/WalletContext';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ChainChip } from '../../components/ChainChip';
import { CHAIN_META, type Chain } from '../../mobile/services/chainService';

const CHAINS: Chain[] = ['rustox', 'ethereum', 'bnb', 'polygon', 'solana'];

export default function Receive() {
  const t = useTheme();
  const router = useRouter();
  const { walletAddresses } = useWallet();
  const [chain, setChain] = useState<Chain>('rustox');
  const address = walletAddresses?.[chain] ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScreenHeader title="Receive" subtitle="Share your address or QR" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CHAINS.map((c) => (
            <ChainChip key={c} chain={c} active={c === chain} onPress={() => setChain(c)} />
          ))}
        </ScrollView>

        <View
          style={{
            marginTop: 24,
            backgroundColor: '#FFFFFF',
            borderRadius: t.radius.xl,
            padding: 24,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
          }}
        >
          {address ? (
            <View>
              <QRCode
                value={address}
                size={220}
                backgroundColor="#FFFFFF"
                color="#0B0B0F"
              />
              <View
                style={{
                  position: 'absolute',
                  alignSelf: 'center',
                  top: 96,
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  backgroundColor: '#0B0B0F',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="subtitle" color="rustox">XU</Text>
              </View>
            </View>
          ) : (
            <Text variant="body" color="textFaint">No address</Text>
          )}
        </View>

        <View
          style={{
            marginTop: 16,
            backgroundColor: t.palette.surface,
            borderRadius: t.radius.lg,
            borderWidth: 1,
            borderColor: t.palette.hairline,
            padding: 14,
          }}
        >
          <Text variant="caption" color="textMuted">{CHAIN_META[chain].name} address</Text>
          <Text variant="mono" color="text" style={{ marginTop: 4 }}>{address || '—'}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable
            onPress={async () => address && (await Clipboard.setStringAsync(address))}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 14,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              backgroundColor: pressed ? t.palette.elevated : t.palette.surface,
            })}
          >
            <Ionicons name="copy-outline" size={16} color={t.palette.text} />
            <Text variant="bodyMedium">Copy</Text>
          </Pressable>
          <Pressable
            onPress={() => address && Share.share({ message: address })}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 14,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              backgroundColor: pressed ? t.palette.elevated : t.palette.surface,
            })}
          >
            <Ionicons name="share-social-outline" size={16} color={t.palette.text} />
            <Text variant="bodyMedium">Share</Text>
          </Pressable>
        </View>

        <View
          style={{
            marginTop: 16,
            backgroundColor: t.palette.rustoxSoft,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.palette.rustox,
            padding: 12,
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <Ionicons name="warning" size={16} color={t.palette.rustox} />
          <Text variant="caption" color="text" style={{ flex: 1 }}>
            Only send {CHAIN_META[chain].symbol} and {CHAIN_META[chain].isEVM ? 'ERC-20 tokens on this chain' : 'SPL tokens'} to this address. Other assets may be lost.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}