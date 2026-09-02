import YahooFinance from "yahoo-finance2";

// Yahoo occasionally tweaks its response shape (per-symbol or globally); we
// don't want that noisy validation logging, and we don't want a schema drift
// on optional/extra fields to break an otherwise-usable quote/chart response.
export const yahooFinance = new YahooFinance({ validation: { logErrors: false } });

export const NO_VALIDATE = { validateResult: false };

export function priceOf(quote) {
  return quote ? (quote.close ?? quote.adjclose ?? null) : null;
}

export function pctReturn(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current / previous) - 1) * 100;
}

export function normalizeExpenseRatio(quote, summary) {
  if (quote?.netExpenseRatio != null) return Number(quote.netExpenseRatio);
  const raw = summary?.defaultKeyStatistics?.annualReportExpenseRatio;
  if (raw == null) return null;
  const n = Number(raw);
  return n <= 0.05 ? n * 100 : n;
}

export function normalizeDateValue(value) {
  if (value == null) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === "object" && value.raw != null) return normalizeDateValue(value.raw);
  const n = Number(value);
  if (Number.isFinite(n)) {
    const ms = Math.abs(n) < 1e12 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function ageInYears(date, now = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const years = (now.getTime() - date.getTime()) / (365.2425 * 86400000);
  return years >= 0 ? years : null;
}

export async function withTimeout(promise, ms, label = "Yahoo Finance") {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}: timeout dopo ${Math.round(ms / 1000)}s`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
