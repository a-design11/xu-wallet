// components/ChainChip.tsx
import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../mobile/theme/primitives/Text';
import { useTheme } from '../mobile/theme/ThemeProvider';
import type { Chain } from '../mobile/services/chainService';
import { CHAIN_META } from '../mobile/services/chainService';

export function ChainChip({
  chain,
  active,
  onPress,
}: {
  chain: Chain;
  active: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  const m = CHAIN_META[chain];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: t.radius.pill,
        backgroundColor: active ? t.palette.elevated : t.palette.surface,
        borderWidth: 1,
        borderColor: active ? m.accent : t.palette.hairline,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.accent }} />
      <Text variant="bodyMedium" color={active ? 'text' : 'textMuted'}>
        {m.symbol}
      </Text>
    </Pressable>
  );
}