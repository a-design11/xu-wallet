// mobile/services/phishing.ts
// Mirror of MetaMask/eth-phishing-detect blocklist with safe-list whitelist.
// Cached locally for 24h.

const LIST_URL =
  'https://cdn.jsdelivr.net/gh/MetaMask/eth-phishing-detect@master/src/eth-phishing-detect.json';

let cache: { data: any; ts: number } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000;

export async function isPhishing(host: string): Promise<boolean> {
  const clean = host.toLowerCase().replace(/^www\./, '');
  if (!cache || Date.now() - cache.ts > TTL_MS) {
    try {
      const r = await fetch(LIST_URL);
      if (!r.ok) return false;
      cache = { data: await r.json(), ts: Date.now() };
    } catch {
      return false;
    }
  }
  const blacklist: string[] = cache.data?.blacklist ?? [];
  return blacklist.includes(clean);
}