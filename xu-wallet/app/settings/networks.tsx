// app/settings/networks.tsx
import React, { useState } from 'react';
import { View, ScrollView, TextInput, Switch, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '../../mobile/theme/primitives/Text';
import { Button } from '../../mobile/theme/primitives/Pressable';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { ScreenHeader } from '../../components/ScreenHeader';
import { CHAIN_META } from '../../mobile/services/chainService';

interface CustomNetwork {
  chainId: number;
  name: string;
  symbol: string;
  rpc: string;
  explorer: string;
}

const KEY = 'xu_custom_networks_v2';

export default function Networks() {
  const t = useTheme();
  const [items, setItems] = useState<CustomNetwork[]>([]);
  const [draft, setDraft] = useState<CustomNetwork>({
    chainId: 0,
    name: '',
    symbol: '',
    rpc: '',
    explorer: '',
  });

  React.useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      try {
        setItems(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    });
  }, []);

  const save = async (next: CustomNetwork[]) => {
    setItems(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  const add = () => {
    if (!draft.name || !draft.rpc || !draft.chainId) {
      Alert.alert('Missing fields', 'chainId, name and RPC are required.');
      return;
    }
    save([...items, draft]);
    setDraft({ chainId: 0, name: '', symbol: '', rpc: '', explorer: '' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScreenHeader title="Networks" subtitle="Built-in + custom RPC" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text variant="caption" color="textMuted" style={{ marginBottom: 8 }}>BUILT-IN</Text>
        {Object.entries(CHAIN_META).map(([key, meta]) => (
          <View
            key={key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              backgroundColor: t.palette.surface,
              marginBottom: 8,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.accent }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text variant="bodyMedium" color="text">{meta.name}</Text>
              <Text variant="caption" color="textMuted">chainId {meta.chainId || '—'} · {meta.symbol}</Text>
            </View>
          </View>
        ))}

        <Text variant="caption" color="textMuted" style={{ marginTop: 16, marginBottom: 8 }}>CUSTOM RPC</Text>
        {items.map((n, i) => (
          <Pressable
            key={`${n.chainId}-${i}`}
            onLongPress={() => save(items.filter((_, j) => j !== i))}
            style={{
              padding: 14,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              backgroundColor: t.palette.surface,
              marginBottom: 8,
            }}
          >
            <Text variant="bodyMedium" color="text">{n.name}</Text>
            <Text variant="caption" color="textMuted">chainId {n.chainId} · {n.rpc}</Text>
          </Pressable>
        ))}

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
          <Text variant="subtitle" style={{ marginBottom: 8 }}>Add network</Text>
          <Field label="Chain ID" value={String(draft.chainId)} onChange={(v) => setDraft({ ...draft, chainId: Number(v) || 0 })} keyboardType="number-pad" />
          <Field label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <Field label="Symbol" value={draft.symbol} onChange={(v) => setDraft({ ...draft, symbol: v })} />
          <Field label="RPC URL" value={draft.rpc} onChange={(v) => setDraft({ ...draft, rpc: v })} autoCap="none" />
          <Field label="Explorer (optional)" value={draft.explorer} onChange={(v) => setDraft({ ...draft, explorer: v })} autoCap="none" />
          <View style={{ marginTop: 12 }}>
            <Button title="Add" onPress={add} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  autoCap,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: any;
  autoCap?: any;
}) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 8 }}>
      <Text variant="caption" color="textMuted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={autoCap}
        autoCorrect={false}
        placeholder={label}
        placeholderTextColor={t.palette.textFaint}
        style={{
          marginTop: 4,
          backgroundColor: t.palette.bg,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.palette.hairline,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: t.palette.text,
        }}
      />
    </View>
  );
}