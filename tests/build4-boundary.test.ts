import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/202608120003_build4_broker_responses.sql", import.meta.url);
const submitActionPath = new URL("../app/requirements/[id]/match/actions.ts", import.meta.url);
const manageActionPath = new URL("../app/requirements/[id]/my-response/actions.ts", import.meta.url);
const editActionPath = new URL("../app/requirements/[id]/my-response/[matchId]/edit/actions.ts", import.meta.url);
const inboxPagePath = new URL("../app/requirements/[id]/matches/page.tsx", import.meta.url);
const myReqsPath = new URL("../app/my-reqs/page.tsx", import.meta.url);

test("Build 4 creates requirement-scoped response containers and options, not inventory", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table public\.broker_responses/i);
  assert.match(sql, /unique \(requirement_id, broker_id\)/i);
  assert.match(sql, /create table public\.matches/i);
  assert.match(sql, /maximum 3 active match options allowed/i);
  assert.doesNotMatch(sql, /create table public\.(properties|listings|inventory)/i);
});

test("response totals derive distinct active broker containers rather than options", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /select count\(\*\)::integer[\s\S]*from public\.broker_responses[\s\S]*exists[\s\S]*m\.status = 'active'/i);
  assert.doesNotMatch(sql, /response_count\s*=\s*response_count\s*[+-]/i);
});

test("match mutations are approved-owner scoped and lifecycle constrained", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const name of ["submit_match", "update_own_match", "withdraw_own_match"]) {
    assert.match(sql, new RegExp(`function public\\.${name}`));
  }
  assert.match(sql, /requirement_owner_id = current_user_id/i);
  assert.match(sql, /br\.broker_id = current_user_id/i);
  assert.match(sql, /requirement_status <> 'live' or requirement_expires_at <= now\(\)/i);
  assert.match(sql, /status = 'withdrawn', withdrawn_at = now\(\)/i);
  assert.doesNotMatch(sql, /p_broker_id/i);
});

test("read functions isolate owner inbox and respondent history without contact fields", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /function public\.get_requirement_responses_for_owner/i);
  assert.match(sql, /r\.broker_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /function public\.get_own_response/i);
  assert.match(sql, /br\.broker_id = \(select auth\.uid\(\)\)/i);
  const returnContracts = sql.match(/returns table \([\s\S]*?\)\n+(?:language sql|language plpgsql)/gi)?.join("\n") ?? "";
  assert.doesNotMatch(returnContracts, /mobile|email/i);
  assert.match(sql, /revoke all on public\.matches from public, anon, authenticated/i);
});

test("every Build 4 server action independently authorizes", async () => {
  const sources = await Promise.all([submitActionPath, manageActionPath, editActionPath].map((path) => readFile(path, "utf8")));
  for (const source of sources) assert.match(source, /await requireApprovedBroker\(\)/);
  assert.doesNotMatch(sources.join("\n"), /p_broker_id|mobile|email|whatsapp/i);
});

test("owner inbox keeps Connect disabled and Responded tab uses real data", async () => {
  const [inbox, myReqs] = await Promise.all([readFile(inboxPagePath, "utf8"), readFile(myReqsPath, "utf8")]);
  assert.match(inbox, /Connect/);
  assert.match(inbox, /disabled/);
  assert.doesNotMatch(inbox, /phone|mobile|email|whatsapp/i);
  assert.match(myReqs, /getRespondedRequirements/);
  assert.doesNotMatch(myReqs, /Once matching is enabled|mockResponses|fixtureResponses/);
});
