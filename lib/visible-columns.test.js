import test from "node:test";
import assert from "node:assert/strict";

import { mergeVisibleColumns } from "./visible-columns.js";

test("restores status when older saved settings omit it", () => {
  const defaults = ["ticker", "name", "category", "status", "score"];
  const saved = ["ticker", "name", "category", "score"];

  assert.deepEqual(mergeVisibleColumns(saved, defaults), [
    "ticker",
    "name",
    "category",
    "score",
    "status",
  ]);
});

test("keeps the user order while appending any missing default columns", () => {
  const defaults = ["ticker", "name", "status", "score"];
  const saved = ["score", "ticker"];

  assert.deepEqual(mergeVisibleColumns(saved, defaults), [
    "score",
    "ticker",
    "name",
    "status",
  ]);
});
