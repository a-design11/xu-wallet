// mobile/services/walletService.ts
// BIP-39 seed → multi-chain HD derivation (EVM via ethers, Solana via @noble/ed25519).
// Secrets stored in SecureStore on native; falls back to AsyncStorage on web
// (expo-secure-store's web shim is missing setValueWithKeyAsync).

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { mnemonicToSeedSync } from 'bip39';
import bs58 from 'bs58';
import type { Chain } from './chainService';

// noble/ed25519 v3: ed.etc may be frozen in some builds — do not mutate it.
// Use getPublicKeyAsync() which resolves via WebCrypto on web and noble/hashes on native.
// sha512 is still imported for the seed-slice derivation step.

// ─── Platform-aware secure storage ──────────────────────────────────────────
// SecureStore works only on native. On web we fall back to AsyncStorage
// (less secure but functional for preview/dev purposes).

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key).catch(() => null);
  }
  return SecureStore.getItemAsync(key).catch(() => null);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

async function secureDel(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key).catch(() => null);
    return;
  }
  await SecureStore.deleteItemAsync(key).catch(() => null);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WalletAddresses {
  rustox: string;
  ethereum: string;
  bnb: string;
  polygon: string;
  solana: string;
}

const STORAGE_KEY = 'xu_wallet_v2';

interface StoredWallet {
  addresses: WalletAddresses;
  mnemonic: string;
  created: number;
}

// ─── Key derivation ───────────────────────────────────────────────────────────

async function deriveSolana(seed: Uint8Array): Promise<string> {
  // Phase 1 simplified derivation — full SLIP-0010 is Phase 2.
  // Use getPublicKeyAsync: works via WebCrypto on web, noble/hashes on native,
  // without needing to mutate ed.etc (which is frozen in some builds).
  const slice = seed.slice(0, 32);
  const priv = sha512(slice).slice(0, 32);
  const pub = await ed.getPublicKeyAsync(priv);
  return bs58.encode(new Uint8Array([...pub]));
}

function deriveEvm(seed: Uint8Array, chain: Chain, index = 0): string {
  void chain;
  const path = `m/44'/60'/0'/0/${index}`;
  const hd = ethers.HDNodeWallet.fromSeed(seed).derivePath(path);
  return hd.address;
}

export async function deriveAddresses(mnemonic: string): Promise<WalletAddresses> {
  const seed = mnemonicToSeedSync(mnemonic);
  const [rustox, ethereum, bnb, polygon, solana] = await Promise.all([
    Promise.resolve(deriveEvm(seed, 'rustox', 0)),
    Promise.resolve(deriveEvm(seed, 'ethereum', 0)),
    Promise.resolve(deriveEvm(seed, 'bnb', 0)),
    Promise.resolve(deriveEvm(seed, 'polygon', 0)),
    deriveSolana(seed),
  ]);
  return { rustox, ethereum, bnb, polygon, solana };
}

// ─── Wallet storage ───────────────────────────────────────────────────────────

export async function saveWalletToStorage(
  addresses: WalletAddresses,
  mnemonic: string
): Promise<void> {
  const payload: StoredWallet = { addresses, mnemonic, created: Date.now() };
  await secureSet(STORAGE_KEY, JSON.stringify(payload));
}

export async function loadWalletFromStorage(): Promise<{
  addresses: WalletAddresses;
  created: boolean;
  mnemonic: string | null;
}> {
  const raw = await secureGet(STORAGE_KEY);
  if (!raw) return { addresses: null as any, created: false, mnemonic: null };
  try {
    const parsed: StoredWallet = JSON.parse(raw);
    return { addresses: parsed.addresses, created: true, mnemonic: parsed.mnemonic };
  } catch {
    return { addresses: null as any, created: false, mnemonic: null };
  }
}

export async function clearWalletFromStorage(): Promise<void> {
  await secureDel(STORAGE_KEY);
  await AsyncStorage.multiRemove([
    'xu_wallet_addresses_v1',
    'xu_wallet_mnemonic_v1',
  ]).catch(() => null);
}

// ─── PIN ─────────────────────────────────────────────────────────────────────

const PIN_KEY = 'xu_wallet_pin_hash_v2';

export async function savePin(pin: string): Promise<void> {
  const salt = (process.env.EXPO_PUBLIC_INSTALL_SALT ?? 'xu-static-salt').trim();
  const { ethers: e } = await import('ethers');
  const hash = e.keccak256(Buffer.from(`${salt}:${pin}`));
  await secureSet(PIN_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const raw = await secureGet(PIN_KEY);
  if (!raw) return false;
  const salt = (process.env.EXPO_PUBLIC_INSTALL_SALT ?? 'xu-static-salt').trim();
  const { ethers: e } = await import('ethers');
  const hash = e.keccak256(Buffer.from(`${salt}:${pin}`));
  return hash === raw;
}

export async function hasPin(): Promise<boolean> {
  return !!(await secureGet(PIN_KEY));
}

// ─── Biometric flag ───────────────────────────────────────────────────────────

const BIO_KEY = 'xu_wallet_biometric_enabled_v2';

export async function saveBiometricEnabled(value: boolean): Promise<void> {
  await secureSet(BIO_KEY, value ? '1' : '0');
}

export async function getBiometricEnabled(): Promise<boolean> {
  const v = await secureGet(BIO_KEY);
  return v === '1';
}

// ─── Generic API key store ────────────────────────────────────────────────────

function keyName(which: 'evm' | 'solana' | 'coinGecko'): string {
  return `xu_wallet_api_${which}_v2`;
}

export async function saveApiKey(
  which: 'evm' | 'solana' | 'coinGecko',
  value: string | null
): Promise<void> {
  const k = keyName(which);
  if (!value) {
    await secureDel(k);
    return;
  }
  await secureSet(k, value);
}

export async function getApiKey(
  which: 'evm' | 'solana' | 'coinGecko'
): Promise<string | null> {
  return secureGet(keyName(which));
}
