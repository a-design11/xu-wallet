// mobile/services/priceService.ts
// The Graph (Uniswap V3 / PancakeSwap V3) for ETH & BNB prices.
// Pyth Network (free, no key) for SOL & MATIC.
// Binance public 24hr ticker for change24h enrichment and final fallback.
// Single key: EXPO_PUBLIC_GRAPH_API_KEY (env var, baked at build time).

export interface PriceInfo {
  usd: number;
  change24h: number;
  marketCap?: number;
  source: 'graph' | 'pyth' | 'binance';
}

// ─── Graph key ───────────────────────────────────────────────────────────────
// Env var is baked in at build time; AsyncStorage override (from Settings) wins.

const ENV_GRAPH_KEY = (process.env as any).EXPO_PUBLIC_GRAPH_API_KEY as string | undefined;
let _graphKey: string | null = ENV_GRAPH_KEY?.trim() || null;

export function setGraphPriceKey(k: string | null) {
  _graphKey = k?.trim() || ENV_GRAPH_KEY?.trim() || null;
}

export function getGraphPriceKey(): string | null { return _graphKey; }

// Kept for backwards-compat — no-op now that CoinGecko is removed.
export function setCoinGeckoApiKey(_k: string | undefined | null) {}

// ─── The Graph AMM subgraphs ──────────────────────────────────────────────────
// Uniswap V3 ETH Mainnet  → bundles { ethPriceUSD }
// PancakeSwap V3 BSC      → bundles { bnbPriceUSD }

const GRAPH_PRICE_SUBGRAPHS: Record<string, { id: string; field: string }> = {
  ethereum:    { id: '5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV', field: 'ethPriceUSD' },
  binancecoin: { id: 'Hv1GncLY5docZoGtXjo4kwbTvxm3MAhVZqBZE4sUT9eZ', field: 'bnbPriceUSD' },
};

async function fetchGraphPrice(coinId: string): Promise<number | null> {
  const key = _graphKey;
  if (!key) return null;
  const sub = GRAPH_PRICE_SUBGRAPHS[coinId];
  if (!sub) return null;
  try {
    const r = await fetch(
      `https://gateway.thegraph.com/api/${key}/subgraphs/id/${sub.id}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: `{ bundles(first: 1) { ${sub.field} } }` }),
      }
    );
    if (!r.ok) return null;
    const j = await r.json();
    const price = Number(j?.data?.bundles?.[0]?.[sub.field]);
    return price && !isNaN(price) ? price : null;
  } catch {
    return null;
  }
}

// ─── Pyth Network (free, no key) ──────────────────────────────────────────────
// Used for SOL & MATIC, and as ETH/BNB fallback when Graph key absent.

const PYTH_IDS: Record<string, string> = {
  ethereum:        'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  binancecoin:     '2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  'matic-network': '5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  solana:          'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
};

async function fetchPythPrices(ids: string[]): Promise<Record<string, number>> {
  const toFetch = ids.filter((id) => PYTH_IDS[id]);
  if (!toFetch.length) return {};
  const params = toFetch.map((id) => `ids[]=${PYTH_IDS[id]}`).join('&');
  try {
    const r = await fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?${params}&parsed=true`,
      { headers: { Accept: 'application/json' } }
    );
    if (!r.ok) return {};
    const j = await r.json();
    const parsed: any[] = j?.parsed ?? [];
    const out: Record<string, number> = {};
    for (const coinId of toFetch) {
      const feedId = PYTH_IDS[coinId];
      const entry = parsed.find((p: any) => p.id?.toLowerCase() === feedId.toLowerCase());
      if (!entry) continue;
      const exp = entry.price?.expo ?? 0;
      const price = Number(entry.price?.price) * Math.pow(10, exp);
      if (price && !isNaN(price)) out[coinId] = price;
    }
    return out;
  } catch {
    return {};
  }
}

// ─── Binance 24hr ticker (free, no key) ───────────────────────────────────────
// Used to enrich change24h for all tokens, and as final price fallback.

const BINANCE_SYMBOL: Record<string, string> = {
  ethereum:        'ETHUSDT',
  binancecoin:     'BNBUSDT',
  'matic-network': 'MATICUSDT',
  solana:          'SOLUSDT',
};

interface BinanceTick { usd: number; change24h: number }

async function fetchBinanceTicks(ids: string[]): Promise<Record<string, BinanceTick>> {
  const out: Record<string, BinanceTick> = {};
  await Promise.all(ids.map(async (id) => {
    const sym = BINANCE_SYMBOL[id];
    if (!sym) return;
    try {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`);
      if (!r.ok) return;
      const j = await r.json();
      out[id] = { usd: Number(j.lastPrice), change24h: Number(j.priceChangePercent) };
    } catch { /* ignore */ }
  }));
  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getPrices(
  coingeckoIds: string[]
): Promise<Record<string, PriceInfo>> {
  if (!coingeckoIds.length) return {};

  const usdPrices: Record<string, { usd: number; source: PriceInfo['source'] }> = {};

  // 1. The Graph for ETH and BNB (when key is available)
  await Promise.all(coingeckoIds.map(async (id) => {
    const usd = await fetchGraphPrice(id);
    if (usd) usdPrices[id] = { usd, source: 'graph' };
  }));

  // 2. Pyth for missing tokens (SOL, MATIC, ETH/BNB without Graph key)
  const missing = coingeckoIds.filter((id) => !usdPrices[id]);
  if (missing.length) {
    const pythPrices = await fetchPythPrices(missing);
    for (const [id, usd] of Object.entries(pythPrices)) {
      usdPrices[id] = { usd, source: 'pyth' };
    }
  }

  // 3. Binance tickers: get 24h change for all + price fallback for anything still missing
  const binanceTicks = await fetchBinanceTicks(coingeckoIds);

  // Merge into final PriceInfo
  const out: Record<string, PriceInfo> = {};
  for (const id of coingeckoIds) {
    const base = usdPrices[id];
    const tick = binanceTicks[id];
    if (base) {
      out[id] = {
        usd: base.usd,
        change24h: tick?.change24h ?? 0,
        source: base.source,
      };
    } else if (tick) {
      out[id] = { usd: tick.usd, change24h: tick.change24h, source: 'binance' };
    }
  }

  return out;
}

export async function getTokenPriceByContract(
  _chain: 'ethereum' | 'bnb' | 'polygon' | 'solana' | 'rustox',
  _contract: string
): Promise<PriceInfo | null> {
  return null;
}
