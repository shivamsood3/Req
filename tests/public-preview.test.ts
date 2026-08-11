import assert from "node:assert/strict";
import test from "node:test";
import { serializeBrokerRequirement } from "../lib/broker-requirement.ts";
import { serializePublicPreview } from "../lib/public-preview.ts";

const databaseRow = {
  id: "b1000000-0000-4000-8000-000000000001",
  locality_names: ["Defence Colony", "Greater Kailash I"],
  locality_slugs: ["defence-colony", "greater-kailash-i"],
  property_type_key: "floor" as const,
  budget_min: 12,
  budget_max: 15,
  size_min: 325,
  size_max: 500,
  size_unit: "sq yd",
  floor_preference: "First floor preferred",
  response_count: 4,
  live_since: new Date().toISOString(),
};

test("public preview exposes one aggregated locality list and no private fields", () => {
  const rowWithPrivateColumns = {
    ...databaseRow,
    broker_id: "private-broker-id",
    notes: "Private buyer and contact notes",
    buyer_type: "private",
    mobile: "+91 99999 99999",
    email: "private@example.com",
  };
  const preview = serializePublicPreview(rowWithPrivateColumns);
  const rendered = JSON.stringify(preview);

  assert.deepEqual(preview.localityNames, ["Defence Colony", "Greater Kailash I"]);
  assert.equal("broker_id" in preview, false);
  assert.equal("notes" in preview, false);
  assert.equal("buyer_type" in preview, false);
  assert.equal("mobile" in preview, false);
  assert.equal("email" in preview, false);
  assert.equal(rendered.includes("private-broker-id"), false);
  assert.equal(rendered.includes("99999"), false);
});

test("authenticated requirement serializer includes content but never contact fields", () => {
  const detail = serializeBrokerRequirement({
    ...databaseRow,
    broker_id: "broker-id",
    broker_name: "Shivam Sood",
    brokerage: "Hacoco Ventures",
    buyer_type: "End user",
    urgency: "Immediate",
    notes: "Genuine buyer actively evaluating options.",
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  });

  assert.equal(detail.brokerName, "Shivam Sood");
  assert.equal(detail.notes, "Genuine buyer actively evaluating options.");
  assert.equal("mobile" in detail, false);
  assert.equal("email" in detail, false);
});
