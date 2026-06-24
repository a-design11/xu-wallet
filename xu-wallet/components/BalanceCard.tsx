// components/BalanceCard.tsx
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '../mobile/theme/primitives/Text';
import { Box } from '../mobile/theme/primitives/Box';
import { Button } from '../mobile/theme/primitives/Pressable';
import { useTheme } from '../mobile/theme/ThemeProvider';

interface Props {
  totalUsd: number;
  change24h: number;
  hidden: boolean;
  onToggleHide: () => void;
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
  onBuy: () => void;
}

export function BalanceCard({
  totalUsd,
  change24h,
  hidden,
  onToggleHide,
  onSend,
  onReceive,
  onSwap,
  onBuy,
}: Props) {
  const t = useTheme();
  const up = change24h >= 0;
  return (
    <Box bg="surface" rounded="xl" p={24} mt={16} mx={16}>
      <View style={styles.header}>
        <Text variant="caption" color="textMuted">
          Total balance
        </Text>
        <Pressable onPress={onToggleHide} hitSlop={12} accessibilityLabel="Toggle balance visibility">
          <Text variant="caption" color="textMuted">
            {hidden ? 'Show' : 'Hide'}
          </Text>
        </Pressable>
      </View>

      <Text variant="display" color="text" style={{ marginTop: 6 }}>
        {hidden ? '••••••' : `$${formatBigNumber(totalUsd)}`}
      </Text>

      <View style={[styles.delta, { marginTop: 6 }]}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: up ? t.palette.success : t.palette.danger,
          }}
        />
        <Text
          variant="caption"
          color={up ? 'success' : 'danger'}
        >
          {up ? '+' : ''}
          {change24h.toFixed(2)}% · 24h
        </Text>
      </View>

      {/* sparkline placeholder */}
      <Sparkline values={[1, 1.1, 1.05, 1.2, 1.18, 1.32, 1.28, 1.4]} up={up} />

      <View style={styles.actions}>
        <Button title="Send" variant="primary" onPress={onSend} />
        <Button title="Receive" variant="secondary" onPress={onReceive} />
        <Button title="Swap" variant="secondary" onPress={onSwap} />
        <Button title="Buy" variant="secondary" onPress={onBuy} />
      </View>
    </Box>
  );
}

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  const t = useTheme();
  const max = Math.max(...values);
  const min = Math.min(...values);
  const w = 280;
  const h = 56;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  });
  // Render with simple line segments via Views (avoids extra SVG import).
  return (
    <View style={{ marginTop: 16, height: h }}>
      {values.map((v, i) => {
        if (i === 0) return null;
        const prev = values[i - 1];
        const x1 = (i - 1) * step;
        const x2 = i * step;
        const y1 = h - ((prev - min) / (max - min || 1)) * h;
        const y2 = h - ((v - min) / (max - min || 1)) * h;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x1,
              top: y1,
              width: length,
              height: 2,
              backgroundColor: up ? t.palette.success : t.palette.danger,
              transform: [{ translateY: -1 }, { rotateZ: `${angle}rad` }],
              transformOrigin: '0% 50%',
            }}
          />
        );
      })}
    </View>
  );
}

function formatBigNumber(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 10_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    flexWrap: 'wrap',
  },
});