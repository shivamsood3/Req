import assert from "node:assert/strict";
import test from "node:test";
import { matchOptionFields, validateMatchOption } from "../lib/match-option.ts";

const valid = {
  localityId: "b4000000-0000-4000-8000-000000000001",
  askingPrice: "13.75",
  size: "400",
  sizeUnit: "sq yd",
  floor: "First",
  source: "Direct",
  notes: "Owner open to discussion.",
};

test("normalizes a structured match option", () => {
  const result = validateMatchOption(valid);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.askingPrice, 13.75);
    assert.equal(result.data.size, 400);
    assert.equal(result.data.source, "Direct");
  }
});

test("requires location and a positive asking price", () => {
  const result = validateMatchOption({ ...valid, localityId: "", askingPrice: "0" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.errors.localityId);
    assert.ok(result.errors.askingPrice);
  }
});

test("optional size requires an allowed unit and positive value", () => {
  assert.equal(validateMatchOption({ ...valid, size: "", sizeUnit: "" }).success, true);
  assert.equal(validateMatchOption({ ...valid, size: "-2" }).success, false);
  assert.equal(validateMatchOption({ ...valid, sizeUnit: "hectare" }).success, false);
});

test("rejects unsupported floor and source taxonomies", () => {
  assert.equal(validateMatchOption({ ...valid, floor: "Basement" }).success, false);
  assert.equal(validateMatchOption({ ...valid, source: "Two hop" }).success, false);
});

test("notes are plain text capped at 500 characters", () => {
  assert.equal(validateMatchOption({ ...valid, notes: "x".repeat(500) }).success, true);
  assert.equal(validateMatchOption({ ...valid, notes: "x".repeat(501) }).success, false);
});

test("FormData parser reads only the match fields", () => {
  const form = new FormData();
  form.set("locality_id", valid.localityId);
  form.set("asking_price", valid.askingPrice);
  form.set("size", valid.size);
  form.set("size_unit", valid.sizeUnit);
  form.set("floor", valid.floor);
  form.set("source", valid.source);
  form.set("notes", valid.notes);
  form.set("broker_id", "untrusted");
  assert.deepEqual(matchOptionFields(form), valid);
});
