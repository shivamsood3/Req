import assert from "node:assert/strict";
import test from "node:test";
import {
  budgetRangesOverlap,
  parseFeedFilters,
  previewMatchesFilters,
} from "../lib/feed-filters.ts";
import { serializePublicPreview } from "../lib/public-preview.ts";

const allowed = ["defence-colony", "greater-kailash-i", "hauz-khas"];
const preview = serializePublicPreview({
  id: "b1000000-0000-4000-8000-000000000010",
  locality_names: ["Defence Colony", "Greater Kailash I"],
  locality_slugs: ["defence-colony", "greater-kailash-i"],
  property_type_key: "floor",
  budget_min: 12,
  budget_max: 15,
  size_min: 325,
  size_max: 500,
  size_unit: "sq yd",
  floor_preference: null,
  response_count: 3,
  live_since: "2026-08-11T12:00:00.000Z",
});

test("location filter accepts multiple allowed localities and rejects unknown slugs", () => {
  const filters = parseFeedFilters(
    { locality: ["defence-colony", "unknown", "greater-kailash-i"] },
    allowed,
  );
  assert.deepEqual(filters.localities, ["defence-colony", "greater-kailash-i"]);
  assert.equal(previewMatchesFilters(preview, filters), true);
});

test("property type filter uses normalized stored keys", () => {
  const matching = parseFeedFilters({ type: "floor" }, allowed);
  const nonMatching = parseFeedFilters({ type: "commercial" }, allowed);
  const invalid = parseFeedFilters({ type: "villa" }, allowed);

  assert.equal(previewMatchesFilters(preview, matching), true);
  assert.equal(previewMatchesFilters(preview, nonMatching), false);
  assert.equal(invalid.propertyType, null);
});

test("budget filter uses plausible range overlap", () => {
  assert.equal(budgetRangesOverlap(12, 15, 10, 12), true);
  assert.equal(budgetRangesOverlap(12, 15, 15, 20), true);
  assert.equal(budgetRangesOverlap(12, 15, 16, 20), false);
  assert.equal(budgetRangesOverlap(12, 15, 5, 11.9), false);
});

test("invalid and inverted budget parameters are ignored server-side", () => {
  assert.deepEqual(parseFeedFilters({ budgetMin: "abc", budgetMax: "-1" }, allowed), {
    localities: [],
    propertyType: null,
    budgetMin: null,
    budgetMax: null,
  });
  assert.deepEqual(parseFeedFilters({ budgetMin: "20", budgetMax: "10" }, allowed), {
    localities: [],
    propertyType: null,
    budgetMin: null,
    budgetMax: null,
  });
});
