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

// Rule-based buy/hold/sell rating: each metric contributes a weighted vote plus a
// human-readable (it/en) reason, then the point total is mapped to a status label.
function computeStatus({ trend, rsi14, positive20, distanceSma20, rvol, volatility20d, distance52wHigh, maxDrawdown52w, monthReturn, quality }) {
  let points = 0;
  const reasons = { it: [], en: [] };
  const add = (weight, it, en) => {
    points += weight;
    reasons.it.push(it);
    reasons.en.push(en);
  };

  if (trend === "Forte") {
    add(3, "Trend Forte: prezzo sopra SMA20, SMA20 sopra SMA50 e SMA50 sopra SMA200: struttura rialzista completa su tre orizzonti.", "Strong trend: price above SMA20, SMA20 above SMA50, and SMA50 above SMA200: fully bullish structure across three horizons.");
  } else if (trend === "Debole") {
    add(-3, "Trend Debole: prezzo sotto le medie mobili principali: struttura ribassista dominante.", "Weak trend: price below the main moving averages: bearish structure dominates.");
  } else {
    add(0, "Trend Neutro: le medie mobili non sono allineate in un'unica direzione.", "Neutral trend: moving averages are not aligned in a single direction.");
  }

  if (rsi14 != null) {
    if (rsi14 >= 70) add(-2, `RSI14 ${rsi14.toFixed(1)}: ipercomprato (>=70), rischio di ritracciamento nel brevissimo periodo.`, `RSI14 ${rsi14.toFixed(1)}: overbought (>=70), short-term pullback risk.`);
    else if (rsi14 >= 55) add(2, `RSI14 ${rsi14.toFixed(1)}: momentum rialzista sano, non ancora in area di ipercomprato.`, `RSI14 ${rsi14.toFixed(1)}: healthy bullish momentum, not yet overbought.`);
    else if (rsi14 >= 45) add(0, `RSI14 ${rsi14.toFixed(1)}: momentum neutro.`, `RSI14 ${rsi14.toFixed(1)}: neutral momentum.`);
    else if (rsi14 >= 30) add(-1, `RSI14 ${rsi14.toFixed(1)}: momentum debole, il prezzo fatica a salire.`, `RSI14 ${rsi14.toFixed(1)}: weak momentum, price struggling to advance.`);
    else add(-2, `RSI14 ${rsi14.toFixed(1)}: ipervenduto (<30), pressione ribassista dominante.`, `RSI14 ${rsi14.toFixed(1)}: oversold (<30), bearish pressure dominates.`);
  }

  if (positive20 != null) {
    if (positive20 >= 14) add(2, `Positivi 20G ${positive20}/20: alta persistenza rialzista nell'ultimo mese di sedute.`, `Positive 20D ${positive20}/20: strong bullish persistence over the last month of sessions.`);
    else if (positive20 >= 10) add(1, `Positivi 20G ${positive20}/20: persistenza rialzista moderata.`, `Positive 20D ${positive20}/20: moderate bullish persistence.`);
    else if (positive20 >= 7) add(0, `Positivi 20G ${positive20}/20: alternanza equilibrata tra sedute positive e negative.`, `Positive 20D ${positive20}/20: balanced mix of positive and negative sessions.`);
    else add(-2, `Positivi 20G ${positive20}/20: poche sedute positive, momentum discontinuo.`, `Positive 20D ${positive20}/20: few positive sessions, choppy momentum.`);
  }

  if (distanceSma20 != null) {
    if (distanceSma20 > 20) add(-2, `Dist SMA20 +${distanceSma20.toFixed(1)}%: estensione eccessiva sopra la media, rischio di ritracciamento elevato.`, `Dist SMA20 +${distanceSma20.toFixed(1)}%: excessive extension above the average, high pullback risk.`);
    else if (distanceSma20 >= -3) add(1, `Dist SMA20 ${distanceSma20.toFixed(1)}%: prezzo vicino alla media mobile, trend ordinato senza eccessi.`, `Dist SMA20 ${distanceSma20.toFixed(1)}%: price close to the moving average, orderly trend without excess.`);
    else if (distanceSma20 >= -15) add(-1, `Dist SMA20 ${distanceSma20.toFixed(1)}%: prezzo sotto la media, pressione ribassista di breve periodo.`, `Dist SMA20 ${distanceSma20.toFixed(1)}%: price below the average, short-term bearish pressure.`);
    else add(-2, `Dist SMA20 ${distanceSma20.toFixed(1)}%: forte estensione ribassista sotto la media.`, `Dist SMA20 ${distanceSma20.toFixed(1)}%: strong bearish extension below the average.`);
  }

  if (rvol != null) {
    if (rvol >= 1.3) add(1, `RVOL ${rvol.toFixed(1)}x: partecipazione sopra la media, movimento supportato dai volumi.`, `RVOL ${rvol.toFixed(1)}x: above-average participation, the move is supported by volume.`);
    else if (rvol < 0.7) add(-1, `RVOL ${rvol.toFixed(1)}x: volumi sotto la media, movimento poco confermato.`, `RVOL ${rvol.toFixed(1)}x: below-average volume, the move lacks confirmation.`);
    else add(0, `RVOL ${rvol.toFixed(1)}x: volumi in linea con la media recente.`, `RVOL ${rvol.toFixed(1)}x: volume in line with the recent average.`);
  }

  if (volatility20d != null) {
    if (volatility20d <= 18) add(1, `Volatilita 20D ${volatility20d.toFixed(1)}%: rischio contenuto nel breve periodo.`, `Volatility 20D ${volatility20d.toFixed(1)}%: contained short-term risk.`);
    else if (volatility20d > 32) add(-1, `Volatilita 20D ${volatility20d.toFixed(1)}%: rischio elevato, oscillazioni ampie nel breve periodo.`, `Volatility 20D ${volatility20d.toFixed(1)}%: elevated risk, wide short-term swings.`);
    else add(0, `Volatilita 20D ${volatility20d.toFixed(1)}%: rischio nella media.`, `Volatility 20D ${volatility20d.toFixed(1)}%: average risk level.`);
  }

  if (distance52wHigh != null) {
    if (distance52wHigh >= -5) add(2, `52W High ${distance52wHigh.toFixed(1)}%: molto vicino ai massimi annuali, leadership relativa forte.`, `52W High ${distance52wHigh.toFixed(1)}%: very close to the 52-week high, strong relative leadership.`);
    else if (distance52wHigh >= -15) add(1, `52W High ${distance52wHigh.toFixed(1)}%: moderatamente vicino ai massimi annuali.`, `52W High ${distance52wHigh.toFixed(1)}%: moderately close to the 52-week high.`);
    else if (distance52wHigh >= -30) add(0, `52W High ${distance52wHigh.toFixed(1)}%: a media distanza dai massimi annuali.`, `52W High ${distance52wHigh.toFixed(1)}%: a moderate distance from the 52-week high.`);
    else add(-2, `52W High ${distance52wHigh.toFixed(1)}%: ben lontano dai massimi annuali, fase di debolezza relativa.`, `52W High ${distance52wHigh.toFixed(1)}%: far from the 52-week high, relative weakness phase.`);
  }

  if (maxDrawdown52w != null) {
    if (maxDrawdown52w >= -12) add(1, `Max DD 52W ${maxDrawdown52w.toFixed(1)}%: drawdown storico contenuto nell'ultimo anno.`, `Max DD 52W ${maxDrawdown52w.toFixed(1)}%: contained historical drawdown over the last year.`);
    else if (maxDrawdown52w < -30) add(-2, `Max DD 52W ${maxDrawdown52w.toFixed(1)}%: drawdown severo nell'ultimo anno, rischio elevato nelle fasi di stress.`, `Max DD 52W ${maxDrawdown52w.toFixed(1)}%: severe drawdown over the last year, high risk during stress phases.`);
    else add(0, `Max DD 52W ${maxDrawdown52w.toFixed(1)}%: drawdown nella media.`, `Max DD 52W ${maxDrawdown52w.toFixed(1)}%: average drawdown.`);
  }

  if (monthReturn != null) {
    if (monthReturn > 3) add(1, `Rendimento 1M +${monthReturn.toFixed(1)}%: momentum di medio periodo positivo.`, `1M return +${monthReturn.toFixed(1)}%: positive medium-term momentum.`);
    else if (monthReturn < -3) add(-1, `Rendimento 1M ${monthReturn.toFixed(1)}%: momentum di medio periodo negativo.`, `1M return ${monthReturn.toFixed(1)}%: negative medium-term momentum.`);
    else add(0, `Rendimento 1M ${monthReturn.toFixed(1)}%: momentum di medio periodo stabile.`, `1M return ${monthReturn.toFixed(1)}%: stable medium-term momentum.`);
  }

  if (quality != null) {
    if (quality >= 3) add(1, "Qualita fondo (AUM/TER/eta) elevata: solidita strutturale del prodotto.", "Fund quality (AUM/TER/age) high: strong structural soundness.");
    else if (quality <= 1) add(-1, "Qualita fondo (AUM/TER/eta) bassa: fondo piccolo, costoso o giovane, rischio operativo maggiore.", "Fund quality (AUM/TER/age) low: small, costly, or young fund, higher operational risk.");
    else add(0, "Qualita fondo (AUM/TER/eta) nella media.", "Fund quality (AUM/TER/age) average.");
  }

  let status = points >= 9 ? "strong_buy" : points >= 3 ? "buy" : points >= -3 ? "hold" : "sell";
  // A "strong buy" requires a confirmed uptrend; a fully aligned uptrend should not be rated "sell".
  if (trend !== "Forte" && status === "strong_buy") status = "buy";
  if (trend === "Forte" && status === "sell") status = "hold";

  return { status, points, reasons };
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

    const statusResult = computeStatus({
      trend,
      rsi14,
      positive20,
      distanceSma20,
      rvol,
      volatility20d,
      distance52wHigh,
      maxDrawdown52w,
      monthReturn: pctReturn(current, monthAgoPrice),
      quality,
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
      status: statusResult.status,
      statusPoints: statusResult.points,
      statusReasons: statusResult.reasons,
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
