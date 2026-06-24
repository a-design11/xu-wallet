// mobile/services/accountService.ts
// Multi-wallet-group + BIP44 sub-account management.
//
// Architecture:
//   WalletGroup (independent seed phrase)
//     └── Account 1  (BIP44 m/44'/60'/0'/0/0)
//     └── Account 2  (BIP44 m/44'/60'/1'/0/0)
//   WalletGroup (different seed phrase)
//     └── Account 1
//     └── ...
//
// Each group is completely isolated — tokens, addresses and keys never mix.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { ethers } from 'ethers';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { mnemonicToSeedSync, validateMnemonic } from 'bip39';
import bs58 from 'bs58';
import type { WalletAddresses } from './walletService';

// ─── Platform-aware storage ───────────────────────────────────────────────────

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key).catch(() => null);
  return SecureStore.getItemAsync(key).catch(() => null);
}
async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { await AsyncStorage.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
}
async function secureDel(key: string): Promise<void> {
  if (Platform.OS === 'web') { await AsyncStorage.removeItem(key).catch(() => null); return; }
  await SecureStore.deleteItemAsync(key).catch(() => null);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletGroup {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export type AccountType = 'hd';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  walletGroupId: string;  // isolates which seed this account comes from
  accountIndex: number;   // BIP44 account-level index
  addresses: WalletAddresses;
  createdAt: number;
  color: string;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const GROUPS_KEY   = 'xu_wallet_groups_v1';
const ACCOUNTS_KEY = 'xu_wallet_accounts_v2'; // v2 avoids clash with old format
const ACTIVE_KEY   = 'xu_wallet_active_account_v1';
const SEEDS_KEY    = 'xu_wallet_seeds_v1';    // SecureStore JSON {groupId→mnemonic}

// Legacy keys — read only for migration
const LEGACY_ACCOUNTS_KEY  = 'xu_wallet_accounts_v1';
const LEGACY_MNEMONICS_KEY = 'xu_wallet_account_mnemonics_v1';

// ─── Colors ───────────────────────────────────────────────────────────────────

export const GROUP_COLORS = [
  '#F2613D', '#7A5CFF', '#3DDC97', '#F2B23D',
  '#E5484D', '#3D9CF2', '#C13DF2', '#3DF2E0',
];

const ACCOUNT_COLORS = [
  '#F2613D', '#7A5CFF', '#3DDC97', '#F2B23D',
  '#E5484D', '#3D9CF2', '#C13DF2', '#3DF2E0',
  '#F0B90B', '#00D18C', '#FF6B6B', '#A78BFA',
];

export function pickGroupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

export function pickAccountColor(index: number): string {
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isValidMnemonic(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/);
  if (words.length !== 12 && words.length !== 24) return false;
  return validateMnemonic(phrase.trim());
}

// ─── Derivation ───────────────────────────────────────────────────────────────

async function deriveSolanaForIndex(seed: Uint8Array, accountIndex: number): Promise<string> {
  // Each sub-account gets a unique Solana address by XOR-ing the account index into the seed slice
  const base = seed.slice(0, 32);
  const varied = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    varied[i] = base[i] ^ ((accountIndex >> ((i % 4) * 8)) & 0xff);
  }
  const priv = sha512(varied).slice(0, 32);
  const pub = await ed.getPublicKeyAsync(priv);
  return bs58.encode(new Uint8Array([...pub]));
}

export async function deriveAddressesForIndex(
  mnemonic: string,
  accountIndex: number,
): Promise<WalletAddresses> {
  const seed = mnemonicToSeedSync(mnemonic);
  const evmPath = `m/44'/60'/${accountIndex}'/0/0`;
  const hd = ethers.HDNodeWallet.fromSeed(seed).derivePath(evmPath);
  const evmAddress = hd.address;
  const solana = await deriveSolanaForIndex(seed, accountIndex);
  return { rustox: evmAddress, ethereum: evmAddress, bnb: evmAddress, polygon: evmAddress, solana };
}

// ─── Seeds storage ────────────────────────────────────────────────────────────

async function loadSeedsMap(): Promise<Record<string, string>> {
  const raw = await secureGet(SEEDS_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, string>; } catch { return {}; }
}

async function saveSeedsMap(map: Record<string, string>): Promise<void> {
  await secureSet(SEEDS_KEY, JSON.stringify(map));
}

export async function getSeedForGroup(groupId: string): Promise<string | null> {
  const map = await loadSeedsMap();
  return map[groupId] ?? null;
}

// ─── Groups storage ───────────────────────────────────────────────────────────

async function loadGroupsRaw(): Promise<WalletGroup[]> {
  const raw = await AsyncStorage.getItem(GROUPS_KEY).catch(() => null);
  if (!raw) return [];
  try { return JSON.parse(raw) as WalletGroup[]; } catch { return []; }
}

async function saveGroupsRaw(groups: WalletGroup[]): Promise<void> {
  await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

// ─── Accounts storage ─────────────────────────────────────────────────────────

async function loadAccountsRaw(): Promise<Account[]> {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY).catch(() => null);
  if (!raw) return [];
  try { return JSON.parse(raw) as Account[]; } catch { return []; }
}

async function saveAccountsRaw(accounts: Account[]): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ─── Migration from legacy v1 format ─────────────────────────────────────────

interface LegacyAccount {
  id: string;
  name: string;
  type: 'hd' | 'imported';
  accountIndex: number;
  addresses: WalletAddresses;
  createdAt: number;
  color: string;
}

async function runMigration(
  masterMnemonic: string,
  masterAddresses: WalletAddresses,
): Promise<{ groups: WalletGroup[]; accounts: Account[]; activeAccountId: string }> {
  const groups: WalletGroup[] = [];
  const accounts: Account[] = [];
  const seedsMap: Record<string, string> = {};

  // group_0 = original master wallet
  const group0: WalletGroup = {
    id: 'group_0',
    name: 'My Wallet',
    color: GROUP_COLORS[0],
    createdAt: Date.now(),
  };
  groups.push(group0);
  seedsMap['group_0'] = masterMnemonic;

  const legacyRaw = await AsyncStorage.getItem(LEGACY_ACCOUNTS_KEY).catch(() => null);
  const legacy: LegacyAccount[] = legacyRaw ? JSON.parse(legacyRaw) : [];

  const legacyMnemonicsRaw = await secureGet(LEGACY_MNEMONICS_KEY);
  const legacyMnemonics: Record<string, string> = legacyMnemonicsRaw
    ? JSON.parse(legacyMnemonicsRaw) : {};

  if (legacy.length === 0) {
    accounts.push({
      id: 'group_0_acc_0',
      name: 'Account 1',
      type: 'hd',
      walletGroupId: 'group_0',
      accountIndex: 0,
      addresses: masterAddresses,
      createdAt: Date.now(),
      color: ACCOUNT_COLORS[0],
    });
  } else {
    for (const la of legacy) {
      if (la.type === 'hd') {
        accounts.push({
          id: `group_0_acc_${la.accountIndex}`,
          name: la.name,
          type: 'hd',
          walletGroupId: 'group_0',
          accountIndex: la.accountIndex,
          addresses: la.addresses,
          createdAt: la.createdAt,
          color: la.color,
        });
      } else if (la.type === 'imported') {
        const mnemonic = legacyMnemonics[la.id];
        if (mnemonic) {
          const gid = `group_imp_${la.id}`;
          groups.push({
            id: gid,
            name: la.name,
            color: pickGroupColor(groups.length),
            createdAt: la.createdAt,
          });
          seedsMap[gid] = mnemonic;
          accounts.push({
            id: `${gid}_acc_0`,
            name: 'Account 1',
            type: 'hd',
            walletGroupId: gid,
            accountIndex: 0,
            addresses: la.addresses,
            createdAt: la.createdAt,
            color: la.color,
          });
        }
      }
    }
  }

  await saveGroupsRaw(groups);
  await saveAccountsRaw(accounts);
  await saveSeedsMap(seedsMap);
  const firstId = accounts[0].id;
  await AsyncStorage.setItem(ACTIVE_KEY, firstId);
  return { groups, accounts, activeAccountId: firstId };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function loadAllWalletData(
  masterMnemonic: string | null,
  masterAddresses: WalletAddresses | null,
): Promise<{ groups: WalletGroup[]; accounts: Account[]; activeAccountId: string | null }> {
  const [groupsRaw, accountsRaw, activeId] = await Promise.all([
    loadGroupsRaw(),
    loadAccountsRaw(),
    AsyncStorage.getItem(ACTIVE_KEY).catch(() => null),
  ]);

  if (groupsRaw.length > 0 && accountsRaw.length > 0) {
    return { groups: groupsRaw, accounts: accountsRaw, activeAccountId: activeId };
  }

  if (masterMnemonic && masterAddresses) {
    return runMigration(masterMnemonic, masterAddresses);
  }

  return { groups: [], accounts: [], activeAccountId: null };
}

export async function setActiveAccountId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, id);
}

/**
 * Initialize the very first wallet group when a user completes onboarding.
 */
export async function initFirstWalletGroup(
  mnemonic: string,
  addresses: WalletAddresses,
): Promise<{ group: WalletGroup; account: Account }> {
  const group: WalletGroup = {
    id: 'group_0',
    name: 'My Wallet',
    color: GROUP_COLORS[0],
    createdAt: Date.now(),
  };
  const account: Account = {
    id: 'group_0_acc_0',
    name: 'Account 1',
    type: 'hd',
    walletGroupId: 'group_0',
    accountIndex: 0,
    addresses,
    createdAt: Date.now(),
    color: ACCOUNT_COLORS[0],
  };
  await Promise.all([
    saveGroupsRaw([group]),
    saveAccountsRaw([account]),
    saveSeedsMap({ group_0: mnemonic }),
    AsyncStorage.setItem(ACTIVE_KEY, account.id),
  ]);
  return { group, account };
}

/**
 * Import a new seed phrase as a brand-new wallet group.
 * Account 1 (BIP44 index 0) is created automatically.
 */
export async function addWalletGroup(
  mnemonic: string,
  groupName: string,
  existingGroups: WalletGroup[],
  existingAccounts: Account[],
): Promise<{ group: WalletGroup; account: Account }> {
  if (!isValidMnemonic(mnemonic)) throw new Error('Invalid seed phrase');
  const { deriveAddresses } = await import('./walletService');
  const addresses = await deriveAddresses(mnemonic.trim());

  const groupId = `group_${Date.now()}`;
  const group: WalletGroup = {
    id: groupId,
    name: groupName,
    color: pickGroupColor(existingGroups.length),
    createdAt: Date.now(),
  };
  const account: Account = {
    id: `${groupId}_acc_0`,
    name: 'Account 1',
    type: 'hd',
    walletGroupId: groupId,
    accountIndex: 0,
    addresses,
    createdAt: Date.now(),
    color: pickAccountColor(existingAccounts.length),
  };

  const seedsMap = await loadSeedsMap();
  seedsMap[groupId] = mnemonic.trim();
  await saveSeedsMap(seedsMap);
  await saveGroupsRaw([...existingGroups, group]);
  await saveAccountsRaw([...existingAccounts, account]);
  return { group, account };
}

/**
 * Add a BIP44 sub-account under an existing wallet group.
 * The new account is derived at the next available index using that group's seed.
 */
export async function addHdSubAccount(
  groupId: string,
  accountName: string,
  existingAccounts: Account[],
): Promise<Account> {
  const mnemonic = await getSeedForGroup(groupId);
  if (!mnemonic) throw new Error('Wallet seed not found for this group');

  const groupAccounts = existingAccounts.filter((a) => a.walletGroupId === groupId);
  const nextIndex = groupAccounts.length > 0
    ? Math.max(...groupAccounts.map((a) => a.accountIndex)) + 1
    : 1;

  const addresses = await deriveAddressesForIndex(mnemonic, nextIndex);
  const account: Account = {
    id: `${groupId}_acc_${nextIndex}_${Date.now()}`,
    name: accountName,
    type: 'hd',
    walletGroupId: groupId,
    accountIndex: nextIndex,
    addresses,
    createdAt: Date.now(),
    color: pickAccountColor(existingAccounts.length),
  };
  await saveAccountsRaw([...existingAccounts, account]);
  return account;
}

export async function renameAccount(
  accountId: string,
  name: string,
  existingAccounts: Account[],
): Promise<Account[]> {
  const updated = existingAccounts.map((a) => a.id === accountId ? { ...a, name } : a);
  await saveAccountsRaw(updated);
  return updated;
}

export async function renameGroup(
  groupId: string,
  name: string,
  existingGroups: WalletGroup[],
): Promise<WalletGroup[]> {
  const updated = existingGroups.map((g) => g.id === groupId ? { ...g, name } : g);
  await saveGroupsRaw(updated);
  return updated;
}

export async function deleteAccount(
  accountId: string,
  existingAccounts: Account[],
): Promise<Account[]> {
  if (existingAccounts.length <= 1) throw new Error('Cannot delete the last account');
  const updated = existingAccounts.filter((a) => a.id !== accountId);
  await saveAccountsRaw(updated);
  return updated;
}

export async function deleteWalletGroup(
  groupId: string,
  existingGroups: WalletGroup[],
  existingAccounts: Account[],
): Promise<{ groups: WalletGroup[]; accounts: Account[] }> {
  if (existingGroups.length <= 1) throw new Error('Cannot delete your last wallet');
  const newAccounts = existingAccounts.filter((a) => a.walletGroupId !== groupId);
  if (newAccounts.length === 0) throw new Error('Cannot delete — no accounts would remain');
  const newGroups = existingGroups.filter((g) => g.id !== groupId);
  await saveGroupsRaw(newGroups);
  await saveAccountsRaw(newAccounts);
  const seedsMap = await loadSeedsMap();
  delete seedsMap[groupId];
  await saveSeedsMap(seedsMap);
  return { groups: newGroups, accounts: newAccounts };
}

export async function clearAllAccounts(): Promise<void> {
  await AsyncStorage.multiRemove([GROUPS_KEY, ACCOUNTS_KEY, ACTIVE_KEY,
    LEGACY_ACCOUNTS_KEY]).catch(() => null);
  await secureDel(SEEDS_KEY);
  await secureDel(LEGACY_MNEMONICS_KEY);
}

export async function getMnemonicForAccount(
  accountId: string,
  accounts: Account[],
): Promise<string | null> {
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return null;
  return getSeedForGroup(acc.walletGroupId);
}

// ─── Compat: migrateToAccounts ────────────────────────────────────────────────
// Called from WalletContext.initWallet when there are no groups yet.

export async function migrateToAccounts(existingAddresses: WalletAddresses): Promise<Account> {
  const group: WalletGroup = {
    id: 'group_0',
    name: 'My Wallet',
    color: GROUP_COLORS[0],
    createdAt: Date.now(),
  };
  const account: Account = {
    id: 'group_0_acc_0',
    name: 'Account 1',
    type: 'hd',
    walletGroupId: 'group_0',
    accountIndex: 0,
    addresses: existingAddresses,
    createdAt: Date.now(),
    color: ACCOUNT_COLORS[0],
  };
  await saveGroupsRaw([group]);
  await saveAccountsRaw([account]);
  await setActiveAccountId(account.id);
  return account;
}
