# XU × RustOx Wallet — Product Requirements Document (PRD)

> **Version:** 2.0 · **Status:** Approved for implementation · **Owner:** XU Wallet Product
> **Target parity:** Safe (Gnosis Safe) · Trust Wallet · TokenPocket · MetaMask
> **Primary distribution:** Android APK (React Native + Expo SDK 55)
> **First-party chain launch:** **RustOx** — EVM-compatible L1/L2

---

## 1. Vision

XU Wallet is the **flagship mobile entry-point for the RustOx blockchain** and a
**best-in-class multi-chain self-custody wallet**. It pairs the UX polish of
Trust Wallet and TokenPocket with the institutional-grade multisig and signing
discipline of Safe. Every shipped feature must satisfy three constraints:

1. **Trustworthy** — keys never leave the Secure Enclave / Keystore; users
   understand exactly what they sign.
2. **Useful on day one** — RustOx accounts, gas, swaps, staking and a curated
   dApp launcher are live the moment the APK installs.
3. **Beautiful** — premium typography, motion, and information density that
   feels like a $1B fintech app.

## 2. Target Users

| Persona              | Need                                                      | Wallet surface used                              |
|----------------------|-----------------------------------------------------------|--------------------------------------------------|
| **Crypto newcomer**  | "Just send and receive safely"                            | Onboarding, Home, Send/Receive                   |
| **DeFi power user**  | Multi-chain swap, LP, perps, yield                        | Home, Swap, Browser, dApp                        |
| **Web3 developer**   | Testnet access, custom RPC, raw tx, WalletConnect v2      | Settings → Networks, dApp Browser                |
| **Treasury / team**  | Multi-sig (Safe-style), role separation, audit trail      | **Vaults** tab (Safe parity)                      |
| **RustOx native**    | Bridge, stake, governance, name service                   | RustOx tab, Earn tab, Identity tab                |

## 3. Competitive Parity Matrix

| Capability                                | Safe | Trust | TokenPocket | MetaMask | **XU v2** |
|-------------------------------------------|:----:|:-----:|:-----------:|:--------:|:---------:|
| Non-custodial EVM                         |  ✅   |  ✅    |     ✅       |    ✅     |    ✅      |
| Multi-chain (≥ 4 EVM + Solana)            |  ✅   |  ✅    |     ✅       |    ✅     |    ✅      |
| **First-party L1 (RustOx)**               |  ❌   |  ✅    |     ✅       |    ❌     |    ✅      |
| In-app Swap                               |  ❌   |  ✅    |     ✅       |    ✅     |    ✅      |
| WalletConnect v2                          |  ✅   |  ✅    |     ✅       |    ✅     |    ✅      |
| Multi-sig / Vaults                        |  ✅   |  ❌    |     ❌       |    ✅     |    ✅      |
| Hardware-wallet (Ledger / Keystone)       |  ✅   |  ✅    |     ✅       |    ✅     |    ✅ (P2) |
| dApp Browser with phishing detection       |  ❌   |  ✅    |     ✅       |    ✅     |    ✅      |
| Stake / Earn                              |  ❌   |  ✅    |     ✅       |    ✅     |    ✅      |
| NFT gallery                               |  ✅   |  ✅    |     ✅       |    ✅     |    ✅ (P2) |
| Fiat on-ramp                              |  ❌   |  ✅    |     ✅       |    ✅     |    ✅ (P2) |
| Push / Notification                        |  ❌   |  ✅    |     ✅       |    ✅     |    ✅ (P2) |
| **Premium design system**                  |  ⚪   |  ✅    |     ✅       |    ⚪     |    ✅      |

> Legend: ✅ done, ⚪ partial, ❌ missing. **P2** = planned in Phase 2.

## 4. Functional Requirements (Phase 1 — APK launch)

### 4.1 Onboarding
- **Splash** with animated RustOx bull-mark logo.
- **Welcome** carousel: 3 slides (Self-custody · Multi-chain · Built for RustOx).
- **Choose path:** *Create new* · *Import seed phrase* · *Import private key* ·
  *Watch-only address*.
- **PIN setup** — 6 digits, confirm, with biometric option (FaceID / Fingerprint).
- **Recovery** — display 12 / 15 / 18 / 24-word mnemonic, copy-disabled, reveal
  confirmation quiz.
- **Optional** — enable cloud backup (encrypted with device passcode, opt-in).

### 4.2 Wallet management
- **Multi-account** per chain (unlimited HD derivation paths).
- **Wallet names** + customisable accent colour per account.
- **Hide balance** global toggle.
- **Network switcher** in header: RustOx · Ethereum · BNB · Polygon · Solana
  + *Add custom RPC* (chainId, RPC URL, currency symbol, explorer URL, logo).
- **Lock** — auto-lock (off / 1 / 5 / 15 / 60 min) + biometric unlock.

### 4.3 Portfolio / Home
- **Total balance** card (USD), 24h delta, sparkline.
- **Quick actions:** Send · Receive · Swap · Buy.
- **Asset list** — logo · symbol · balance · USD · 24h % · 7d sparkline.
- **Tabs by chain** — All · RustOx · EVM · Solana.
- **Pull-to-refresh**, last-updated timestamp, "stale > 60 s" badge.

### 4.4 Send / Receive
- **Send:** address book + ENS / RNS / SNS resolution; token picker;
  amount + fiat; gas selector (Slow / Normal / Fast); EIP-1559 max fee + tip;
  hardware-wallet passthrough; PIN/biometric confirm; in-app block-explorer link.
- **Receive:** QR (logo-embedded), address copy, *amount request* with deep link.

### 4.5 Swap
- Aggregated router (1inch first, 0x fallback, ParaSwap fallback).
- Quote refresh every 10 s, slippage selector (0.1 / 0.5 / 1 / 3 %), MEV-protection toggle.
- Approval flow shows exact spender and method.

### 4.6 dApp Browser
- WebView with URL bar, search engine fallback (DuckDuckGo), bookmarks,
  WalletConnect v2, phishing blocklist (MetaMask `eth-phishing-detect` mirror).

### 4.7 Settings
- **Security:** change PIN, change password, biometric, auto-lock, hidden wallet
  (separate PIN opens decoy account).
- **Networks:** built-in + custom RPC manager.
- **Backup:** re-display seed (PIN required).
- **Connected sites** — list + revoke.
- **About** — version, build hash, licence, attributions.

### 4.8 RustOx first-class features
- **RustOx tab** on home, distinct accent (rust-orange `#F2613D`).
- **Bridge** in-dapp to/from Ethereum mainnet.
- **Stake ROX** — native validator staking UI.
- **Name service** `*.rox` lookup & registration.
- **Gas tracker** — live base fee, next-block priority, "sponsored by relayer"
  toggle if user holds ROX gas credit.

## 5. Non-functional Requirements

| Area           | Target                                                                 |
|----------------|------------------------------------------------------------------------|
| Cold start     | ≤ 1.6 s on Pixel 6                                                     |
| Bundle size    | ≤ 45 MB (universal APK)                                                |
| Crash-free     | ≥ 99.5 % over rolling 7 days                                            |
| Accessibility  | WCAG 2.1 AA contrast, Dynamic-Type, 48 dp touch targets                |
| Localisation   | EN (launch) · ZH · ES · JA · KO · HI · PT-BR · RU (Phase 2)            |
| Privacy        | No analytics SDK reads seed, address or balance without consent        |
| Security       | OWASP MASVS L1 + L2; annual third-party pen-test                      |
| Availability   | ≥ 99.9 % RPC aggregate (multi-endpoint fallback)                       |

## 6. Design Direction

- **Aesthetic:** *editorial-crypto*. High-contrast neutral background
  (`#0B0B0F`), rust-orange accent (`#F2613D`) for RustOx, electric-violet
  (`#7A5CFF`) for EVM, mint (`#3DDC97`) for Solana.
- **Typography:** display = *Söhne Breit* (or fallback *Manrope*),
  body = *Inter Tight*, mono = *JetBrains Mono*.
- **Motion:** spring-driven, 250 ms default; staggered list reveals;
  hero entrance animation ≤ 600 ms.
- **Information density:** Trust Wallet-style. No padding-only hero screens.

## 7. Success Metrics

- **Activation:** ≥ 70 % of installs complete onboarding within 24 h.
- **Retention:** D7 ≥ 35 %, D30 ≥ 18 %.
- **Engagement:** ≥ 1 tx / wallet / week after week 2.
- **NPS:** ≥ 55 within 90 days of GA.
- **RustOx share:** ≥ 30 % of new wallets transact on RustOx in month 1.

## 8. Out of Scope (Phase 1)

- iOS native build (Expo config present, signing deferred).
- Fiat on-ramp aggregator (banking partner TBD).
- NFT gallery v1.
- Push notifications (FCM integration deferred to Phase 2).
- Hardware-wallet integration (Phase 2).