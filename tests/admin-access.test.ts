import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeAuthError } from "../lib/auth-errors.ts";

const migrationPath = new URL("../supabase/migrations/20260812071127_bootstrap_admin_access.sql", import.meta.url);
const adminPagePath = new URL("../app/admin/page.tsx", import.meta.url);
const brokersPagePath = new URL("../app/admin/brokers/page.tsx", import.meta.url);
const brokerActionPath = new URL("../app/admin/brokers/actions.ts", import.meta.url);
const authPath = new URL("../lib/auth.ts", import.meta.url);

test("bootstrap migration approves shivam admin and confirms the auth email", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /lower\(email\) = 'shivam@theantialias\.com'/i);
  assert.match(sql, /email_confirmed_at = coalesce\(email_confirmed_at, now\(\)\)/i);
  assert.match(sql, /confirmed_at = coalesce\(confirmed_at, now\(\)\)/i);
  assert.match(sql, /'admin'::public\.broker_role/i);
  assert.match(sql, /'approved'::public\.broker_status/i);
  assert.match(sql, /create or replace function public\.handle_new_user/i);
});

test("review broker RPC supports basic status toggles without changing admin accounts", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /p_decision not in \('pending', 'approved', 'suspended', 'rejected'\)/i);
  assert.match(sql, /p_decision::public\.broker_status/i);
  assert.match(sql, /role = 'broker'/i);
  assert.match(sql, /id <> auth\.uid\(\)/i);
  assert.match(sql, /grant execute on function public\.review_broker\(uuid, text\) to authenticated/i);
});

test("admin UI lists all brokers and exposes approve pending suspend reject controls", async () => {
  const [adminPage, brokersPage, action] = await Promise.all([
    readFile(adminPagePath, "utf8"),
    readFile(brokersPagePath, "utf8"),
    readFile(brokerActionPath, "utf8"),
  ]);
  assert.match(adminPage, /Basic access control for REQ brokers/);
  assert.match(brokersPage, /\.eq\("role", "broker"\)/);
  assert.match(brokersPage, /Broker admin/);
  for (const status of ["approved", "pending", "suspended", "rejected"]) {
    assert.match(`${brokersPage}\n${action}`, new RegExp(status));
  }
});

test("admin route no longer requires broker profile completion", async () => {
  const source = await readFile(authPath, "utf8");
  const requireAdminBlock = source.match(/export async function requireAdmin\(\)[\s\S]*?^}/m)?.[0] ?? "";
  assert.match(requireAdminBlock, /canAccessArea\(session\.profile, "admin"\)/);
  assert.doesNotMatch(requireAdminBlock, /isProfileComplete/);
});

test("email confirmation login failure is no longer a generic try-again error", () => {
  assert.equal(
    normalizeAuthError("Email not confirmed", "Couldn’t sign you in. Try again."),
    "This email is not confirmed yet. Use Forgot password once, or ask an admin to confirm the account.",
  );
});
