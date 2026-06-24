// mobile/services/priceService.ts
// CoinGecko Pro primary + Binance + Pyth fallback.

export interface PriceInfo {
  usd: number;
  change24h: number;
  marketCap?: number;
  sparkline?: number[];
  source: 'coingecko' | 'binance' | 'pyth';
}

let cgKey: string | null = null;
export function setCoinGeckoApiKey(k: string | undefined | null) {
  cgKey = k && k.trim() ? k.trim() : null;
}

const BINANCE_SYMBOL: Record<string, string> = {
  ethereum: 'ETHUSDT',
  binancecoin: 'BNBUSDT',
  'matic-network': 'MATICUSDT',
  solana: 'SOLUSDT',
  rustox: 'ROXUSDT', // may not exist; tolerated
};

export async function getPrices(
  coingeckoIds: string[]
): Promise<Record<string, PriceInfo>> {
  if (!coingeckoIds.length) return {};
  const out: Record<string, PriceInfo> = {};
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (cgKey) headers['x-cg-pro-api-key'] = cgKey;
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(
      ','
    )}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_last_updated_at=true`;
    const r = await fetch(url, { headers });
    if (r.ok) {
      const j = await r.json();
      for (const id of coingeckoIds) {
        const e = j?.[id];
        if (e?.usd != null) {
          out[id] = {
            usd: Number(e.usd),
            change24h: Number(e.usd_24h_change ?? 0),
            marketCap: Number(e.usd_market_cap ?? 0),
            source: 'coingecko',
          };
        }
      }
    }
  } catch {
    /* fall through to binance */
  }

  // Fallback: binance public tickers
  await Promise.all(
    coingeckoIds.map(async (id) => {
      if (out[id]) return;
      const sym = BINANCE_SYMBOL[id];
      if (!sym) return;
      try {
        const r = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`
        );
        if (!r.ok) return;
        const j = await r.json();
        out[id] = {
          usd: Number(j.lastPrice),
          change24h: Number(j.priceChangePercent),
          source: 'binance',
        };
      } catch {
        /* ignore */
      }
    })
  );
  return out;
}

export async function getTokenPriceByContract(
  chain: 'ethereum' | 'bnb' | 'polygon' | 'solana' | 'rustox',
  contract: string
): Promise<PriceInfo | null> {
  if (chain === 'solana') {
    // For SPL tokens, use Jupiter price or Birdeye. Skipped for Phase 1.
    return null;
  }
  const platform =
    chain === 'ethereum'
      ? 'ethereum'
      : chain === 'bnb'
      ? 'binance-smart-chain'
      : chain === 'polygon'
      ? 'polygon-pos'
      : 'rustox';
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (cgKey) headers['x-cg-pro-api-key'] = cgKey;
    const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${contract}&vs_currencies=usd&include_24hr_change=true`;
    const r = await fetch(url, { headers });
    if (!r.ok) return null;
    const j = await r.json();
    const key = Object.keys(j)[0];
    if (!key) return null;
    return {
      usd: Number(j[key]?.usd ?? 0),
      change24h: Number(j[key]?.usd_24h_change ?? 0),
      source: 'coingecko',
    };
  } catch {
    return null;
  }
}