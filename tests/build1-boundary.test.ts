import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260811235507_build1_live_discovery.sql", import.meta.url),
  "utf8",
);
const detailRoute = readFileSync(
  new URL("../app/requirements/[id]/page.tsx", import.meta.url),
  "utf8",
);

test("public and broker access paths enforce effective live status", () => {
  const strictLivePredicates = migration.match(/status = 'live'[\s\S]{0,80}expires_at > now\(\)/g) ?? [];
  assert.ok(strictLivePredicates.length >= 4);
  assert.equal(migration.includes("expires_at is null"), false);
});

test("broker RPC is approved-only and unavailable to anonymous users", () => {
  assert.match(migration, /where public\.is_approved_user\(\(select auth\.uid\(\)\)\)/);
  assert.match(migration, /revoke all on function public\.get_broker_live_requirements[\s\S]+from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.get_broker_live_requirements[\s\S]+to authenticated/);
});

test("public preview aggregates localities to one row per requirement", () => {
  assert.match(migration, /array_agg\(l\.name/);
  assert.match(migration, /group by\s+r\.id/);
});

test("authenticated detail is gated and its data contract excludes contact fields", () => {
  assert.match(detailRoute, /requireApprovedBroker\(\)/);
  const resultDeclaration = migration.slice(
    migration.indexOf("returns table ("),
    migration.indexOf(")\nlanguage sql", migration.indexOf("returns table (")),
  );
  assert.equal(/\bmobile\b/.test(resultDeclaration), false);
  assert.equal(/\bemail\b/.test(resultDeclaration), false);
});
