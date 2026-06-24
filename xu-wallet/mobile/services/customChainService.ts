// mobile/services/customChainService.ts
// Manages user-added custom EVM blockchains with persistence.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';

const CUSTOM_CHAINS_KEY = 'xu_custom_evm_chains_v1';

export interface CustomEvmChain {
  id: string;          // "custom_<chainId>"
  chainId: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  accent: string;      // auto-generated or user-picked
  decimals: number;
}

const ACCENT_PALETTE = [
  '#6C9EFF', '#FF6C9E', '#9EFF6C', '#FF9E6C',
  '#6CFFF9', '#C96CFF', '#FFE56C', '#6CFFB8',
];

function generateAccent(chainId: number): string {
  return ACCENT_PALETTE[chainId % ACCENT_PALETTE.length];
}

export async function loadCustomChains(): Promise<CustomEvmChain[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_CHAINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CustomEvmChain[];
  } catch {
    return [];
  }
}

export async function saveCustomChains(chains: CustomEvmChain[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_CHAINS_KEY, JSON.stringify(chains));
}

export async function addCustomChain(
  params: Omit<CustomEvmChain, 'id' | 'accent'>
): Promise<CustomEvmChain> {
  const existing = await loadCustomChains();
  const conflict = existing.find((c) => c.chainId === params.chainId);
  if (conflict) throw new Error(`Chain ID ${params.chainId} is already added.`);

  const chain: CustomEvmChain = {
    ...params,
    id: `custom_${params.chainId}`,
    accent: generateAccent(params.chainId),
  };
  await saveCustomChains([...existing, chain]);
  return chain;
}

export async function removeCustomChain(id: string): Promise<void> {
  const existing = await loadCustomChains();
  await saveCustomChains(existing.filter((c) => c.id !== id));
}

// Fetch native balance on a custom EVM chain
export async function getCustomChainBalance(
  rpcUrl: string,
  chainId: number,
  address: string
): Promise<number> {
  if (!address || !rpcUrl) return 0;
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
      staticNetwork: true,
      batchMaxCount: 1,
    });
    const bal = await Promise.race([
      provider.getBalance(address),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
    ]);
    return Number(ethers.formatEther(bal as bigint));
  } catch {
    return 0;
  }
}

// Validate RPC URL by attempting a basic eth_chainId call
export async function validateRpcUrl(rpcUrl: string, expectedChainId: number): Promise<boolean> {
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    });
    const json = await res.json() as { result?: string };
    if (!json.result) return false;
    const reported = parseInt(json.result, 16);
    return reported === expectedChainId;
  } catch {
    return false;
  }
}
