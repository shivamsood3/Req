import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/202608120001_build2_create_requirement.sql", import.meta.url);
const formPath = new URL("../components/post-requirement-form.tsx", import.meta.url);
const actionPath = new URL("../app/post/actions.ts", import.meta.url);
const pagePath = new URL("../app/post/page.tsx", import.meta.url);

test("creation is an authenticated-only security-definer RPC with server-owned lifecycle", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /security definer/i);
  assert.match(sql, /current_user_id uuid := auth\.uid\(\)/i);
  assert.match(sql, /public\.is_approved_user\(current_user_id\)/i);
  assert.match(sql, /revoke all on function public\.create_requirement[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.create_requirement[\s\S]*to authenticated/i);
  assert.match(sql, /published_at \+ interval '7 days'/i);
  assert.match(sql, /'live',[\s\n ]*0,/i);
  assert.doesNotMatch(sql, /p_broker_id/i);
});

test("server action independently authorizes and masks database failures", async () => {
  const source = await readFile(actionPath, "utf8");
  assert.match(source, /await requireApprovedBroker\(\)/);
  assert.match(source, /validateCreateRequirement/);
  assert.match(source, /supabase\.rpc\("create_requirement"/);
  assert.match(source, /We couldn’t post this REQ/);
  assert.doesNotMatch(source, /error\.message\s*[,}]/);
});

test("post route is approved-only and has no upload, AI, match, or Connect flow", async () => {
  const [page, form] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(formPath, "utf8"),
  ]);
  assert.match(page, /requireApprovedBroker\(\)/);
  assert.doesNotMatch(form, /type=["']file["']/i);
  assert.doesNotMatch(form, /\bAI\b|match submission|connect broker/i);
});

test("duplicate submit protection disables the live action while pending", async () => {
  const form = await readFile(formPath, "utf8");
  assert.match(form, /useActionState\(action/);
  assert.match(form, /disabled=\{pending\}/);
  assert.match(form, /submittingRef\.current/);
  assert.match(form, /mode === "post" \? "Posting…" : "Saving…"/);
});

test("public-preview consent clearly separates public and approved-broker fields", async () => {
  const form = await readFile(formPath, "utf8");
  assert.match(form, /will appear in the public preview/i);
  assert.match(form, /identity, contact details, buyer details and notes stay inside the approved broker network/i);
  assert.match(form, /safe preview for 7 days/i);
});
