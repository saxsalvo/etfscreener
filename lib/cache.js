const globalCache = globalThis.__ETF_SCREENER_CACHE__ || new Map();
if (!globalThis.__ETF_SCREENER_CACHE__) globalThis.__ETF_SCREENER_CACHE__ = globalCache;

export function cacheGet(key, ttlMs) {
  const item = globalCache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > ttlMs) {
    globalCache.delete(key);
    return null;
  }
  return item.value;
}

export function cacheSet(key, value) {
  globalCache.set(key, { time: Date.now(), value });
  return value;
}
