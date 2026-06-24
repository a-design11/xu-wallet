// mobile/services/txHistoryService.ts
// Transaction history via The Graph (public subgraphs) + Etherscan-compatible APIs.
// Supports: Ethereum, BNB, Polygon, RustOx (EVM), Solana (Solscan REST).
// API key is optional — works on free public endpoints, better with a key.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Chain, Network } from './chainService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TxStatus = 'confirmed' | 'pending' | 'failed';
export type TxDirection = 'in' | 'out' | 'self';

export interface TxRecord {
  hash: string;
  chain: Chain;
  direction: TxDirection;
  status: TxStatus;
  fromAddress: string;
  toAddress: string;
  value: string;       // native token amount as string (already formatted)
  valueRaw: string;    // raw wei/lamport string
  symbol: string;      // native symbol e.g. ETH
  tokenSymbol?: string; // for ERC-20 transfers
  tokenName?: string;
  contractAddress?: string;
  gasUsed?: string;
  gasPrice?: string;
  gasCostEth?: string; // formatted gas cost in native token
  timestamp: number;   // unix seconds
  blockNumber?: number;
  explorerUrl: string;
}

// ─── Key storage ─────────────────────────────────────────────────────────────

const KEY_GRAPH  = 'xu_wallet_graph_api_key_v1';
const KEY_CACHE  = (addr: string, chain: Chain) => `xu_tx_cache_v1_${chain}_${addr.toLowerCase()}`;

let graphApiKey: string | null = null;

export function setGraphApiKey(key: string | null) {
  graphApiKey = key && key.trim() ? key.trim() : null;
  if (graphApiKey) {
    AsyncStorage.setItem(KEY_GRAPH, graphApiKey).catch(() => null);
  } else {
    AsyncStorage.removeItem(KEY_GRAPH).catch(() => null);
  }
}

export async function loadGraphApiKey(): Promise<string | null> {
  const k = await AsyncStorage.getItem(KEY_GRAPH).catch(() => null);
  if (k) graphApiKey = k;
  return k;
}

export function getGraphApiKey(): string | null { return graphApiKey; }

// ─── Explorer config ──────────────────────────────────────────────────────────

interface ExplorerConfig {
  apiUrl: string;
  explorerBase: string;
  nativeSymbol: string;
  nativeDecimals: number;
}

function explorerCfg(chain: Chain, network: Network): ExplorerConfig {
  switch (chain) {
    case 'ethereum':
      return {
        apiUrl: network === 'testnet'
          ? 'https://api-sepolia.etherscan.io/api'
          : 'https://api.etherscan.io/api',
        explorerBase: network === 'testnet' ? 'https://sepolia.etherscan.io' : 'https://etherscan.io',
        nativeSymbol: 'ETH', nativeDecimals: 18,
      };
    case 'bnb':
      return {
        apiUrl: network === 'testnet'
          ? 'https://api-testnet.bscscan.com/api'
          : 'https://api.bscscan.com/api',
        explorerBase: network === 'testnet' ? 'https://testnet.bscscan.com' : 'https://bscscan.com',
        nativeSymbol: 'BNB', nativeDecimals: 18,
      };
    case 'polygon':
      return {
        apiUrl: network === 'testnet'
          ? 'https://api-amoy.polygonscan.com/api'
          : 'https://api.polygonscan.com/api',
        explorerBase: network === 'testnet' ? 'https://amoy.polygonscan.com' : 'https://polygonscan.com',
        nativeSymbol: 'MATIC', nativeDecimals: 18,
      };
    case 'rustox':
      return {
        apiUrl: 'https://explorer.rustox.io/api',
        explorerBase: 'https://explorer.rustox.io',
        nativeSymbol: 'ROX', nativeDecimals: 18,
      };
    case 'solana':
      return {
        apiUrl: network === 'testnet'
          ? 'https://public-api.solscan.io'
          : 'https://public-api.solscan.io',
        explorerBase: 'https://solscan.io',
        nativeSymbol: 'SOL', nativeDecimals: 9,
      };
  }
}

// ─── The Graph subgraph URLs ───────────────────────────────────────────────────
// Falls back to Etherscan-compatible REST when Graph isn't available.

function graphUrl(chain: Chain, network: Network): string | null {
  if (chain === 'solana') return null; // Solana doesn't use The Graph
  const key = graphApiKey;
  switch (chain) {
    case 'ethereum':
      return key
        ? `https://gateway.thegraph.com/api/${key}/subgraphs/id/HQ1bPK7j9VM5EEJuEiXHFQMcNYS3ynwzB8GKs8iKNPSh`
        : null;
    case 'bnb':
      return key
        ? `https://gateway.thegraph.com/api/${key}/subgraphs/id/Bjpgs9rP7SPLk8PnBEzGjEhVsWXsgjzGGNW7YRByCfNF`
        : null;
    case 'polygon':
      return key
        ? `https://gateway.thegraph.com/api/${key}/subgraphs/id/HUZDsRpEVP2AvzDCyzDHtdc64dyDxx8FQjzsmqSg4H3B`
        : null;
    default:
      return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUnits(raw: string, decimals: number): string {
  try {
    const n = BigInt(raw);
    const d = BigInt(10) ** BigInt(decimals);
    const whole = n / d;
    const frac = n % d;
    const fracStr = frac.toString().padStart(decimals, '0').slice(0, 6);
    return `${whole}.${fracStr}`.replace(/\.?0+$/, '');
  } catch {
    return '0';
  }
}

function shortHex(h: string): string {
  if (h.length < 12) return h;
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

// ─── EVM via Etherscan-compatible API ─────────────────────────────────────────

async function fetchEvmTxns(
  address: string,
  chain: Chain,
  network: Network,
  page = 1,
  limit = 25,
): Promise<TxRecord[]> {
  const cfg = explorerCfg(chain, network);
  const apiKey = (process.env as any)[`EXPO_PUBLIC_${chain.toUpperCase()}_EXPLORER_KEY`] ?? '';

  const params = new URLSearchParams({
    module: 'account',
    action: 'txlist',
    address,
    startblock: '0',
    endblock: '99999999',
    page: String(page),
    offset: String(limit),
    sort: 'desc',
    ...(apiKey ? { apikey: apiKey } : {}),
  });

  try {
    const r = await fetch(`${cfg.apiUrl}?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return [];
    const j = await r.json();
    if (j.status !== '1' || !Array.isArray(j.result)) return [];

    return (j.result as any[]).map((tx): TxRecord => {
      const direction: TxDirection =
        tx.from?.toLowerCase() === address.toLowerCase()
          ? tx.to?.toLowerCase() === address.toLowerCase() ? 'self' : 'out'
          : 'in';
      const valueFormatted = formatUnits(tx.value ?? '0', cfg.nativeDecimals);
      const gasCost = tx.gasUsed && tx.gasPrice
        ? formatUnits(
            String(BigInt(tx.gasUsed) * BigInt(tx.gasPrice)),
            cfg.nativeDecimals,
          )
        : undefined;
      return {
        hash: tx.hash,
        chain,
        direction,
        status: tx.isError === '1' ? 'failed' : 'confirmed',
        fromAddress: tx.from ?? '',
        toAddress: tx.to ?? '',
        value: valueFormatted,
        valueRaw: tx.value ?? '0',
        symbol: cfg.nativeSymbol,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        gasCostEth: gasCost,
        timestamp: Number(tx.timeStamp),
        blockNumber: Number(tx.blockNumber),
        explorerUrl: `${cfg.explorerBase}/tx/${tx.hash}`,
      };
    });
  } catch {
    return [];
  }
}

async function fetchEvmTokenTxns(
  address: string,
  chain: Chain,
  network: Network,
  page = 1,
  limit = 25,
): Promise<TxRecord[]> {
  const cfg = explorerCfg(chain, network);
  const apiKey = (process.env as any)[`EXPO_PUBLIC_${chain.toUpperCase()}_EXPLORER_KEY`] ?? '';

  const params = new URLSearchParams({
    module: 'account',
    action: 'tokentx',
    address,
    startblock: '0',
    endblock: '99999999',
    page: String(page),
    offset: String(limit),
    sort: 'desc',
    ...(apiKey ? { apikey: apiKey } : {}),
  });

  try {
    const r = await fetch(`${cfg.apiUrl}?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return [];
    const j = await r.json();
    if (j.status !== '1' || !Array.isArray(j.result)) return [];

    return (j.result as any[]).map((tx): TxRecord => {
      const direction: TxDirection =
        tx.from?.toLowerCase() === address.toLowerCase()
          ? tx.to?.toLowerCase() === address.toLowerCase() ? 'self' : 'out'
          : 'in';
      const decimals = Number(tx.tokenDecimal ?? 18);
      return {
        hash: tx.hash,
        chain,
        direction,
        status: 'confirmed',
        fromAddress: tx.from ?? '',
        toAddress: tx.to ?? '',
        value: formatUnits(tx.value ?? '0', decimals),
        valueRaw: tx.value ?? '0',
        symbol: cfg.nativeSymbol,
        tokenSymbol: tx.tokenSymbol,
        tokenName: tx.tokenName,
        contractAddress: tx.contractAddress,
        timestamp: Number(tx.timeStamp),
        blockNumber: Number(tx.blockNumber),
        explorerUrl: `${cfg.explorerBase}/tx/${tx.hash}`,
      };
    });
  } catch {
    return [];
  }
}

// ─── Solana via Solscan ───────────────────────────────────────────────────────

async function fetchSolanaTxns(
  address: string,
  network: Network,
  limit = 25,
): Promise<TxRecord[]> {
  try {
    const apiBase = 'https://public-api.solscan.io';
    const r = await fetch(
      `${apiBase}/account/transactions?account=${address}&limit=${limit}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!r.ok) return [];
    const j = await r.json();
    if (!Array.isArray(j)) return [];

    return j.map((tx: any): TxRecord => {
      const isOutgoing = tx.signer?.includes(address);
      const lamports = tx.lamport ?? 0;
      const solValue = formatUnits(String(lamports), 9);
      return {
        hash: tx.txHash ?? tx.signature ?? '',
        chain: 'solana',
        direction: isOutgoing ? 'out' : 'in',
        status: tx.status === 'Success' ? 'confirmed' : tx.status === 'Fail' ? 'failed' : 'confirmed',
        fromAddress: tx.signer?.[0] ?? '',
        toAddress: '',
        value: solValue,
        valueRaw: String(lamports),
        symbol: 'SOL',
        timestamp: tx.blockTime ?? 0,
        blockNumber: tx.slot,
        explorerUrl: `https://solscan.io/tx/${tx.txHash ?? tx.signature}`,
      };
    });
  } catch {
    return [];
  }
}

// ─── The Graph query (when key available) ─────────────────────────────────────

async function fetchViaGraph(
  address: string,
  chain: Chain,
  limit = 25,
): Promise<TxRecord[] | null> {
  const url = graphUrl(chain, 'mainnet');
  if (!url) return null;
  const cfg = explorerCfg(chain, 'mainnet');
  const addr = address.toLowerCase();

  const query = `{
    transactions(
      first: ${limit}
      orderBy: timestamp
      orderDirection: desc
      where: { or: [{ from: "${addr}" }, { to: "${addr}" }] }
    ) {
      id hash from to value gasUsed gasPrice blockNumber timestamp status
    }
  }`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const txns = j?.data?.transactions;
    if (!Array.isArray(txns)) return null;

    return txns.map((tx: any): TxRecord => {
      const direction: TxDirection =
        tx.from?.toLowerCase() === addr
          ? tx.to?.toLowerCase() === addr ? 'self' : 'out'
          : 'in';
      return {
        hash: tx.hash ?? tx.id,
        chain,
        direction,
        status: tx.status === '0' ? 'failed' : 'confirmed',
        fromAddress: tx.from ?? '',
        toAddress: tx.to ?? '',
        value: formatUnits(tx.value ?? '0', cfg.nativeDecimals),
        valueRaw: tx.value ?? '0',
        symbol: cfg.nativeSymbol,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        gasCostEth: tx.gasUsed && tx.gasPrice
          ? formatUnits(String(BigInt(tx.gasUsed) * BigInt(tx.gasPrice)), cfg.nativeDecimals)
          : undefined,
        timestamp: Number(tx.timestamp),
        blockNumber: Number(tx.blockNumber),
        explorerUrl: `${cfg.explorerBase}/tx/${tx.hash ?? tx.id}`,
      };
    });
  } catch {
    return null;
  }
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const CACHE_TTL = 60 * 1000; // 1 min

async function readCache(addr: string, chain: Chain): Promise<TxRecord[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_CACHE(addr, chain));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data as TxRecord[];
  } catch {
    return null;
  }
}

async function writeCache(addr: string, chain: Chain, data: TxRecord[]): Promise<void> {
  AsyncStorage.setItem(KEY_CACHE(addr, chain), JSON.stringify({ ts: Date.now(), data })).catch(() => null);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchTxHistory(
  address: string,
  chain: Chain,
  network: Network = 'mainnet',
  limit = 30,
  bustCache = false,
): Promise<TxRecord[]> {
  if (!address) return [];

  if (!bustCache) {
    const cached = await readCache(address, chain);
    if (cached) return cached;
  }

  let txns: TxRecord[] = [];

  if (chain === 'solana') {
    txns = await fetchSolanaTxns(address, network, limit);
  } else {
    // Try The Graph first (richer data when API key present)
    const graphTxns = await fetchViaGraph(address, chain, limit);
    if (graphTxns && graphTxns.length > 0) {
      txns = graphTxns;
    } else {
      // Fall back to Etherscan-compatible API
      const [native, tokens] = await Promise.all([
        fetchEvmTxns(address, chain, network, 1, limit),
        fetchEvmTokenTxns(address, chain, network, 1, Math.floor(limit / 2)),
      ]);
      // Merge and sort by timestamp
      const merged = [...native, ...tokens];
      merged.sort((a, b) => b.timestamp - a.timestamp);
      // Deduplicate by hash (a tx can appear in both native and token lists)
      const seen = new Set<string>();
      txns = merged.filter((tx) => {
        const key = tx.hash + (tx.tokenSymbol ?? '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      txns = txns.slice(0, limit);
    }
  }

  if (txns.length > 0) writeCache(address, chain, txns);
  return txns;
}

// ─── Multi-chain combined feed ─────────────────────────────────────────────────

export async function fetchAllChainsTxHistory(
  addresses: Partial<Record<Chain, string>>,
  network: Network = 'mainnet',
  limitPerChain = 10,
): Promise<TxRecord[]> {
  const chains: Chain[] = ['rustox', 'ethereum', 'bnb', 'polygon', 'solana'];
  const results = await Promise.all(
    chains
      .filter((c) => !!addresses[c])
      .map((c) => fetchTxHistory(addresses[c]!, c, network, limitPerChain))
  );
  const all = results.flat();
  all.sort((a, b) => b.timestamp - a.timestamp);
  return all;
}

export function formatTxTime(ts: number): string {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
