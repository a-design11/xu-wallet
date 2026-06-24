// mobile/security/pinAttempts.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const ATTEMPTS_KEY = 'xu_wallet_pin_attempts_v2';
const LOCK_UNTIL_KEY = 'xu_wallet_pin_lock_until_v2';

export interface PinAttemptState {
  attempts: number;
  lockUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function getState(): Promise<PinAttemptState> {
  const [a, l] = await Promise.all([
    AsyncStorage.getItem(ATTEMPTS_KEY),
    AsyncStorage.getItem(LOCK_UNTIL_KEY),
  ]);
  return {
    attempts: a ? parseInt(a, 10) || 0 : 0,
    lockUntil: l ? parseInt(l, 10) || null : null,
  };
}

export async function recordFailure(): Promise<PinAttemptState> {
  const s = await getState();
  const attempts = s.attempts + 1;
  const lockUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : null;
  await AsyncStorage.multiSet([
    [ATTEMPTS_KEY, String(attempts)],
    [LOCK_UNTIL_KEY, lockUntil ? String(lockUntil) : ''],
  ]);
  return { attempts, lockUntil };
}

export async function recordSuccess(): Promise<void> {
  await AsyncStorage.multiRemove([ATTEMPTS_KEY, LOCK_UNTIL_KEY]);
}

export async function clearAttempts(): Promise<void> {
  await AsyncStorage.multiRemove([ATTEMPTS_KEY, LOCK_UNTIL_KEY]);
}

export function isLocked(state: PinAttemptState): boolean {
  return !!state.lockUntil && state.lockUntil > Date.now();
}

export const PIN_POLICY = { MAX_ATTEMPTS, LOCKOUT_MS };