// mobile/services/chainService.ts
// Multi-chain service with RustOx first-party integration.
// Uses ethers v6 + multi-endpoint RPC failover.

import { ethers } from 'ethers';

export type Chain = 'rustox' | 'ethereum' | 'bnb' | 'polygon' | 'solana';
export type Network = 'mainnet' | 'testnet';

export interface ChainMeta {
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
  isEVM: boolean;
  explorer: string;
  /** environment variable holding the primary RPC URL */
  rpcEnv: string;
  /** fallback RPC env */
  rpcBackupEnv?: string;
  /** accent color in the design system */
  accent: string;
  coingeckoId: string;
}

export const CHAIN_META: Record<Chain, ChainMeta> = {
  rustox: {
    name: 'RustOx',
    symbol: 'ROX',
    decimals: 18,
    chainId: 21080,
    isEVM: true,
    explorer: 'https://explorer.rustox.io',
    rpcEnv: 'EXPO_PUBLIC_RUSTOX_RPC',
    rpcBackupEnv: 'EXPO_PUBLIC_RUSTOX_BACKUP_RPC',
    accent: '#F2613D',
    coingeckoId: 'rustox',
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    chainId: 1,
    isEVM: true,
    explorer: 'https://etherscan.io',
    rpcEnv: 'EXPO_PUBLIC_RPC_ETH',
    rpcBackupEnv: 'EXPO_PUBLIC_INFURA_KEY',
    accent: '#7A5CFF',
    coingeckoId: 'ethereum',
  },
  bnb: {
    name: 'BNB Chain',
    symbol: 'BNB',
    decimals: 18,
    chainId: 56,
    isEVM: true,
    explorer: 'https://bscscan.com',
    rpcEnv: 'EXPO_PUBLIC_RPC_BNB',
    accent: '#F0B90B',
    coingeckoId: 'binancecoin',
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    chainId: 137,
    isEVM: true,
    explorer: 'https://polygonscan.com',
    rpcEnv: 'EXPO_PUBLIC_RPC_POLYGON',
    accent: '#8247E5',
    coingeckoId: 'matic-network',
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
    chainId: 0,
    isEVM: false,
    explorer: 'https://solscan.io',
    rpcEnv: 'EXPO_PUBLIC_RPC_SOLANA',
    accent: '#3DDC97',
    coingeckoId: 'solana',
  },
};

// ─── RPC URL resolution ────────────────────────────────────────────────

function resolveRpc(chain: Chain, network: Network): string {
  const m = CHAIN_META[chain];
  if (chain === 'solana') {
    if (network === 'testnet') return 'https://api.devnet.solana.com';
    const k = (process.env.EXPO_PUBLIC_HELIUS_API_KEY ?? '').trim();
    return k
      ? `https://mainnet.helius-rpc.com/?api-key=${k}`
      : 'https://api.mainnet-beta.solana.com';
  }
  const env = (process.env as any)[m.rpcEnv] as string | undefined;
  if (env && env.length > 0) return env;
  // free fallbacks
  switch (chain) {
    case 'rustox':
      return network === 'testnet'
        ? 'https://rpc.testnet.rustox.io'
        : 'https://rpc.rustox.io';
    case 'ethereum':
      return network === 'testnet'
        ? 'https://ethereum-sepolia.publicnode.com'
        : 'https://ethereum-rpc.publicnode.com';
    case 'bnb':
      return network === 'testnet'
        ? 'https://bsc-testnet-rpc.publicnode.com'
        : 'https://bsc-dataseed.binance.org';
    case 'polygon':
      return network === 'testnet'
        ? 'https://polygon-amoy-rpc.publicnode.com'
        : 'https://polygon-bor-rpc.publicnode.com';
  }
}

const providerCache = new Map<string, ethers.JsonRpcProvider>();

function evmProvider(chain: Chain, network: Network): ethers.JsonRpcProvider {
  const key = `${chain}:${network}`;
  const cached = providerCache.get(key);
  if (cached) return cached;
  const url = resolveRpc(chain, network);
  const p = new ethers.JsonRpcProvider(url, CHAIN_META[chain].chainId, {
    staticNetwork: true,
    batchMaxCount: 5,
  });
  providerCache.set(key, p);
  return p;
}

// ─── Native balances ───────────────────────────────────────────────────

export async function getNativeBalance(
  chain: Chain,
  address: string,
  network: Network = 'mainnet'
): Promise<number> {
  if (!address) return 0;
  if (chain === 'solana') {
    // Lightweight JSON-RPC to Solana; balances returned in lamports.
    const rpc = resolveRpc('solana', network);
    const r = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      }),
    });
    const j = await r.json();
    const lamports = Number(j?.result?.value ?? 0);
    return lamports / 1e9;
  }
  const provider = evmProvider(chain, network);
  const bal = await provider.getBalance(address);
  return Number(ethers.formatEther(bal));
}

// ERC-20 minimal ABI (balanceOf + decimals + symbol + name)
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

export async function getErc20Balance(
  chain: Chain,
  tokenAddress: string,
  holder: string,
  decimals = 18,
  network: Network = 'mainnet'
): Promise<number> {
  if (!tokenAddress || !holder || chain === 'solana') return 0;
  const provider = evmProvider(chain, network);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const raw = (await contract.balanceOf(holder)) as bigint;
  return Number(ethers.formatUnits(raw, decimals));
}

export async function getErc20Meta(
  chain: Chain,
  tokenAddress: string,
  network: Network = 'mainnet'
): Promise<{ symbol: string; name: string; decimals: number } | null> {
  if (chain === 'solana') return null;
  try {
    const provider = evmProvider(chain, network);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const [symbol, name, decimals] = await Promise.all([
      contract.symbol(),
      contract.name(),
      contract.decimals(),
    ]);
    return {
      symbol: String(symbol),
      name: String(name),
      decimals: Number(decimals),
    };
  } catch {
    return null;
  }
}

export async function getGasPrice(
  chain: Chain,
  network: Network = 'mainnet'
): Promise<{ baseFee: number; priority: number } | null> {
  if (chain === 'solana') return null;
  try {
    const provider = evmProvider(chain, network);
    const fee = await provider.getFeeData();
    return {
      baseFee: Number(ethers.formatUnits(fee.maxFeePerGas ?? 0n, 'gwei')),
      priority: Number(ethers.formatUnits(fee.maxPriorityFeePerGas ?? 0n, 'gwei')),
    };
  } catch {
    return null;
  }
}

// ─── EVM explorer / tx links ───────────────────────────────────────────

export function explorerTxUrl(chain: Chain, hash: string, network: Network = 'mainnet') {
  const base = CHAIN_META[chain].explorer;
  const prefix = network === 'testnet' ? `${base}/tx` : `${base}/tx`;
  return `${prefix}/${hash}`;
}

export function explorerAddressUrl(chain: Chain, address: string, network: Network = 'mainnet') {
  const base = CHAIN_META[chain].explorer;
  return `${base}/address/${address}`;
}

// Re-exports for backwards-compat with the legacy context module
export { CHAIN_META as default };