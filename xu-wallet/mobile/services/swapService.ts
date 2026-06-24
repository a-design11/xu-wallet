// mobile/services/swapService.ts
// 1inch primary; ParaSwap fallback. Aggregation across RustOx + EVM chains.

const ONEINCH_BASE = 'https://api.1inch.dev/swap/v6.0';

function oneInchChainId(chain: string): number {
  switch (chain) {
    case 'ethereum':
      return 1;
    case 'bnb':
      return 56;
    case 'polygon':
      return 137;
    case 'rustox':
      return 21080; // requires 1inch listing; if absent, 1inch returns 404
    default:
      return 1;
  }
}

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: number;
  protocols: any[];
  tx?: { from: string; to: string; data: string; value: string; gas: number };
  source: '1inch' | 'paraswap';
}

export async function getSwapQuote(params: {
  chain: 'ethereum' | 'bnb' | 'polygon' | 'rustox';
  fromToken: string;
  toToken: string;
  amount: string;       // base-units as string
  fromAddress: string;
  slippage?: number;    // percent, e.g. 1
  srcDecimals?: number; // actual decimals of the from-token (default 18)
  destDecimals?: number; // actual decimals of the to-token (default 18)
}): Promise<SwapQuote | null> {
  const { srcDecimals = 18, destDecimals = 18 } = params;
  const key = (process.env.EXPO_PUBLIC_ONEINCH_KEY ?? '').trim();
  const chainId = oneInchChainId(params.chain);

  if (key && chainId !== 21080) {
    try {
      const url = `${ONEINCH_BASE}/${chainId}/quote?src=${params.fromToken}&dst=${params.toToken}&amount=${params.amount}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
      if (r.ok) {
        const j = await r.json();
        return {
          fromToken: params.fromToken,
          toToken: params.toToken,
          fromAmount: params.amount,
          toAmount: j.toAmount,
          estimatedGas: Number(j.estimatedGas ?? 0),
          protocols: j.protocols ?? [],
          source: '1inch',
        };
      }
    } catch {
      /* fallthrough to ParaSwap */
    }
  }

  // ParaSwap fallback (public, no key).
  // Pass the actual per-token decimals so the quote is correct for non-18-decimal tokens
  // (e.g. USDC has 6 decimals — hardcoding 18 would produce quotes off by 10^12).
  try {
    const url = `https://apiv5.paraswap.io/prices?srcToken=${params.fromToken}&destToken=${params.toToken}&amount=${params.amount}&srcDecimals=${srcDecimals}&destDecimals=${destDecimals}&side=sell&network=${chainId}`;
    const r = await fetch(url);
    if (r.ok) {
      const j = await r.json();
      return {
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.amount,
        toAmount: j.priceRoute?.destAmount ?? '0',
        estimatedGas: Number(j.priceRoute?.gasCost ?? 0),
        protocols: j.priceRoute?.bestRoute ?? [],
        source: 'paraswap',
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}
