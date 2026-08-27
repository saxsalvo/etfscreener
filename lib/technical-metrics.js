function average(values) {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function computeSma(closes, period) {
  const window = closes.slice(-period);
  return window.length === period ? average(window) : null;
}

export function distanceFromSma(price, sma) {
  if (!Number.isFinite(price) || !Number.isFinite(sma) || sma === 0) return null;
  return ((price / sma) - 1) * 100;
}

export function currentDrawdownFromAth(closes) {
  if (!closes.length || !Number.isFinite(closes.at(-1))) return null;
  const athPrice = Math.max(...closes);
  return {
    athPrice,
    drawdownFromAth: distanceFromSma(closes.at(-1), athPrice),
  };
}

export function computeRangePosition(closes, period = 252) {
  const window = closes.slice(-period);
  if (!window.length) return { low: null, high: null, position: null };
  const low = Math.min(...window);
  const high = Math.max(...window);
  const current = window.at(-1);
  return {
    low,
    high,
    position: high === low ? null : ((current - low) / (high - low)) * 100,
  };
}

function smaAt(closes, endIndex, period) {
  if (endIndex < period - 1) return null;
  return average(closes.slice(endIndex - period + 1, endIndex + 1));
}

export function findSmaCross(closes, dates = []) {
  if (closes.length < 200) return null;

  let lastCross = null;
  let previousRelation = null;
  for (let index = 199; index < closes.length; index += 1) {
    const sma50 = smaAt(closes, index, 50);
    const sma200 = smaAt(closes, index, 200);
    if (sma50 == null || sma200 == null || sma50 === sma200) continue;
    const relation = sma50 > sma200 ? "golden" : "death";
    if (previousRelation && relation !== previousRelation) {
      lastCross = { type: relation, index, date: dates[index] || null };
    }
    previousRelation = relation;
  }

  const sma50 = computeSma(closes, 50);
  const sma200 = computeSma(closes, 200);
  if (sma50 == null || sma200 == null || sma50 === sma200) return null;
  const regime = sma50 > sma200 ? "golden" : "death";
  return {
    regime,
    lastCrossDate: lastCross?.date || null,
    sessionsSinceCross: lastCross ? closes.length - 1 - lastCross.index : null,
    isRecent: lastCross ? closes.length - 1 - lastCross.index <= 5 : false,
    distancePercent: distanceFromSma(sma50, sma200),
  };
}

export function computeLongTermMetrics(closes, dates = []) {
  const current = closes.at(-1);
  const sma200 = computeSma(closes, 200);
  const ath = currentDrawdownFromAth(closes);
  const range52w = computeRangePosition(closes);
  return {
    distanceSma200: distanceFromSma(current, sma200),
    ...ath,
    range52wLow: range52w.low,
    range52wHigh: range52w.high,
    range52wPosition: range52w.position,
    smaCross: findSmaCross(closes, dates),
  };
}