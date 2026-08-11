import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/202608120002_build3_requirement_lifecycle.sql", import.meta.url);
const myReqsPath = new URL("../app/my-reqs/page.tsx", import.meta.url);
const editActionPath = new URL("../app/requirements/[id]/edit/actions.ts", import.meta.url);
const lifecycleActionPath = new URL("../app/my-reqs/actions.ts", import.meta.url);

test("owner history is isolated while effective-live broker access remains", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /status = 'live' and expires_at > now\(\)[\s\S]{0,100}or broker_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /r\.broker_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /create or replace function public\.get_own_requirements/i);
  assert.doesNotMatch(sql, /p_broker_id/i);
});

test("edit, close, and renew are narrow approved-owner security-definer functions", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const name of ["update_own_requirement", "close_own_requirement", "renew_own_requirement"]) {
    assert.match(sql, new RegExp(`function public\\.${name}`));
  }
  assert.ok((sql.match(/security definer/gi) ?? []).length >= 4);
  assert.match(sql, /broker_id = current_user_id[\s\S]*for update/i);
  assert.match(sql, /current_expires_at <= now\(\)/i);
  assert.match(sql, /current_expires_at > renewed_at \+ interval '24 hours'/i);
  assert.match(sql, /renewal_count = renewal_count \+ 1/i);
});

test("editing cannot change publication, expiry, ownership, counters, or status", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const updateBody = sql.slice(sql.indexOf("create or replace function public.update_own_requirement"), sql.indexOf("create or replace function public.close_own_requirement"));
  const updateStatement = updateBody.slice(updateBody.indexOf("update public.requirements"));
  assert.doesNotMatch(updateStatement, /live_since\s*=/i);
  assert.doesNotMatch(updateStatement, /expires_at\s*=/i);
  assert.doesNotMatch(updateStatement, /renewal_count\s*=/i);
  assert.doesNotMatch(updateStatement, /broker_id\s*=/i);
  assert.doesNotMatch(updateStatement, /status\s*=/i);
});

test("routes and actions independently require approved broker access", async () => {
  const [myReqs, editAction, lifecycleAction] = await Promise.all([
    readFile(myReqsPath, "utf8"),
    readFile(editActionPath, "utf8"),
    readFile(lifecycleActionPath, "utf8"),
  ]);
  assert.match(myReqs, /requireApprovedBroker\(\)/);
  assert.match(editAction, /await requireApprovedBroker\(\)/);
  assert.match(lifecycleAction, /await requireApprovedBroker\(\)/);
  assert.doesNotMatch(`${myReqs}${editAction}${lifecycleAction}`, /submit match|connect broker|notification/i);
});

test("My REQs has truthful posted/responded states without response fixtures", async () => {
  const source = await readFile(myReqsPath, "utf8");
  assert.match(source, /Posted/);
  assert.match(source, /Responded/);
  assert.match(source, /No responses sent yet\./);
  assert.match(source, /groupOwnRequirements/);
  assert.doesNotMatch(source, /developmentResponses|mockResponses|fixtureResponses/);
});
