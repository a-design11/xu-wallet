// app/onboarding/set-pin.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Text } from '../../mobile/theme/primitives/Text';
import { Button } from '../../mobile/theme/primitives/Pressable';
import { useTheme } from '../../mobile/theme/ThemeProvider';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PinInput } from '../../components/PinInput';
import { useWallet } from '../../context/WalletContext';
import { verifyPin } from '../../mobile/services/walletService';
import { recordFailure, recordSuccess, getState, isLocked } from '../../mobile/security/pinAttempts';

export default function SetPin() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: 'create' | 'unlock'; mnemonic?: string }>();
  const mode = params.mode ?? 'create';
  const { setPin, setBiometricEnabled, setIsLocked, initWallet } = useWallet();

  const [step, setStep] = useState<'first' | 'confirm' | 'unlock'>('first');
  const [first, setFirst] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState(false);
  const [bio, setBio] = useState(false);
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'unlock') {
      setStep('unlock');
      getState().then((s) => {
        if (isLocked(s)) {
          setLockedMsg(
            `Too many attempts. Try again in ${Math.ceil((s.lockUntil! - Date.now()) / 60000)} min.`
          );
        }
      });
    }
  }, [mode]);

  async function onUnlockComplete(pin: string) {
    const ok = await verifyPin(pin);
    if (!ok) {
      const s = await recordFailure();
      setErr(true);
      if (s.lockUntil) {
        setLockedMsg(
          `Too many attempts. Try again in ${Math.ceil((s.lockUntil - Date.now()) / 60000)} min.`
        );
      }
      return;
    }
    await recordSuccess();
    setIsLocked(false);
    router.replace('/tabs/home');
  }

  async function onFirstComplete(pin: string) {
    setFirst(pin);
    setStep('confirm');
    setErr(false);
  }

  async function onConfirmComplete(pin: string) {
    if (pin !== first) {
      setErr(true);
      setConfirm('');
      return;
    }
    await setPin(pin);
    if (bio) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable biometric unlock',
        });
        if (result.success) await setBiometricEnabled(true);
      } catch {
        /* ignore */
      }
    }
    if (params.mnemonic) {
      await initWallet(params.mnemonic);
      router.replace('/tabs/home');
    } else {
      // This case should ideally not be reached if flow is Welcome -> Create -> Recovery -> PIN
      router.replace('/onboarding/welcome');
    }
  }

  const isUnlock = mode === 'unlock';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <ScreenHeader
        title={isUnlock ? 'Unlock' : step === 'confirm' ? 'Confirm PIN' : 'Create PIN'}
        subtitle={
          isUnlock
            ? 'Enter your 6-digit PIN to continue'
            : step === 'confirm'
            ? 'Re-enter the same PIN'
            : 'Pick a 6-digit PIN — you\'ll use it for signing.'
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center', paddingTop: 32 }}>
        {lockedMsg ? (
          <View
            style={{
              backgroundColor: t.palette.rustoxSoft,
              borderColor: t.palette.danger,
              borderWidth: 1,
              padding: 12,
              borderRadius: t.radius.md,
              marginBottom: 16,
            }}
          >
            <Text variant="body" color="danger">{lockedMsg}</Text>
          </View>
        ) : null}
        {step === 'unlock' ? (
          <PinInput value={confirm} onChange={setConfirm} onComplete={onUnlockComplete} error={err} />
        ) : step === 'first' ? (
          <>
            <PinInput value={first} onChange={setFirst} onComplete={onFirstComplete} error={err} />
            <Pressable
              onPress={async () => {
                const ok = await LocalAuthentication.hasHardwareAsync();
                if (ok) setBio((b) => !b);
              }}
              style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: bio ? t.palette.rustox : t.palette.hairline,
                  backgroundColor: bio ? t.palette.rustox : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {bio ? <Text variant="caption" color="bg">✓</Text> : null}
              </View>
              <Text variant="body" color="textMuted">Enable biometric unlock</Text>
            </Pressable>
          </>
        ) : (
          <PinInput value={confirm} onChange={setConfirm} onComplete={onConfirmComplete} error={err} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}