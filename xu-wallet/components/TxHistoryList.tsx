// components/TxHistoryList.tsx
// Reusable transaction history list with chain-colored rows.

import React, { useCallback } from 'react';
import { View, Pressable, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../mobile/theme/primitives/Text';
import { useTheme } from '../mobile/theme/ThemeProvider';
import type { TxRecord } from '../mobile/services/txHistoryService';
import { formatTxTime, shortAddr } from '../mobile/services/txHistoryService';
import { CHAIN_META } from '../mobile/services/chainService';

interface Props {
  txns: TxRecord[];
  loading: boolean;
  error?: string | null;
  onRefresh?: () => void;
  emptyMessage?: string;
}

export function TxHistoryList({ txns, loading, error, onRefresh, emptyMessage }: Props) {
  const t = useTheme();

  if (loading) {
    return (
      <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
        <ActivityIndicator color={t.palette.rustox} />
        <Text variant="caption" color="textMuted">Loading history…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 24, alignItems: 'center', gap: 10 }}>
        <Ionicons name="cloud-offline-outline" size={28} color={t.palette.textFaint} />
        <Text variant="caption" color="textMuted" style={{ textAlign: 'center' }}>
          {error}
        </Text>
        {onRefresh && (
          <Pressable onPress={onRefresh} style={{ marginTop: 4 }}>
            <Text variant="caption" color="rustox">Retry</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (txns.length === 0) {
    return (
      <View style={{ padding: 32, alignItems: 'center', gap: 10 }}>
        <Ionicons name="receipt-outline" size={32} color={t.palette.textFaint} />
        <Text variant="caption" color="textMuted" style={{ textAlign: 'center' }}>
          {emptyMessage ?? 'No transactions found yet.\nSend or receive assets to see history here.'}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {txns.map((tx, i) => (
        <TxRow key={`${tx.hash}-${tx.tokenSymbol ?? ''}-${i}`} tx={tx} />
      ))}
    </View>
  );
}

function TxRow({ tx }: { tx: TxRecord }) {
  const t = useTheme();
  const meta = CHAIN_META[tx.chain];
  const accent = meta?.accent ?? t.palette.evm;
  const isIn = tx.direction === 'in';
  const isFailed = tx.status === 'failed';

  const dirColor = isFailed
    ? t.palette.danger
    : isIn
    ? t.palette.success
    : t.palette.text;

  const dirIcon = isFailed
    ? 'close-circle-outline'
    : isIn
    ? 'arrow-down-circle-outline'
    : tx.direction === 'self'
    ? 'swap-horizontal-outline'
    : 'arrow-up-circle-outline';

  const label = tx.tokenSymbol ?? tx.symbol;
  const counterAddr = isIn ? tx.fromAddress : tx.toAddress;

  const openExplorer = useCallback(() => {
    if (tx.explorerUrl) Linking.openURL(tx.explorerUrl).catch(() => null);
  }, [tx.explorerUrl]);

  return (
    <Pressable
      onPress={openExplorer}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? t.palette.elevated : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: t.palette.hairline,
        gap: 12,
      })}
    >
      {/* Direction icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: (isFailed ? t.palette.danger : isIn ? t.palette.success : accent) + '18',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={dirIcon as any} size={20} color={isFailed ? t.palette.danger : isIn ? t.palette.success : accent} />
      </View>

      {/* Details */}
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: t.palette.text }}>
            {isIn ? 'Received' : tx.direction === 'self' ? 'Self Transfer' : 'Sent'} {label}
          </Text>
          {isFailed && (
            <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: t.palette.danger + '22' }}>
              <Text style={{ fontSize: 9, fontFamily: 'InterTight_600SemiBold', color: t.palette.danger, letterSpacing: 0.5 }}>
                FAILED
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Chain pill */}
          <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: accent + '18' }}>
            <Text style={{ fontSize: 9, fontFamily: 'InterTight_600SemiBold', color: accent, letterSpacing: 0.4 }}>
              {meta?.name?.toUpperCase() ?? tx.chain.toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 11, fontFamily: 'JetBrainsMono_400Regular', color: t.palette.textFaint }}>
            {shortAddr(counterAddr)}
          </Text>
        </View>
        {tx.gasCostEth && (
          <Text style={{ fontSize: 11, fontFamily: 'InterTight_400Regular', color: t.palette.textFaint }}>
            Fee: {tx.gasCostEth} {tx.symbol}
          </Text>
        )}
      </View>

      {/* Amount + time */}
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Text style={{
          fontFamily: 'Manrope_700Bold', fontSize: 14,
          color: dirColor,
        }}>
          {isIn ? '+' : tx.direction === 'self' ? '' : '-'}{tx.value} {label}
        </Text>
        <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 11, color: t.palette.textFaint }}>
          {formatTxTime(tx.timestamp)}
        </Text>
        <Ionicons name="open-outline" size={10} color={t.palette.textFaint} />
      </View>
    </Pressable>
  );
}
