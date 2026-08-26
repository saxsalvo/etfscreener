import { NextResponse } from "next/server";
import { ALL_FAMOUS_ETF_TICKERS } from "../../../lib/etfs";
import { yahooFinance, withTimeout, NO_VALIDATE } from "../../../lib/yahoo";
import { buildSeasonality } from "../../../lib/seasonality";
import { cacheGet, cacheSet } from "../../../lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_MS = 60 * 60 * 1000;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ticker = String(searchParams.get("ticker") || "").toUpperCase().trim();
  const requested = String(searchParams.get("windows") || "10,15,20")
    .split(",")
    .map(Number)
    .filter((n) => [5, 10, 15, 20].includes(n));
  const windows = requested.length ? [...new Set(requested)].sort((a, b) => a - b) : [10, 15, 20];

  if (!ALL_FAMOUS_ETF_TICKERS.includes(ticker)) {
    return NextResponse.json({ error: "Ticker non presente nella lista" }, { status: 400 });
  }

  const key = `season:v2:${ticker}:${windows.join("-")}`;
  const cached = cacheGet(key, CACHE_MS);
  if (cached) return NextResponse.json(cached);

  try {
    const period1 = new Date();
    period1.setUTCFullYear(period1.getUTCFullYear() - Math.max(...windows) - 1);

    const [chart, quote] = await Promise.all([
      withTimeout(yahooFinance.chart(ticker, { period1, interval: "1d", return: "array" }, NO_VALIDATE), 25000, "storico " + ticker),
      withTimeout(yahooFinance.quote(ticker, {}, NO_VALIDATE), 12000, "quote " + ticker).catch(() => null),
    ]);

    const seasonality = buildSeasonality(chart?.quotes || [], windows);
    const payload = {
      ticker,
      name: quote?.longName || quote?.shortName || ticker,
      ...seasonality,
    };
    cacheSet(key, payload);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
