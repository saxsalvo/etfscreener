import { priceOf, pctReturn } from "./yahoo";

function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stats(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) {
    return { avg: null, median: null, successRate: null, samples: 0, best: null, worst: null };
  }
  return {
    avg: mean(clean),
    median: median(clean),
    successRate: (clean.filter((v) => v > 0).length / clean.length) * 100,
    samples: clean.length,
    best: Math.max(...clean),
    worst: Math.min(...clean),
  };
}

function ymd(date) {
  const d = new Date(date);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function mmdd(month, day) {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function buildBenchmarkRegimes(dailyQuotes) {
  const rows = (dailyQuotes || [])
    .filter((quote) => quote.date && priceOf(quote) != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const regimes = new Map();
  const closes = rows.map(priceOf);
  for (let index = 199; index < rows.length; index += 1) {
    const sma200 = mean(closes.slice(index - 199, index + 1));
    regimes.set(dateKey(rows[index].date), closes[index] >= sma200 ? "bull" : "bear");
  }
  return { regimes, current: regimes.get(dateKey(rows.at(-1)?.date)) || null };
}

function seasonalStats(records) {
  const all = stats(records.map((record) => record.ret));
  return {
    ...all,
    bull: stats(records.filter((record) => record.regime === "bull").map((record) => record.ret)),
    bear: stats(records.filter((record) => record.regime === "bear").map((record) => record.ret)),
  };
}

function inWindow(year, yearsBack, nowYear) {
  return year >= nowYear - yearsBack && year < nowYear;
}

function lowerBound(timestamps, target) {
  let lo = 0;
  let hi = timestamps.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (timestamps[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(timestamps, target) {
  let lo = 0;
  let hi = timestamps.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (timestamps[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function buildActiveSeasonalWindows(rows, windows, now) {
  if (!rows.length) return [];

  const nowYear = now.getUTCFullYear();
  const maxWindow = Math.max(...windows);
  const timestamps = rows.map((r) => new Date(r.date).getTime());
  const prices = rows.map(priceOf);
  const candidates = [];

  // The candidate window must contain today. Its beginning can be up to
  // 14 calendar days before today and its end 5-45 days after today.
  for (let startOffset = -14; startOffset <= 0; startOffset++) {
    for (let endOffset = 5; endOffset <= 45; endOffset++) {
      const startCurrent = new Date(Date.UTC(nowYear, now.getUTCMonth(), now.getUTCDate() + startOffset));
      const endCurrent = new Date(Date.UTC(nowYear, now.getUTCMonth(), now.getUTCDate() + endOffset));
      const startMonth = startCurrent.getUTCMonth() + 1;
      const startDay = startCurrent.getUTCDate();
      const endMonth = endCurrent.getUTCMonth() + 1;
      const endDay = endCurrent.getUTCDate();
      const crossesYear = endCurrent.getUTCFullYear() > startCurrent.getUTCFullYear();
      const returns = [];

      for (let year = nowYear - maxWindow; year < nowYear; year++) {
        const startTarget = Date.UTC(year, startMonth - 1, startDay);
        const endTarget = Date.UTC(year + (crossesYear ? 1 : 0), endMonth - 1, endDay, 23, 59, 59, 999);

        const startIndex = lowerBound(timestamps, startTarget);
        const endIndex = upperBound(timestamps, endTarget) - 1;
        if (startIndex < 0 || endIndex < 0 || startIndex >= rows.length || endIndex >= rows.length || endIndex <= startIndex) continue;

        // Do not silently jump too far because of missing history.
        const startGap = timestamps[startIndex] - startTarget;
        const endGap = endTarget - timestamps[endIndex];
        if (startGap > 7 * 86400000 || endGap > 7 * 86400000) continue;

        const ret = pctReturn(prices[endIndex], prices[startIndex]);
        if (Number.isFinite(ret)) returns.push({ year, ret });
      }

      const byWindow = {};
      let validAll = true;
      let minSuccessRate = 100;
      let minSamples = Infinity;
      let avgAcrossWindows = 0;

      for (const window of windows) {
        const values = returns.filter((r) => inWindow(r.year, window, nowYear)).map((r) => r.ret);
        const s = stats(values);
        byWindow[window] = s;
        const minRequired = Math.max(5, Math.floor(window * 0.45));
        if (s.samples < minRequired || s.avg == null || s.avg <= 0) validAll = false;
        if (s.successRate != null) minSuccessRate = Math.min(minSuccessRate, s.successRate);
        minSamples = Math.min(minSamples, s.samples);
        avgAcrossWindows += s.avg || 0;
      }

      if (!validAll) continue;
      const durationDays = Math.round((endCurrent - startCurrent) / 86400000);
      const avg = avgAcrossWindows / windows.length;
      const score = minSuccessRate + Math.min(12, Math.max(0, avg)) * 2 - Math.max(0, durationDays - 35) * 0.05;

      candidates.push({
        startKey: mmdd(startMonth, startDay),
        endKey: mmdd(endMonth, endDay),
        durationDays,
        byWindow,
        minSuccessRate,
        minSamples: Number.isFinite(minSamples) ? minSamples : 0,
        avgAcrossWindows: avg,
        score,
      });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score || b.minSuccessRate - a.minSuccessRate || b.avgAcrossWindows - a.avgAcrossWindows)
    .slice(0, 20);
}

export function buildSeasonality(dailyQuotes, windows = [10, 15, 20], benchmarkQuotes = []) {
  const rows = (dailyQuotes || [])
    .filter((q) => q.date && priceOf(q) != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const now = new Date();
  const nowYear = now.getUTCFullYear();
  const maxWindow = Math.max(...windows);
  const benchmark = buildBenchmarkRegimes(benchmarkQuotes);

  const dailyRecords = [];
  for (let i = 1; i < rows.length; i++) {
    const current = rows[i];
    const previous = rows[i - 1];
    const { year, month, day } = ymd(current.date);
    if (year < nowYear - maxWindow || year >= nowYear) continue;
    const ret = pctReturn(priceOf(current), priceOf(previous));
    if (!Number.isFinite(ret)) continue;
    dailyRecords.push({ year, month, day, key: mmdd(month, day), ret, regime: benchmark.regimes.get(dateKey(current.date)) || "unknown" });
  }

  const monthlyByYear = new Map();
  for (const row of rows) {
    const { year, month } = ymd(row.date);
    if (year < nowYear - maxWindow || year >= nowYear) continue;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const p = priceOf(row);
    const existing = monthlyByYear.get(key);
    if (!existing) monthlyByYear.set(key, { year, month, first: p, last: p, regime: benchmark.regimes.get(dateKey(row.date)) || "unknown" });
    else {
      existing.last = p;
      existing.regime = benchmark.regimes.get(dateKey(row.date)) || existing.regime;
    }
  }

  const monthlyRecords = [...monthlyByYear.values()]
    .map((x) => ({ ...x, ret: pctReturn(x.last, x.first) }))
    .filter((x) => Number.isFinite(x.ret));

  const monthly = {};
  const daily = {};

  for (const window of windows) {
    monthly[window] = Array.from({ length: 12 }, (_, index) => {
      const values = monthlyRecords.filter((record) => record.month === index + 1 && inWindow(record.year, window, nowYear));
      return { month: index + 1, ...seasonalStats(values) };
    });

    const groups = new Map();
    for (const r of dailyRecords) {
      if (!inWindow(r.year, window, nowYear)) continue;
      if (!groups.has(r.key)) groups.set(r.key, []);
      groups.get(r.key).push(r);
    }
    daily[window] = Object.fromEntries(
      [...groups.entries()].map(([key, values]) => [key, seasonalStats(values)])
    );
  }

  const allDayKeys = new Set();
  for (const window of windows) {
    Object.keys(daily[window]).forEach((key) => allDayKeys.add(key));
  }

  const intersections = [...allDayKeys]
    .map((key) => {
      const byWindow = {};
      let validAll = true;
      let minSuccessRate = 100;
      let minSamples = Infinity;
      let avgAcrossWindows = 0;

      for (const window of windows) {
        const s = daily[window][key] || stats([]);
        if (s.samples < Math.max(5, Math.floor(window * 0.45)) || s.avg == null || s.avg <= 0) validAll = false;
        byWindow[window] = s;
        if (s.successRate != null) minSuccessRate = Math.min(minSuccessRate, s.successRate);
        minSamples = Math.min(minSamples, s.samples);
        avgAcrossWindows += s.avg || 0;
      }

      return {
        dateKey: key,
        byWindow,
        validAll,
        minSuccessRate: minSuccessRate === 100 && !validAll ? null : minSuccessRate,
        minSamples: Number.isFinite(minSamples) ? minSamples : 0,
        avgAcrossWindows: avgAcrossWindows / windows.length,
      };
    })
    .filter((x) => x.validAll)
    .sort((a, b) => (b.minSuccessRate ?? -Infinity) - (a.minSuccessRate ?? -Infinity) || b.avgAcrossWindows - a.avgAcrossWindows);

  const todayKey = mmdd(now.getUTCMonth() + 1, now.getUTCDate());
  const currentDay = Object.fromEntries(
    windows.map((window) => [window, daily[window][todayKey] || stats([])])
  );

  const currentMonth = Object.fromEntries(
    windows.map((window) => [window, monthly[window][now.getUTCMonth()]])
  );

  const firstYear = rows.length ? ymd(rows[0].date).year : null;
  const completedHistoryYears = firstYear == null ? 0 : Math.max(0, nowYear - firstYear);
  const seasonalWindows = buildActiveSeasonalWindows(rows, windows, now);

  return {
    windows,
    generatedAt: new Date().toISOString(),
    todayKey,
    currentDay,
    currentMonth,
    monthly,
    daily,
    intersections,
    seasonalWindows,
    bestSeasonalWindow: seasonalWindows[0] || null,
    availableYears: completedHistoryYears,
    benchmark: { ticker: "SPY", regime: benchmark.current, method: "SPY close versus SMA200 at each sample date" },
  };
}
