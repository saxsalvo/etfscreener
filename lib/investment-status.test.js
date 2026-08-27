import test from "node:test";
import assert from "node:assert/strict";

import { computeProfileStatus, normalizeProfile } from "./investment-status.js";

const longEntry = {
  distanceSma200: -5,
  smaCross: { regime: "golden" },
  drawdownFromAth: -26,
  range52wPosition: 30,
  year1Return: 12,
  quality: 4,
};

test("long profile gives a strong-buy score to an aligned long-term entry", () => {
  const result = computeProfileStatus(longEntry, { mode: "long" });
  assert.equal(result.status, "strong_buy");
  assert.equal(result.score, 92);
});

test("custom profile evaluates only the user-selected metrics", () => {
  const result = computeProfileStatus({ rsi14: 60, positive20: 15 }, { mode: "custom", selectedMetrics: ["rsi14"] });
  assert.equal(result.status, "strong_buy");
  assert.deepEqual(result.selectedMetrics, ["rsi14"]);
});

test("invalid custom profile falls back to the long profile", () => {
  assert.deepEqual(normalizeProfile({ mode: "custom", selectedMetrics: ["unknown"] }).selectedMetrics, [
    "distanceSma200", "smaCross", "drawdownFromAth", "range52wPosition", "year1Return", "quality",
  ]);
});