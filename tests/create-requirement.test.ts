import assert from "node:assert/strict";
import test from "node:test";
import {
  createRequirementFields,
  validateCreateRequirement,
  type CreateRequirementFields,
} from "../lib/create-requirement.ts";

const firstLocality = "b2000000-0000-4000-8000-000000000001";
const secondLocality = "b2000000-0000-4000-8000-000000000002";

function validFields(overrides: Partial<CreateRequirementFields> = {}): CreateRequirementFields {
  return {
    localityIds: [firstLocality],
    propertyType: "floor",
    budgetMin: "12",
    budgetMax: "15",
    sizeMin: "325",
    sizeMax: "500",
    sizeUnit: "sq yd",
    floorPreference: "First",
    buyerType: "End User",
    urgency: "Immediate",
    notes: "Genuine buyer actively evaluating options.",
    ...overrides,
  };
}

test("validates and normalizes a complete multi-locality REQ", () => {
  const result = validateCreateRequirement(validFields({ localityIds: [firstLocality, secondLocality] }));
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data.localityIds, [firstLocality, secondLocality]);
  assert.equal(result.data.propertyType, "floor");
  assert.equal(result.data.budgetMin, 12);
  assert.equal(result.data.budgetMax, 15);
  assert.equal(result.data.notes, "Genuine buyer actively evaluating options.");
});

test("requires at least one unique valid locality", () => {
  const missing = validateCreateRequirement(validFields({ localityIds: [] }));
  const duplicate = validateCreateRequirement(validFields({ localityIds: [firstLocality, firstLocality] }));
  const invalid = validateCreateRequirement(validFields({ localityIds: ["not-a-uuid"] }));
  assert.equal(missing.success, false);
  assert.equal(duplicate.success, false);
  assert.equal(invalid.success, false);
});

test("rejects invalid property types and budget ranges without swapping values", () => {
  const property = validateCreateRequirement(validFields({ propertyType: "villa" }));
  const budget = validateCreateRequirement(validFields({ budgetMin: "15", budgetMax: "12" }));
  const zero = validateCreateRequirement(validFields({ budgetMin: "0" }));
  assert.equal(property.success, false);
  assert.equal(budget.success, false);
  assert.equal(zero.success, false);
});

test("supports one-sided optional size and rejects invalid ranges", () => {
  const oneSided = validateCreateRequirement(validFields({ sizeMax: "" }));
  const invalidRange = validateCreateRequirement(validFields({ sizeMin: "500", sizeMax: "325" }));
  const missingUnit = validateCreateRequirement(validFields({ sizeUnit: "" }));
  assert.equal(oneSided.success, true);
  assert.equal(invalidRange.success, false);
  assert.equal(missingUnit.success, false);
});

test("optional controlled values are validated and blank values normalize to null", () => {
  const blank = validateCreateRequirement(validFields({
    sizeMin: "", sizeMax: "", floorPreference: "", buyerType: "", urgency: "", notes: "  ",
  }));
  assert.equal(blank.success, true);
  if (blank.success) {
    assert.equal(blank.data.sizeUnit, null);
    assert.equal(blank.data.floorPreference, null);
    assert.equal(blank.data.buyerType, null);
    assert.equal(blank.data.urgency, null);
    assert.equal(blank.data.notes, null);
  }

  assert.equal(validateCreateRequirement(validFields({ floorPreference: "Basement" })).success, false);
  assert.equal(validateCreateRequirement(validFields({ buyerType: "Tenant" })).success, false);
  assert.equal(validateCreateRequirement(validFields({ urgency: "Yesterday" })).success, false);
});

test("notes are capped at 500 characters", () => {
  assert.equal(validateCreateRequirement(validFields({ notes: "x".repeat(500) })).success, true);
  assert.equal(validateCreateRequirement(validFields({ notes: "x".repeat(501) })).success, false);
});

test("FormData parser preserves all submitted locality rows", () => {
  const formData = new FormData();
  formData.append("locality_id", firstLocality);
  formData.append("locality_id", secondLocality);
  formData.append("property_type", "commercial");
  formData.append("budget_min", "8");
  formData.append("budget_max", "10");
  const fields = createRequirementFields(formData);
  assert.deepEqual(fields.localityIds, [firstLocality, secondLocality]);
  assert.equal(fields.propertyType, "commercial");
});
