import assert from "node:assert/strict";
import test from "node:test";
import { groupOwnRequirements, ownerRequirementGroup } from "../lib/requirement-lifecycle.ts";
import type { OwnerRequirement } from "../lib/types.ts";

const now = new Date("2026-08-12T00:00:00.000Z").getTime();

function item(
  id: string,
  effectiveStatus: OwnerRequirement["effectiveStatus"],
  expiresAt: string,
): OwnerRequirement {
  return {
    id,
    brokerId: "owner",
    brokerName: "Owner",
    brokerage: "REQ Test",
    localityIds: ["b3000000-0000-4000-8000-000000000001"],
    localityNames: ["Defence Colony"],
    localitySlugs: ["defence-colony"],
    propertyTypeKey: "floor",
    propertyType: "Independent Floor",
    budgetMin: 12,
    budgetMax: 15,
    budgetLabel: "₹12–15 Cr",
    sizeMin: 325,
    sizeMax: 500,
    sizeUnit: "sq yd",
    sizeLabel: "325–500 sq yd",
    floorPreference: "First",
    buyerType: "End User",
    urgency: "Active",
    notes: null,
    responseCount: 0,
    liveSince: new Date(now - 2 * 86_400_000).toISOString(),
    updatedAt: new Date(now - 2 * 86_400_000).toISOString(),
    expiresAt,
    storedStatus: effectiveStatus,
    effectiveStatus,
    createdAt: new Date(now - 2 * 86_400_000).toISOString(),
    closedAt: effectiveStatus === "closed" ? new Date(now - 86_400_000).toISOString() : null,
    renewalCount: 0,
  };
}

test("owner requirements classify active, expiring, and effective history", () => {
  const active = item("active", "live", new Date(now + 25 * 3_600_000).toISOString());
  const expiring = item("expiring", "live", new Date(now + 24 * 3_600_000).toISOString());
  const expired = item("expired", "expired", new Date(now - 1).toISOString());
  const closed = item("closed", "closed", new Date(now + 86_400_000).toISOString());

  assert.equal(ownerRequirementGroup(active, now), "active");
  assert.equal(ownerRequirementGroup(expiring, now), "expiring");
  assert.equal(ownerRequirementGroup(expired, now), "history");
  assert.equal(ownerRequirementGroup(closed, now), "history");

  const groups = groupOwnRequirements([active, expiring, expired, closed], now);
  assert.deepEqual(groups.active.map(({ id }) => id), ["active"]);
  assert.deepEqual(groups.expiring.map(({ id }) => id), ["expiring"]);
  assert.deepEqual(groups.history.map(({ id }) => id), ["expired", "closed"]);
});
