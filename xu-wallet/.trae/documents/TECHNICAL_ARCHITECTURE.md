# XU × RustOx Wallet — Technical Architecture

> React Native (Expo SDK 55) + TypeScript, native Android APK build.

## 1. High-level

```
┌───────────────────────────────────────────────────────────────────────┐
│                              UI (RN)                                  │
│   app/  ·  components/  ·  context/WalletContext                       │
│   ·  expo-router file-based navigation                                │
│   ·  Reanimated 4 + Gesture Handler                                   │
└──────────────────────────────┬────────────────────────────────────────┘
                               │ hooks
┌──────────────────────────────▼────────────────────────────────────────┐
│                      Domain services  (mobile/services)               │
│   walletService · chainService · priceService · swapService            │
│   walletConnect · phishing · tokenRegistry                             │
└────────────┬──────────────┬───────────────┬───────────────────────────┘
             │              │               │
   ┌─────────▼─────┐ ┌──────▼────────┐ ┌────▼────────────────┐
   │  Crypto core   │ │   RPC layer   │ │   Aggregator APIs   │
   │ ethers v6      │ │ multi-endpoint│ │ 1inch · 0x · CG     │
   │ @noble/ed25519 │ │ failover      │ │ CoinGecko · Pyth    │
   │ bip39 · BS58   │ │              │ │                      │
   └────────────────┘ └──────┬────────┘ └──────────────────────┘
                            │
                ┌───────────▼────────────┐
                │   Public chain RPCs    │
                │ RustOx · ETH · BNB    │
                │ Polygon · Solana       │
                └────────────────────────┘
```

## 2. Module layout

```
mobile/
  services/
    walletService.ts        BIP-39 → seed → HD derivation
    chainService.ts         chain meta, multi-RPC, native balance
    priceService.ts         CoinGecko + Pyth fallback
    swapService.ts          1inch / 0x quote aggregation
    walletConnect.ts        WalletConnect v2 relay client
    phishing.ts             domain blocklist cache
    tokenRegistry.ts        token registry (chain, addr, decimals, logo)
    secureStorage.ts        SecureStore wrapper (PIN hash, keys)
  security/
    pinAttempts.ts          failed-attempt counter, lockout
    seedGuard.ts            in-memory wipe on background
    decrypt.ts              helpers
  theme/
    tokens.ts               color, spacing, radius, type, motion
    primitives/             Box, Stack, Text, Pressable, Icon
  hooks/
    useDebounce.ts
    useBalance.ts
    useTokenList.ts
app/
  _layout.tsx               root providers (SafeArea, Theme, Wallet)
  index.tsx                 splash → router gate
  onboarding/
    welcome.tsx
    create.tsx
    import.tsx
    set-pin.tsx
    recovery.tsx
    confirm-recovery.tsx
  tabs/
    _layout.tsx             bottom nav
    home/index.tsx
    swap/index.tsx
    browser/index.tsx
    settings/index.tsx
  send/index.tsx
  receive/index.tsx
  token/[id].tsx
  dapp/[host].tsx
  settings/
    networks.tsx
    security.tsx
    about.tsx
  vaults/                   Safe-style multisig (P2)
components/                 pin-input, token-list-item, bottom-nav, etc.
```

## 3. State management

- **Global:** React Context (`WalletContext`) for wallet, balances, settings.
- **Local:** component state + `useReducer` for forms.
- **Cache:** tiny in-memory LRU + AsyncStorage for non-sensitive prefs.
- **No Redux** — over-engineered for this surface.

## 4. Security model

- **Keys:** generated from BIP-39 mnemonic using ethers HDNode and
  `@noble/ed25519`. Stored only inside Expo `SecureStore` (Android Keystore
  on Android, Keychain on iOS).
- **PIN:** SHA-256 (WebCrypto via `expo-crypto`) of `pin + per-install salt`
  stored in `SecureStore`. PIN never leaves memory longer than the active
  flow; cleared on `AppState` background.
- **Biometric:** gates unlock and signing; falls back to PIN.
- **dApp:** every signature request shows decoded calldata + domain warning
  when the origin is not on the allow-list.
- **Crash safety:** `index.js` captures startup errors and renders a native
  fallback screen (already implemented upstream).

## 5. RPC + API strategy

| Layer        | Primary                              | Fallback                                 |
|--------------|--------------------------------------|------------------------------------------|
| RustOx RPC   | `https://rpc.rustox.io`              | `https://rpc-backup.rustox.io`           |
| Ethereum     | Alchemy                              | Infura · PublicNode                       |
| BNB          | BNB Greenfield public                | Ankr                                      |
| Polygon      | Alchemy                              | PublicNode                                |
| Solana       | Helius                               | Triton                                    |
| Price        | CoinGecko Pro                        | Binance public · Pyth on-chain            |
| Swap         | 1inch v6.0                           | 0x · ParaSwap                             |
| Explorer     | Blockscout self-hosted               | Etherscan family (where API key applies) |
| WC relay     | `relay.walletconnect.org`            | n/a                                       |

- **Multi-endpoint RPC** with health tracking and round-robin per call.
- **API keys** loaded from (a) `.env` (`EXPO_PUBLIC_*`) and (b) in-app settings
  (overrides env). Never bundled into release builds unless explicitly set.

## 6. Build pipeline

- **Dev:** `npx expo start`.
- **Local APK:** `cd android && ./gradlew :app:assembleRelease`.
- **CI APK:** EAS Build `apk` profile (project ID already in `app.json`).
- **Signing:** debug keystore committed for dev; release keystore supplied
  via `android/gradle.properties` from CI secrets.

## 7. RustOx chain specification

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| Chain name         | RustOx Mainnet                             |
| Symbol             | ROX                                        |
| Decimals           | 18                                         |
| Chain ID           | `0x5258` (21080)                           |
| RPC                | `https://rpc.rustox.io`                    |
| WSS                | `wss://rpc.rustox.io/ws`                   |
| Explorer           | `https://explorer.rustox.io`               |
| EVM equivalent     | Pre-merge Ethereum JSON-RPC + EIP-1559     |
| Pre-compiles       | `0x01..0x09` (standard)                    |
| Native bridge      | RustOx Bridge contract (RustOx ↔ Ethereum) |

> Replace placeholder URLs with the production endpoints when DNS is live.

## 8. Performance budget

| Metric                        | Budget |
|-------------------------------|--------|
| Cold start to interactive     | ≤ 1.6 s |
| Tab switch                    | ≤ 200 ms |
| Pull-to-refresh roundtrip     | ≤ 4 s |
| Send flow end-to-end          | ≤ 6 s |
| APK size                      | ≤ 45 MB |
| Frame budget                  | 16 ms (60 fps) |

## 9. Observability

- **Logs:** `react-native-logs` console + file (dev only).
- **Crash:** Sentry (Phase 2 — opt-in, no PII).
- **Telemetry:** custom in-app event bus; no third-party SDK in Phase 1.

## 10. Risk register

| Risk                                          | Mitigation                                     |
|-----------------------------------------------|------------------------------------------------|
| RPC single-point-of-failure                   | Multi-endpoint failover                        |
| Lost seed = lost funds                        | Mandatory backup quiz, warning modals          |
| Phishing dApp                                 | Blocklist + origin verification                |
| App store policy (Google Play crypto)         | Declare non-custodial; no on-ramp in Phase 1   |
| Key-store compromise on rooted device         | Detect root, refuse to sign with sensitive ops |