// components/AddressDisplay.tsx
import React from 'react';
import { Pressable, View, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text } from '../mobile/theme/primitives/Text';
import { useTheme } from '../mobile/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

export function AddressDisplay({ address, label = 'Address' }: { address: string; label?: string }) {
  const t = useTheme();
  const truncated =
    address.length > 16 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.palette.surface,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.palette.hairline,
        padding: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="textMuted">{label}</Text>
        <Text variant="mono" color="text" style={{ marginTop: 2 }}>{truncated}</Text>
      </View>
      <Pressable
        onPress={async () => {
          await Clipboard.setStringAsync(address);
        }}
        hitSlop={10}
        style={{ padding: 8 }}
        accessibilityLabel="Copy address"
      >
        <Ionicons name="copy-outline" size={18} color={t.palette.text} />
      </Pressable>
      <Pressable
        onPress={() => Share.share({ message: address })}
        hitSlop={10}
        style={{ padding: 8 }}
        accessibilityLabel="Share address"
      >
        <Ionicons name="share-social-outline" size={18} color={t.palette.text} />
      </Pressable>
    </View>
  );
}