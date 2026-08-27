import test from "node:test";
import assert from "node:assert/strict";

import { computeLongTermMetrics, computeRangePosition, findSmaCross } from "./technical-metrics.js";

test("calculates SMA200 distance, current ATH drawdown, and 52-week range position", () => {
  const closes = Array.from({ length: 252 }, (_, index) => index + 1);
  const metrics = computeLongTermMetrics(closes);

  assert.equal(metrics.distanceSma200.toFixed(2), "65.25");
  assert.equal(metrics.athPrice, 252);
  assert.equal(metrics.drawdownFromAth, 0);
  assert.equal(metrics.range52wLow, 1);
  assert.equal(metrics.range52wHigh, 252);
  assert.equal(metrics.range52wPosition, 100);
});

test("handles a flat 52-week range without inventing a position", () => {
  assert.deepEqual(computeRangePosition([10, 10, 10]), { low: 10, high: 10, position: null });
});

test("reports regime, last cross date, and five-session recent-cross alert", () => {
  const closes = Array(150).fill(100).concat(Array(99).fill(50), Array(6).fill(10000));
  const dates = closes.map((_, index) => `day-${index}`);
  const cross = findSmaCross(closes, dates);

  assert.equal(cross.regime, "golden");
  assert.equal(cross.lastCrossDate, "day-249");
  assert.equal(cross.sessionsSinceCross, 5);
  assert.equal(cross.isRecent, true);
});