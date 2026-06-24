# RustOx Chain Specification (first-party)

> RustOx is the **first-party EVM chain** launched inside XU Wallet. The chain
> inherits the Ethereum JSON-RPC surface (EIP-1559, EIP-712, EIP-1193,
> EIP-3675) and adds RustOx-native precompiles.

## 1. Network parameters

| Field                | Mainnet                          | Testnet (Ox-Cali)              |
|----------------------|----------------------------------|--------------------------------|
| Chain ID             | `21080` (0x5258)                 | `21081` (0x5259)               |
| Currency symbol      | `ROX`                            | `tROX`                         |
| Decimals             | 18                               | 18                             |
| RPC HTTP             | `https://rpc.rustox.io`          | `https://rpc.testnet.rustox.io`|
| RPC WS               | `wss://rpc.rustox.io/ws`         | `wss://rpc.testnet.rustox.io/ws`|
| Explorer             | `https://explorer.rustox.io`     | `https://explorer.testnet.rustox.io`|
| Block time           | 2 s                              | 2 s                            |
| Finality             | 4 s (single-slot)                | 4 s                            |
| EVM version          | Shanghai                         | Shanghai                       |
| Pre-compiles         | 0x01–0x09                        | 0x01–0x09                      |

## 2. Token (ROX)

- **Contract:** none (native).
- **Bridge:** RustOx Bridge contracts on Ethereum, BNB, Arbitrum.
- **Distribution:** 40 % community · 25 % treasury · 20 % team (4y vest,
  1y cliff) · 15 % liquidity.

## 3. Bridge contract addresses (to publish)

```
RustOxBridge on RustOx:    0xB12E5a9F4d3c1C0eD7b1a3F9c8e2D6a4C7e8B910
RustOxBridge on Ethereum:  0xE17Ec1bE0eC8F8e1fA0e9D1a2b3c4D5e6F7A8B90
```

## 4. Pre-compile roadmap (RustOx-native)

| Address | Name                       | Status          |
|---------|----------------------------|-----------------|
| 0xA00…01 | `rox_nameHash`            | planned         |
| 0xA00…02 | `rox_verifySig`           | planned         |
| 0xA00…03 | `rox_stakingRewards`      | planned         |

## 5. Wallet integration

- Registered as **first-class** in `chainService.CHAINS`:
  ```ts
  rustox: {
    id: 21080,
    name: 'RustOx',
    symbol: 'ROX',
    decimals: 18,
    rpcEnv: 'EXPO_PUBLIC_RUSTOX_RPC',
    explorer: 'https://explorer.rustox.io',
    accent: '#F2613D',
    isEVM: true,
  }
  ```
- Default active chain on first launch for new wallets.
- Native balance + ERC-20 queries reuse the EVM pipeline (ethers v6).

## 6. First-party dApps curated at launch

| dApp          | Category    | URL                                  |
|---------------|-------------|--------------------------------------|
| RustOx Swap   | DEX         | https://swap.rustox.io               |
| RustOx Stake  | Staking     | https://stake.rustox.io              |
| RustOx Name   | Identity    | https://name.rustox.io               |
| RustOx Bridge | Bridge      | https://bridge.rustox.io             |

## 7. Validator economics (target)

- Min self-stake: **1,000 ROX**
- Max validators: **128**
- Block reward: **2 ROX** (year 1, halving every 2 years)
- Slashing: **5 %** for double-sign, **1 %** for downtime > 24 h.