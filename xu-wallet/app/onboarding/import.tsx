// app/onboarding/import.tsx
import React, { useState, useMemo } from 'react';
import { View, TextInput, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as bip39 from 'bip39';
import { Text } from '../../mobile/theme/primitives/Text';
import { Button } from '../../mobile/theme/primitives/Pressable';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/ScreenHeader';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

function normalizeMnemonic(raw: string): string {
  // Normalize: trim, lowercase, collapse all whitespace between words to single spaces.
  // This is the most common reason for "invalid mnemonic" — extra spaces, trailing newlines,
  // or uppercase letters from autocorrect pasting.
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export default function Import() {
  const t = useTheme();
  const router = useRouter();
  const [phrase, setPhrase] = useState('');
  const [pasteError, setPasteError] = useState(false);

  const normalized = useMemo(() => normalizeMnemonic(phrase), [phrase]);
  const wordCount = useMemo(
    () => (normalized.length === 0 ? 0 : normalized.split(' ').filter(Boolean).length),
    [normalized]
  );
  const valid = useMemo(() => {
    if (!normalized) return false;
    return bip39.validateMnemonic(normalized);
  }, [normalized]);

  // Show count feedback as user types
  const countValid = wordCount === 12 || wordCount === 18 || wordCount === 24;

  function onContinue() {
    if (!valid) return;
    router.push({
      pathname: '/onboarding/set-pin',
      params: { mode: 'create', mnemonic: normalized },
    });
  }

  async function onPaste() {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setPhrase(text);
        setPasteError(false);
      }
    } catch {
      setPasteError(true);
    }
  }

  const borderColor = (() => {
    if (!phrase) return t.palette.hairline;
    if (valid) return t.palette.success;
    if (wordCount > 0 && !countValid) return t.palette.danger;
    return t.palette.hairline;
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScreenHeader title="Import wallet" subtitle="Enter your 12, 18, or 24-word recovery phrase" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TextInput
          value={phrase}
          onChangeText={(text) => {
            setPhrase(text);
            setPasteError(false);
          }}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          placeholder="word1 word2 word3 …"
          placeholderTextColor={t.palette.textFaint}
          style={{
            minHeight: 160,
            backgroundColor: t.palette.surface,
            color: t.palette.text,
            borderRadius: t.radius.md,
            borderWidth: 1.5,
            borderColor,
            padding: 14,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
            textAlignVertical: 'top',
          }}
        />

        {/* Word count + status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text
            variant="caption"
            color={valid ? 'success' : wordCount > 0 && !countValid ? 'danger' : 'textMuted'}
          >
            {phrase.length === 0
              ? 'Words separated by single spaces.'
              : valid
              ? `✓ Valid ${wordCount}-word phrase`
              : wordCount > 0 && !countValid
              ? `${wordCount} words — need 12, 18, or 24`
              : wordCount > 0
              ? `${wordCount} words — check spelling`
              : 'Invalid mnemonic — check spelling and word count.'}
          </Text>

          {/* Paste from clipboard */}
          <Pressable
            onPress={onPaste}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: t.radius.sm,
              backgroundColor: t.palette.elevated,
              borderWidth: 1,
              borderColor: t.palette.hairline,
            }}
          >
            <Ionicons name="clipboard-outline" size={13} color={t.palette.textMuted} />
            <Text variant="caption" color="textMuted">Paste</Text>
          </Pressable>
        </View>

        {pasteError ? (
          <Text variant="caption" color="danger" style={{ marginTop: 4 }}>
            Could not read clipboard. Paste manually above.
          </Text>
        ) : null}

        {/* BIP-39 tip */}
        {!valid && wordCount >= 3 ? (
          <View
            style={{
              marginTop: 14,
              backgroundColor: t.palette.rustoxSoft,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.palette.rustox,
              padding: 12,
              gap: 4,
            }}
          >
            <Text variant="caption" color="rustox" style={{ fontWeight: '600' }}>Tips</Text>
            <Text variant="caption" color="text">
              • All words must be lowercase BIP-39 English words{'\n'}
              • Separated by exactly one space{'\n'}
              • No punctuation, no extra characters
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <Button title="Continue" onPress={onContinue} disabled={!valid} />
      </View>
    </SafeAreaView>
  );
}
