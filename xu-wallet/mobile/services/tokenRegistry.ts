// mobile/services/tokenRegistry.ts
import type { Chain } from './chainService';

export interface TokenEntry {
  id: string;
  chain: Chain;
  symbol: string;
  name: string;
  decimals: number;
  contractAddress?: string;
  logoUrl?: string;
  coingeckoId?: string;
  isNative?: boolean;
}

export function tokenIdFor(chain: Chain, contract?: string): string {
  return `${chain}:${(contract ?? '').toLowerCase()}`;
}

const REGISTRY: TokenEntry[] = [
  // Native
  { id: 'rustox:rox', chain: 'rustox', symbol: 'ROX', name: 'RustOx', decimals: 18, isNative: true, coingeckoId: 'rustox', logoUrl: 'https://rustox.io/logo.svg' },
  { id: 'ethereum:eth', chain: 'ethereum', symbol: 'ETH', name: 'Ether', decimals: 18, isNative: true, coingeckoId: 'ethereum' },
  { id: 'bnb:bnb', chain: 'bnb', symbol: 'BNB', name: 'BNB', decimals: 18, isNative: true, coingeckoId: 'binancecoin' },
  { id: 'polygon:matic', chain: 'polygon', symbol: 'MATIC', name: 'Polygon', decimals: 18, isNative: true, coingeckoId: 'matic-network' },
  { id: 'solana:sol', chain: 'solana', symbol: 'SOL', name: 'Solana', decimals: 9, isNative: true, coingeckoId: 'solana' },
  // Stablecoins
  { id: 'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', chain: 'ethereum', symbol: 'USDC', name: 'USD Coin', decimals: 6, contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', coingeckoId: 'usd-coin' },
  { id: 'ethereum:0xdac17f958d2ee523a2206206994597c13d831ec7', chain: 'ethereum', symbol: 'USDT', name: 'Tether', decimals: 6, contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', coingeckoId: 'tether' },
  { id: 'bnb:0x55d398326f99059ff775485246999027b3197955', chain: 'bnb', symbol: 'USDT', name: 'Tether (BSC)', decimals: 18, contractAddress: '0x55d398326f99059ff775485246999027b3197955', coingeckoId: 'tether' },
  { id: 'polygon:0x2791bca1f2de4661ed88a30c99a7a9449aa84174', chain: 'polygon', symbol: 'USDC', name: 'USD Coin (Polygon)', decimals: 6, contractAddress: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', coingeckoId: 'usd-coin' },
  // RustOx first-party tokens
  { id: 'rustox:0x0000000000000000000000000000000000000101', chain: 'rustox', symbol: 'rUSDC', name: 'RustOx USD', decimals: 6, contractAddress: '0x0000000000000000000000000000000000000101', coingeckoId: 'rustox-usd' },
];

const BY_ID = new Map(REGISTRY.map((t) => [t.id, t]));

export function listTokens(): TokenEntry[] {
  return REGISTRY.slice();
}

export function getToken(id: string): TokenEntry | undefined {
  return BY_ID.get(id.toLowerCase());
}

export function tokensForChain(chain: Chain): TokenEntry[] {
  return REGISTRY.filter((t) => t.chain === chain);
}