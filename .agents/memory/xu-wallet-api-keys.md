---
name: XU Wallet API key storage
description: How Graph and CoinGecko API keys are stored — NOT via walletService.saveApiKey
---

The Graph API key and CoinGecko API key are stored directly in AsyncStorage.

**Keys:**
- Graph: `xu_wallet_graph_api_key_v1`
- CoinGecko: `xu_wallet_cg_api_key_v1`

**Why:** `walletService.saveApiKey` only accepts the typed union `'evm' | 'solana' | 'coinGecko'` — it cannot store arbitrary string-keyed entries. Using AsyncStorage directly avoids this constraint and keeps the tx history service self-contained.

**How to apply:** When reading/writing these keys in any screen or service, use `AsyncStorage.getItem/setItem` directly, not `walletService.getApiKey`. In `txHistoryService.ts`, call `setGraphApiKey()` after loading from AsyncStorage. In `priceService.ts`, call `setCoinGeckoApiKey()`.

**UI:** Settings screen (`app/tabs/settings/index.tsx`) has a bottom sheet modal for both keys with SET/NOT SET badge status.
