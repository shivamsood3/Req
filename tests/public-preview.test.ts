import assert from "node:assert/strict";
import test from "node:test";
import { serializePublicPreview } from "../lib/public-preview.ts";

test("public preview does not expose broker, notes, buyer, or contact data", () => {
  const databaseRow = {
    id: "b1000000-0000-4000-8000-000000000001",
    locality_name: "Defence Colony",
    locality_slug: "defence-colony",
    property_type: "Independent Floor",
    budget_min: 12,
    budget_max: 15,
    size_min: 325,
    size_max: 500,
    size_unit: "sq yd",
    floor_preference: "First floor preferred",
    response_count: 4,
    live_since: new Date().toISOString(),
    broker_id: "private-broker-id",
    notes: "Private buyer and contact notes",
    buyer_type: "private",
    mobile: "+91 99999 99999",
  };

  const preview = serializePublicPreview(databaseRow);
  const rendered = JSON.stringify(preview);
  assert.equal("broker_id" in preview, false);
  assert.equal("notes" in preview, false);
  assert.equal("buyer_type" in preview, false);
  assert.equal("mobile" in preview, false);
  assert.equal(rendered.includes("private-broker-id"), false);
  assert.equal(rendered.includes("99999"), false);
});
