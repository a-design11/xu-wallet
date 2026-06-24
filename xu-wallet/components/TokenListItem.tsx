// components/TokenListItem.tsx
import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { Text } from '../mobile/theme/primitives/Text';
import { useTheme } from '../mobile/theme/ThemeProvider';

export interface TokenRowData {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  balanceUSD: number;
  change24h: number;
  logo?: string;
  accent?: string;
}

export function TokenListItem({
  token,
  onPress,
}: {
  token: TokenRowData;
  onPress?: () => void;
}) {
  const t = useTheme();
  const up = token.change24h >= 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? t.palette.elevated : 'transparent',
          borderBottomColor: t.palette.hairline,
        },
      ]}
    >
      <View
        style={[
          styles.logo,
          { backgroundColor: token.accent ?? t.palette.rustox },
        ]}
      >
        <Text variant="bodyMedium" color="bg">
          {token.symbol.slice(0, 2)}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text variant="bodyMedium">{token.name}</Text>
        <Text variant="caption" color="textMuted">
          {token.balance.toFixed(token.balance < 1 ? 4 : 2)} {token.symbol}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="bodyMedium">${formatUsd(token.balanceUSD)}</Text>
        <Text
          variant="caption"
          style={{ color: up ? t.palette.success : t.palette.danger }}
        >
          {up ? '▲' : '▼'} {Math.abs(token.change24h).toFixed(2)}%
        </Text>
      </View>
    </Pressable>
  );
}

function formatUsd(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 10_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return v.toFixed(4);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});