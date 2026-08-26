import { NextResponse } from "next/server";
import { ALL_FAMOUS_ETF_TICKERS, getTickerCategories } from "../../../lib/etfs";
import { yahooFinance, priceOf, pctReturn, normalizeExpenseRatio, normalizeDateValue, ageInYears, withTimeout, NO_VALIDATE } from "../../../lib/yahoo";
import { cacheGet, cacheSet } from "../../../lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_MS = 10 * 60 * 1000;
const HISTORY_DAYS = 3800;

function average(values) {
  if (!values || values.length === 0) return null;
  const valid = values.filter((value) => value != null && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function standardDeviation(values) {
  if (!values || values.length === 0) return null;
  const valid = values.filter((value) => value != null && Number.isFinite(value));
  if (valid.length < 2) return null;
  const mean = average(valid);
  const variance = valid.reduce((total, value) => total + (value - mean) ** 2, 0) / valid.length;
  return Math.sqrt(variance);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTrendLabel(current, sma20, sma50, sma200) {
  if (current == null || sma20 == null || sma50 == null || sma200 == null) return "-";
  if (current > sma20 && sma20 > sma50 && sma50 > sma200) return "Forte";
  if (current > sma20 || current > sma50 || sma20 > sma50) return "Neutro";
  return "Debole";
}

function computeRsi(closes, period = 14) {
  if (!closes || closes.length < period + 1) return null;
  const recent = closes.slice(-period - 1);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < recent.length; i += 1) {
    const delta = recent[i] - recent[i - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeSma(closes, period) {
  const window = closes.slice(-period);
  return window.length ? average(window) : null;
}

function countPositiveDays(closes, days) {
  const recent = closes.slice(-days);
  let count = 0;
  for (let i = 1; i < recent.length; i += 1) {
    if (recent[i] > recent[i - 1]) count += 1;
  }
  return count;
}

function streakPositiveDays(closes, days = 20) {
  const recent = closes.slice(-days);
  let streak = 0;
  for (let i = recent.length - 1; i >= 1; i -= 1) {
    if (recent[i] > recent[i - 1]) streak += 1;
    else break;
  }
  return streak;
}

function relativeVolume(currentVolume, volumeHistory) {
  if (currentVolume == null || !volumeHistory?.length) return null;
  const avgVolume = average(volumeHistory.slice(-20));
  if (!avgVolume || avgVolume <= 0) return null;
  return currentVolume / avgVolume;
}

function distanceFromSma(price, sma) {
  if (price == null || sma == null || sma === 0) return null;
  return ((price / sma) - 1) * 100;
}

function rollingDrawdown(closes) {
  if (!closes || !closes.length) return null;
  let peak = closes[0];
  let maxDrawdown = 0;
  for (const value of closes) {
    if (value > peak) peak = value;
    const drawdown = ((value / peak) - 1) * 100;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown;
}

function priceOnOrBefore(quotes, targetDate) {
  const target = targetDate.getTime();
  for (let i = quotes.length - 1; i >= 0; i--) {
    const t = new Date(quotes[i].date).getTime();
    if (t <= target) return priceOf(quotes[i]);
  }
  return null;
}

function computeScore({ current, sma20, sma50, sma200, rsi14, positive20, rvol, vol20d, distanceSma20, qualityScore }) {
  let total = 0;
  if (current != null && sma20 != null && sma20 > 0) total += current > sma20 ? 12 : 0;
  if (sma20 != null && sma50 != null) total += sma20 > sma50 ? 10 : 0;
  if (sma50 != null && sma200 != null) total += sma50 > sma200 ? 10 : 0;
  if (rsi14 != null) total += clamp((rsi14 - 35) / 1.3, 0, 20);
  if (positive20 != null) total += clamp((positive20 / 20) * 18, 0, 18);
  if (rvol != null) total += clamp((rvol - 0.8) * 12, 0, 10);
  if (vol20d != null) total += clamp((35 - vol20d) * 0.16, 0, 10);
  if (distanceSma20 != null) total += clamp((30 - Math.abs(distanceSma20)) * 0.25, 0, 10);
  if (qualityScore != null) total += qualityScore;
  return clamp(Math.round(total), 0, 100);
}

async function getOne(ticker, forceRefresh = false) {
  const cacheKey = `quote:${ticker}:v4`;
  if (!forceRefresh) {
    const cached = cacheGet(cacheKey, CACHE_MS);
    if (cached) return cached;
  }

  try {
    const period1 = new Date();
    period1.setUTCDate(period1.getUTCDate() - HISTORY_DAYS);

    const [quote, chart] = await Promise.all([
      withTimeout(yahooFinance.quote(ticker, {}, NO_VALIDATE), 12000, "quote " + ticker),
      withTimeout(yahooFinance.chart(ticker, { period1, interval: "1d", return: "array" }, NO_VALIDATE), 15000, "chart " + ticker),
    ]);

    const quotes = (chart?.quotes || [])
      .filter((q) => q.date && priceOf(q) != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const last = quotes.length - 1;
    const current = last >= 0 ? priceOf(quotes[last]) : quote?.regularMarketPrice ?? null;
    const volumes = quotes.map((q) => q.volume ?? null).filter((value) => value != null && Number.isFinite(value));
    const closes = quotes.map((q) => priceOf(q)).filter((value) => value != null && Number.isFinite(value));
    const currentVolume = last >= 0 ? (quotes[last]?.volume ?? null) : null;
    const at = (offset) => (last - offset >= 0 ? priceOf(quotes[last - offset]) : null);

    const lastDate = quotes[last]?.date ? new Date(quotes[last].date) : new Date();
    const monthTarget = new Date(lastDate);
    monthTarget.setUTCMonth(monthTarget.getUTCMonth() - 1);
    const monthAgoPrice = priceOnOrBefore(quotes, monthTarget);

    const oneYearTarget = new Date(lastDate);
    oneYearTarget.setUTCFullYear(oneYearTarget.getUTCFullYear() - 1);
    const oneYearAgoPrice = priceOnOrBefore(quotes, oneYearTarget);

    const threeYearTarget = new Date(lastDate);
    threeYearTarget.setUTCFullYear(threeYearTarget.getUTCFullYear() - 3);
    const threeYearAgoPrice = priceOnOrBefore(quotes, threeYearTarget);

    const fiveYearTarget = new Date(lastDate);
    fiveYearTarget.setUTCFullYear(fiveYearTarget.getUTCFullYear() - 5);
    const fiveYearAgoPrice = priceOnOrBefore(quotes, fiveYearTarget);

    const tenYearTarget = new Date(lastDate);
    tenYearTarget.setUTCFullYear(tenYearTarget.getUTCFullYear() - 10);
    const tenYearAgoPrice = priceOnOrBefore(quotes, tenYearTarget);

    const sma20 = computeSma(closes, 20);
    const sma50 = computeSma(closes, 50);
    const sma200 = computeSma(closes, 200);
    const rsi14 = computeRsi(closes, 14);
    const positive10 = countPositiveDays(closes, 10);
    const positive20 = countPositiveDays(closes, 20);
    const streak = streakPositiveDays(closes, 20);
    const rvol = relativeVolume(currentVolume, volumes);
    const dailyReturns = closes.slice(-20).slice(1).map((value, index) => {
      const prev = closes.slice(-20)[index];
      return prev && prev !== 0 ? ((value / prev) - 1) * 100 : null;
    }).filter((value) => value != null);
    const volatility20d = dailyReturns.length ? standardDeviation(dailyReturns) * Math.sqrt(252) : null;
    const rangeHigh52w = Math.max(...closes.slice(-252));
    const distance52wHigh = current != null && rangeHigh52w ? ((current / rangeHigh52w) - 1) * 100 : null;
    const drawdown52w = rollingDrawdown(closes.slice(-252));
    const distanceSma20 = distanceFromSma(current, sma20);
    const trend = getTrendLabel(current, sma20, sma50, sma200);

    let ter = quote?.netExpenseRatio ?? null;
    let inceptionDate = normalizeDateValue(quote?.firstTradeDateMilliseconds ?? quote?.firstTradeDateEpochUtc ?? null);
    let summary = null;

    if (ter == null || inceptionDate == null) {
      try {
        summary = await withTimeout(
          yahooFinance.quoteSummary(ticker, { modules: ["defaultKeyStatistics"] }, NO_VALIDATE),
          10000,
          "statistiche " + ticker
        );
        if (ter == null) ter = normalizeExpenseRatio(quote, summary);
        if (inceptionDate == null) {
          inceptionDate = normalizeDateValue(summary?.defaultKeyStatistics?.fundInceptionDate ?? null);
        }
      } catch {
        // Missing optional metadata must not block the row.
      }
    }

    const age = ageInYears(inceptionDate);
    const quality = Math.min(
      5,
      (quote?.netAssets != null && quote.netAssets > 1e9 ? 2 : 0) +
        (quote?.netAssets != null && quote.netAssets > 1e10 ? 1 : 0) +
        (ter != null && ter <= 0.3 ? 1 : 0) +
        (age != null && age >= 5 ? 1 : 0)
    );

    const score = computeScore({
      current,
      sma20,
      sma50,
      sma200,
      rsi14,
      positive20,
      rvol,
      vol20d: volatility20d,
      distanceSma20,
      qualityScore: quality,
    });

    const payload = {
      ticker,
      ok: true,
      name: quote?.longName || quote?.shortName || chart?.meta?.longName || ticker,
      categories: getTickerCategories(ticker),
      isin: quote?.isin || null,
      quoteType: quote?.quoteType || null,
      exchange: quote?.fullExchangeName || quote?.exchange || chart?.meta?.exchangeName || null,
      currency: quote?.currency || chart?.meta?.currency || null,
      netAssets: quote?.netAssets ?? null,
      ter,
      price: current,
      dailyReturn: pctReturn(current, at(1)),
      threeDayReturn: pctReturn(current, at(3)),
      weekReturn: pctReturn(current, at(5)),
      monthReturn: pctReturn(current, monthAgoPrice),
      quarterReturn: pctReturn(current, at(60)),
      year1Return: pctReturn(current, oneYearAgoPrice),
      year3Return: pctReturn(current, threeYearAgoPrice),
      year5Return: pctReturn(current, fiveYearAgoPrice),
      year10Return: pctReturn(current, tenYearAgoPrice),
      rsi14,
      sma20,
      sma50,
      sma200,
      trend,
      distanceSma20,
      positive10,
      positive20,
      streak,
      relativeVolume: rvol,
      volatility20d: volatility20d,
      range52wHigh: rangeHigh52w,
      distance52wHigh,
      maxDrawdown52w: drawdown52w,
      score,
      lastDate: quotes[last]?.date || null,
      inceptionDate: inceptionDate ? inceptionDate.toISOString() : null,
      ageYears: age,
    };

    return cacheSet(cacheKey, payload);
  } catch (error) {
    return {
      ticker,
      ok: false,
      categories: getTickerCategories(ticker),
      error: error?.message || String(error),
    };
  }
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (true) {
      const i = index++;
      if (i >= items.length) return;
      results[i] = await mapper(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") || 25)));
  const forceRefresh = searchParams.get("refresh") === "1";
  const start = (page - 1) * pageSize;
  const tickers = ALL_FAMOUS_ETF_TICKERS.slice(start, start + pageSize);

  const rows = await mapLimit(tickers, 6, (ticker) => getOne(ticker, forceRefresh));

  return NextResponse.json({
    page,
    pageSize,
    total: ALL_FAMOUS_ETF_TICKERS.length,
    hasMore: start + pageSize < ALL_FAMOUS_ETF_TICKERS.length,
    data: rows,
    generatedAt: new Date().toISOString(),
  });
}
