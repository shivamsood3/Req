import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/202608120004_build5_connections.sql", import.meta.url);
const securityTestPath = new URL("../supabase/tests/build5_security.sql", import.meta.url);
const connectActionPath = new URL("../app/requirements/[id]/matches/actions.ts", import.meta.url);
const ownerInboxPath = new URL("../app/requirements/[id]/matches/page.tsx", import.meta.url);
const ownResponsePath = new URL("../app/requirements/[id]/my-response/page.tsx", import.meta.url);
const respondedCardPath = new URL("../components/responded-requirement-card.tsx", import.meta.url);

test("Build 5 adds scoped connections without storing duplicate contact fields", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table public\.connections/i);
  assert.match(sql, /unique \(requirement_id, responding_broker_id\)/i);
  assert.match(sql, /request_owner_id uuid not null references public\.profiles/i);
  assert.match(sql, /responding_broker_id uuid not null references public\.profiles/i);
  assert.doesNotMatch(sql, /create table public\.(messages|threads|conversations|notifications|chats)/i);
  assert.doesNotMatch(sql.match(/create table public\.connections[\s\S]*?\);/i)?.[0] ?? "", /mobile|phone|email/i);
});

test("connect RPC is owner-derived, live-only, active-response-only, and idempotent", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /function public\.connect_to_response\([\s\S]*p_requirement_id uuid,[\s\S]*p_responding_broker_id uuid[\s\S]*\)/i);
  assert.match(sql, /security definer[\s\S]*set search_path = ''/i);
  assert.match(sql, /select broker_id, status, expires_at[\s\S]*into requirement_owner_id/i);
  assert.match(sql, /requirement_owner_id <> current_user_id/i);
  assert.match(sql, /requirement_status <> 'live' or requirement_expires_at <= now\(\)/i);
  assert.match(sql, /not public\.is_approved_user\(p_responding_broker_id\)/i);
  assert.match(sql, /m\.status = 'active'/i);
  assert.match(sql, /on conflict \(requirement_id, responding_broker_id\) do nothing/i);
  assert.doesNotMatch(sql, /p_request_owner_id|p_mobile|p_email/i);
});

test("connection contact data is returned only inside scoped read functions and never includes email", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const returnContracts = sql.match(/returns table \([\s\S]*?\)\n+(?:language sql|language plpgsql)/gi)?.join("\n") ?? "";
  assert.match(returnContracts, /respondent_mobile|requirement_owner_mobile/i);
  assert.doesNotMatch(returnContracts, /\bemail\b/i);
  assert.match(sql, /case when c\.id is not null then p\.mobile else null end/i);
  assert.match(sql, /case when c\.id is not null then owner_profile\.mobile else null end/i);
  assert.match(sql, /revoke all on public\.connections from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.connect_to_response\(uuid, uuid\) to authenticated/i);
});

test("server action independently authorizes and uses only the scoped RPC", async () => {
  const source = await readFile(connectActionPath, "utf8");
  assert.match(source, /await requireApprovedBroker\(\)/);
  assert.match(source, /supabase\.rpc\("connect_to_response"/);
  assert.doesNotMatch(source, /insert\(|service_role|mobile|email|whatsAppBusiness|graph\.facebook/i);
});

test("owner and respondent UI show connected state with WhatsApp handoff but no chat or notifications", async () => {
  const [ownerInbox, ownResponse, respondedCard] = await Promise.all([
    readFile(ownerInboxPath, "utf8"),
    readFile(ownResponsePath, "utf8"),
    readFile(respondedCardPath, "utf8"),
  ]);
  const source = `${ownerInbox}\n${ownResponse}\n${respondedCard}`;
  assert.match(source, /ConnectResponseAction/);
  assert.match(source, /✓ Connected/);
  assert.match(source, /Open WhatsApp/);
  assert.match(source, /connectionId/);
  assert.doesNotMatch(source, /email|messages|threads|conversation|notification|push|sms/i);
});

test("SQL security suite covers Build 5 privacy and lifecycle regressions", async () => {
  const sql = await readFile(securityTestPath, "utf8");
  for (const phrase of [
    "anonymous cannot connect",
    "pending broker cannot connect",
    "suspended broker cannot connect",
    "non-owner cannot initiate connection",
    "responding broker cannot initiate connect",
    "owner can connect to broker with active response",
    "cannot connect to broker with no response",
    "cannot connect if respondent has zero active options",
    "cannot connect on expired requirement",
    "cannot connect on closed requirement",
    "duplicate connect returns existing connection",
    "owner can connect to multiple distinct responding brokers",
    "owner cannot see respondent phone before connect",
    "owner sees respondent phone after connect",
    "owner phone visible to respondent after connect",
    "unrelated broker cannot retrieve owner inbox or contact data",
    "connection remains after REQ closes",
    "connection remains after REQ expires",
    "withdrawing matched option after connection does not delete connection",
  ]) {
    assert.match(sql, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
