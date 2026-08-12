import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessArea,
  isProfileComplete,
  newProfileDefaults,
  resolvePostAuthRoute,
} from "../lib/auth-policy.ts";
import type { BrokerProfile } from "../lib/types.ts";

function profile(overrides: Partial<BrokerProfile> = {}): BrokerProfile {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    email: "broker@example.com",
    full_name: "Aarav Mehta",
    company_name: "Mehta Properties",
    mobile: "+91 98765 43210",
    primary_market: "South Delhi",
    rera_number: null,
    role: "broker",
    status: "pending",
    approved_at: null,
    suspended_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

test("pending user cannot access /home", () => {
  assert.equal(canAccessArea(profile({ status: "pending" }), "broker"), false);
  assert.equal(resolvePostAuthRoute(profile({ status: "pending" })), "/pending");
});

test("approved user can access /home", () => {
  assert.equal(canAccessArea(profile({ status: "approved" }), "broker"), true);
  assert.equal(resolvePostAuthRoute(profile({ status: "approved" })), "/home");
});

test("broker cannot access /admin", () => {
  assert.equal(canAccessArea(profile({ status: "approved", role: "broker" }), "admin"), false);
});

test("admin can access /admin", () => {
  assert.equal(canAccessArea(profile({ status: "approved", role: "admin" }), "admin"), true);
  assert.equal(resolvePostAuthRoute(profile({ status: "approved", role: "admin" })), "/admin");
});

test("approved admin can reach admin even before broker profile completion", () => {
  assert.equal(
    resolvePostAuthRoute(profile({ status: "approved", role: "admin", full_name: null })),
    "/admin",
  );
});

test("rejected and suspended users cannot access the broker app", () => {
  assert.equal(canAccessArea(profile({ status: "rejected" }), "broker"), false);
  assert.equal(canAccessArea(profile({ status: "suspended" }), "broker"), false);
  assert.equal(resolvePostAuthRoute(profile({ status: "rejected" })), "/access-suspended");
  assert.equal(resolvePostAuthRoute(profile({ status: "suspended" })), "/access-suspended");
});

test("incomplete profiles are sent to profile setup", () => {
  const incomplete = profile({ full_name: null });
  assert.equal(isProfileComplete(incomplete), false);
  assert.equal(resolvePostAuthRoute(incomplete), "/profile-setup");
});

test("new profile creation defaults to broker pending status", () => {
  assert.deepEqual(newProfileDefaults(), { role: "broker", status: "pending" });
});
