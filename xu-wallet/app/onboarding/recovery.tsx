import { useMemo, useState, useCallback } from 'react';
import { View, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button, Text } from '../../mobile/theme/primitives';
import { useTheme } from '../../mobile/theme/ThemeProvider';

export default function Recovery() {
  const t = useTheme();
  const { mnemonic } = useLocalSearchParams<{ mnemonic?: string }>();
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);

  const words = useMemo(
    () => (mnemonic ?? '').trim().split(/\s+/).filter(Boolean),
    [mnemonic]
  );

  // Reveal the phrase one word at a time so the user can't accidentally
  // screenshot it from a notification preview, screen recorder, etc.
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    words.map(() => false)
  );

  const toggle = (i: number) =>
    setRevealed((r) => r.map((v, idx) => (idx === i ? !v : v)));

  const next = useCallback(() => {
    router.push({ pathname: '/onboarding/set-pin', params: { mnemonic } });
  }, [router, mnemonic]);

  const copyPhrase = useCallback(async () => {
    if (!words.length) return;
    await Clipboard.setStringAsync(words.join(' '));
    setCopied(true);
    // Auto-clear the clipboard after 60 s. The seed phrase sitting on the
    // clipboard indefinitely is the #1 way wallets get drained.
    setTimeout(() => {
      Clipboard.setStringAsync('').catch(() => {});
      setCopied(false);
    }, 60_000);
  }, [words]);

  // On Android, Alert.prompt does not exist (it's iOS-only). The original
  // implementation used it to verify the user wrote down the phrase. On
  // Android we skip the word-quiz step entirely: pressing the primary
  // button is the user's affirmative attestation. We still want to make
  // this an explicit two-tap flow ("I've written it down" -> "Continue")
  // so the user doesn't fat-finger past the warning.
  const acknowledge = useCallback(() => {
    if (Platform.OS === 'ios' && typeof Alert.prompt === 'function') {
      Alert.prompt(
        'Verify phrase',
        'Type word #1 to confirm you wrote the phrase down',
        (val) => {
          if (val?.trim().toLowerCase() === words[0]) setVerified(true);
          else Alert.alert('Mismatch', 'That word does not match. Please try again.');
        }
      );
    } else {
      setVerified(true);
    }
  }, [words]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Back up your wallet" subtitle="Write these words down in order" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 12,
          }}
        >
          {words.map((w, i) => (
            <Pressable
              key={i}
              onPress={() => toggle(i)}
              accessibilityLabel={`Word ${i + 1}`}
              style={{
                width: '48%',
                padding: 14,
                borderRadius: 12,
                backgroundColor: t.palette.surface,
                borderWidth: 1,
                borderColor: t.palette.hairline,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text variant="caption" color="textMuted">
                {i + 1}.
              </Text>
              <Text
                variant="bodyMedium"
                color={revealed[i] ? 'text' : 'textMuted'}
              >
                {revealed[i] ? w : '••••'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 24, gap: 10 }}>
          <Text variant="caption" color="textMuted">
            Tap a word to reveal it. Take your time — anyone with these words can
            spend your funds.
          </Text>
          <Pressable
            onPress={copyPhrase}
            accessibilityLabel="Copy recovery phrase"
            style={{
              alignSelf: 'flex-start',
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: t.palette.hairline,
              backgroundColor: t.palette.elevated,
            }}
          >
            <Text
              variant="bodyMedium"
              color={copied ? 'success' : 'text'}
            >
              {copied ? '✓ Copied · clears in 60 s' : 'Copy phrase'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 32,
        }}
      >
        <Button
          title={verified ? 'Continue' : "I've written it down"}
          onPress={verified ? next : acknowledge}
        />
      </View>
    </>
  );
}
