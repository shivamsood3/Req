import assert from "node:assert/strict";
import test from "node:test";
import {
  formatFreshness,
  formatLocalitySummary,
} from "../lib/requirement-format.ts";

const now = new Date("2026-08-12T00:00:00.000Z").getTime();

test("freshness supports minutes, hours, and days from live_since", () => {
  assert.equal(formatFreshness(new Date(now - 12 * 60_000).toISOString(), now), "12 MIN AGO");
  assert.equal(formatFreshness(new Date(now - 3 * 3_600_000).toISOString(), now), "3 HR AGO");
  assert.equal(formatFreshness(new Date(now - 2 * 86_400_000).toISOString(), now), "2 DAYS AGO");
});

test("multi-locality summary keeps one compact card label", () => {
  assert.equal(formatLocalitySummary(["Defence Colony"]), "Defence Colony");
  assert.equal(
    formatLocalitySummary(["Defence Colony", "Greater Kailash I"]),
    "Defence Colony + Greater Kailash I",
  );
  assert.equal(
    formatLocalitySummary(["Defence Colony", "Greater Kailash I", "Hauz Khas"]),
    "Defence Colony + 2 MORE",
  );
});
