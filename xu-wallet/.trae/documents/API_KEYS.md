# XU × RustOx Wallet — API Keys & Provider Catalog

> All keys are loaded **at runtime** from `EXPO_PUBLIC_*` env vars (CI build)
> and/or the in-app *Settings → API Keys* screen (SecureStore override).
> Never bundle secrets into the APK; obfuscation is not security.

## 1. Recommended stack (production-grade)

### 1.1 RPC providers — multi-endpoint with failover

| Chain    | Primary                | Fallback              | Why                                     |
|----------|------------------------|-----------------------|-----------------------------------------|
| RustOx   | Self-hosted (Cloudflare) | Secondary node       | Cheapest, EVM-compatible                |
| Ethereum | **Alchemy**            | Infura · PublicNode   | Highest uptime, archive access          |
| BNB      | BNB Greenfield         | Ankr                  | Native, no rate-limit at small scale    |
| Polygon  | **Alchemy**            | PublicNode            | Polygon's preferred provider            |
| Solana   | **Helius**             | Triton · PublicNode   | Best DAS / token API                    |

> Recommended keys (set `EXPO_PUBLIC_*` in `eas.json` env or in-app):
> - `EXPO_PUBLIC_ALCHEMY_ETH_KEY`
> - `EXPO_PUBLIC_ALCHEMY_POLY_KEY`
> - `EXPO_PUBLIC_HELIUS_API_KEY`
> - `EXPO_PUBLIC_RUSTOX_RPC`  (primary)
> - `EXPO_PUBLIC_RUSTOX_BACKUP_RPC`

### 1.2 Prices

| Provider       | Tier               | Use case                          |
|----------------|--------------------|-----------------------------------|
| **CoinGecko Pro** | Analyst / Pro      | Canonical USD prices, market cap  |
| Pyth Network   | Free on-chain      | On-chain price feeds (Solana + EVM) |
| Binance public | Free               | Real-time tick fallback            |

Env: `EXPO_PUBLIC_COINGECKO_API_KEY`.

### 1.3 Explorers / ABIs

| Chain    | Provider            | Env var                       |
|----------|---------------------|-------------------------------|
| ETH      | Etherscan           | `EXPO_PUBLIC_ETHERSCAN_API_KEY` |
| BNB      | BscScan             | `EXPO_PUBLIC_BSCSCAN_API_KEY`   |
| Polygon  | Polygonscan         | `EXPO_PUBLIC_POLYGONSCAN_API_KEY`|
| RustOx   | Blockscout (self)   | none                           |
| Solana   | Helius              | `EXPO_PUBLIC_HELIUS_API_KEY`    |

### 1.4 Swap / bridges

| Provider       | Auth                       | Notes                              |
|----------------|----------------------------|------------------------------------|
| **1inch v6**   | `EXPO_PUBLIC_ONEINCH_KEY`  | Best aggregation; gas-aware        |
| 0x Swap API    | `EXPO_PUBLIC_ZEROX_KEY`    | Great liquidity on long tail       |
| ParaSwap       | public                     | Fallback                           |
| LiFi           | public                     | Cross-chain bridge aggregator     |

### 1.5 WalletConnect

- Project ID: `EXPO_PUBLIC_WC_PROJECT_ID`
- Relay: `wss://relay.walletconnect.org` (default)

### 1.6 Phishing blocklist

- Mirror of `MetaMask/eth-phishing-detect` hosted on Cloudflare R2.
- Daily refresh via CI cron.

## 2. Free-tier fallback table

If a user has **no API keys configured** the wallet must still work:

| Need        | Free fallback                                      |
|-------------|----------------------------------------------------|
| RPC         | Cloudflare-ETH, Polygon-Bor, Ankr, Solana Public   |
| Prices      | CoinGecko free tier (30 req/min) · Binance tick    |
| Explorer    | Blockscout / Etherscan free (5 req/s)              |
| Swap        | ParaSwap public                                    |
| WC          | works without key (rate-limited)                   |

## 3. `.env.example` (updated)

```ini
# ─── RPC ──────────────────────────────────────────────────────────────
EXPO_PUBLIC_RUSTOX_RPC=https://rpc.rustox.io
EXPO_PUBLIC_RUSTOX_BACKUP_RPC=https://rpc-backup.rustox.io
EXPO_PUBLIC_RUSTOX_EXPLORER=https://explorer.rustox.io
EXPO_PUBLIC_RUSTOX_CHAIN_ID=21080

EXPO_PUBLIC_ALCHEMY_ETH_KEY=
EXPO_PUBLIC_ALCHEMY_POLY_KEY=
EXPO_PUBLIC_INFURA_KEY=
EXPO_PUBLIC_HELIUS_API_KEY=
EXPO_PUBLIC_BNB_RPC=https://bsc-dataseed.binance.org

# ─── Prices ──────────────────────────────────────────────────────────
EXPO_PUBLIC_COINGECKO_API_KEY=
EXPO_PUBLIC_PYTH_HERMES=https://hermes.pyth.network

# ─── Explorers ───────────────────────────────────────────────────────
EXPO_PUBLIC_ETHERSCAN_API_KEY=
EXPO_PUBLIC_BSCSCAN_API_KEY=
EXPO_PUBLIC_POLYGONSCAN_API_KEY=

# ─── Swap / WC ──────────────────────────────────────────────────────
EXPO_PUBLIC_ONEINCH_KEY=
EXPO_PUBLIC_ZEROX_KEY=
EXPO_PUBLIC_WC_PROJECT_ID=
```

## 4. Security policy

1. **Never** ship production keys in a public repo.
2. **Always** provide a free-tier fallback path.
3. **In-app** Settings lets the user paste their own key — stored in
   SecureStore, never logged.
4. **CI** injects keys via EAS environment variables for release builds.