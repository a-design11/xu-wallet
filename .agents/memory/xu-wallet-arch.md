---
name: XU Wallet architecture
description: Multi-group BIP44 wallet architecture — storage keys, isolation rules, and key files.
---

# XU Wallet Multi-Group Architecture

**Why:** Users need multiple independent seed phrases with BIP44 sub-accounts under each, with strict per-chain token isolation.

## Storage keys
- `xu_wallet_groups_v1` — AsyncStorage, array of WalletGroup
- `xu_wallet_accounts_v2` — AsyncStorage, array of Account (v2 avoids clash with legacy)
- `xu_wallet_active_account_v1` — AsyncStorage, active account ID string
- `xu_wallet_seeds_v1` — SecureStore (web: AsyncStorage), JSON `{groupId → mnemonic}`

## Key types (accountService.ts)
- `WalletGroup { id, name, color, createdAt }`
- `Account { id, name, type: 'hd', walletGroupId, accountIndex, addresses, createdAt, color }`

## BIP44 derivation
- EVM: `m/44'/60'/<accountIndex>'/0/0` via ethers.HDNodeWallet
- Solana: XOR accountIndex into first 32 bytes of seed, then sha512 → ed25519

## Per-chain token isolation (ImportTokenSheet + WalletContext)
- Chain is locked at open time; user cannot change chain mid-import.
- EVM tokens fetched only from their own chain's RPC (getErc20Balance per chain).
- Solana SPL is Phase 2 — address validation only, no metadata lookup.

## How to apply
- When adding token features, respect chain isolation: use `rec.chain` as the key, never mix chains.
- When adding wallet features, add to WalletGroup/Account layers separately.
- Migration from legacy v1 format runs automatically in `loadAllWalletData` if no groups exist.
