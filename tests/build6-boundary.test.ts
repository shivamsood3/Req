import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/20260815071325_build6_notifications.sql", import.meta.url);
const securityTestPath = new URL("../supabase/tests/build6_security.sql", import.meta.url);
const notificationsLibPath = new URL("../lib/notifications.ts", import.meta.url);
const notificationPromptPath = new URL("../components/notification-prompt.tsx", import.meta.url);
const appShellPath = new URL("../components/app-shell.tsx", import.meta.url);
const notificationsPagePath = new URL("../app/notifications/page.tsx", import.meta.url);
const notificationsActionsPath = new URL("../app/notifications/actions.ts", import.meta.url);
const pushRoutePath = new URL("../app/api/push-subscriptions/route.ts", import.meta.url);
const cronRoutePath = new URL("../app/api/cron/req-expiring/route.ts", import.meta.url);
const serviceWorkerPath = new URL("../public/sw.js", import.meta.url);
const matchActionPath = new URL("../app/requirements/[id]/match/actions.ts", import.meta.url);
const connectActionPath = new URL("../app/requirements/[id]/matches/actions.ts", import.meta.url);
const adminActionPath = new URL("../app/admin/brokers/actions.ts", import.meta.url);
const requirementDetailPath = new URL("../app/requirements/[id]/page.tsx", import.meta.url);
const readmePath = new URL("../README.md", import.meta.url);

test("Build 6 migration adds owner-scoped notifications and push subscriptions", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create type public\.notification_type as enum/i);
  assert.match(sql, /create table public\.notifications/i);
  assert.match(sql, /create table public\.push_subscriptions/i);
  assert.match(sql, /unique \(event_key\)/i);
  assert.match(sql, /unique \(endpoint\)/i);
  assert.match(sql, /alter table public\.notifications enable row level security/i);
  assert.match(sql, /alter table public\.push_subscriptions enable row level security/i);
  assert.match(sql, /create policy "notifications_select_own"/i);
  assert.match(sql, /create policy "push_subscriptions_insert_own"/i);
  assert.doesNotMatch(sql.match(/create table public\.notifications[\s\S]*?\);/i)?.[0] ?? "", /mobile|phone|email|notes/i);
  assert.doesNotMatch(sql.match(/create table public\.push_subscriptions[\s\S]*?\);/i)?.[0] ?? "", /mobile|phone|email|notes/i);
});

test("notification events are transactional, idempotent, and Build 6 only", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /function public\.submit_match\(/i);
  assert.match(sql, /if active_option_count = 0 then[\s\S]*'new_match:' \|\| p_requirement_id::text \|\| ':' \|\| current_user_id::text/i);
  assert.match(sql, /function public\.connect_to_response\(/i);
  assert.match(sql, /else[\s\S]*'connected:' \|\| p_requirement_id::text \|\| ':' \|\| p_responding_broker_id::text/i);
  assert.match(sql, /function public\.review_broker\(/i);
  assert.match(sql, /previous_status <> 'approved'::public\.broker_status[\s\S]*'access_approved:' \|\| p_profile_id::text/i);
  assert.match(sql, /function public\.generate_req_expiring_notifications\(\)/i);
  assert.match(sql, /r\.status = 'live'[\s\S]*r\.expires_at > now\(\)[\s\S]*r\.expires_at <= now\(\) \+ interval '24 hours'/i);
  assert.match(sql, /'req_expiring:' \|\| req\.id::text \|\| ':' \|\| extract\(epoch from req\.live_since\)::text/i);
  assert.doesNotMatch(sql, /create table public\.(moderation|reports|analytics|deletions|audit_events|email_queue|messages|threads|chats)/i);
});

test("server actions trigger only the safe push sender after their scoped RPC succeeds", async () => {
  const [matchAction, connectAction, adminAction] = await Promise.all([
    readFile(matchActionPath, "utf8"),
    readFile(connectActionPath, "utf8"),
    readFile(adminActionPath, "utf8"),
  ]);

  assert.match(matchAction, /await requireApprovedBroker\(\)/);
  assert.match(matchAction, /supabase\.rpc\("submit_match"/);
  assert.match(matchAction, /sendPushForEventKey\(`new_match:\$\{requirementId\}:\$\{user\.id\}`\)/);
  assert.match(connectAction, /await requireApprovedBroker\(\)/);
  assert.match(connectAction, /supabase\.rpc\("connect_to_response"/);
  assert.match(connectAction, /sendPushForEventKey\(`connected:\$\{requirementId\}:\$\{respondingBrokerId\}`\)/);
  assert.match(adminAction, /await requireAdmin\(\)/);
  assert.match(adminAction, /supabase\.rpc\("review_broker"/);
  assert.match(adminAction, /sendPushForEventKey\(`access_approved:\$\{brokerId\}`\)/);
});

test("push implementation never prompts on load and sends safe payloads only", async () => {
  const [lib, prompt, pushRoute, cronRoute, serviceWorker] = await Promise.all([
    readFile(notificationsLibPath, "utf8"),
    readFile(notificationPromptPath, "utf8"),
    readFile(pushRoutePath, "utf8"),
    readFile(cronRoutePath, "utf8"),
    readFile(serviceWorkerPath, "utf8"),
  ]);

  assert.match(prompt, /NotificationPrompt/);
  assert.match(prompt, /Notification\.requestPermission\(\)/);
  assert.match(prompt, /onClick=\{enable\}/);
  assert.doesNotMatch(prompt, /useEffect/);
  assert.match(pushRoute, /await requireApprovedBroker\(\)/);
  assert.match(pushRoute, /from\("push_subscriptions"\)\.upsert/);
  assert.doesNotMatch(pushRoute, /service_role|SUPABASE_SERVICE_ROLE|SUPABASE_SECRET/i);
  assert.match(cronRoute, /CRON_SECRET/);
  assert.match(cronRoute, /generate_req_expiring_notifications/);
  assert.match(cronRoute, /sendPushForNotificationIds/);
  assert.match(serviceWorker, /self\.addEventListener\("push"/);
  assert.match(serviceWorker, /self\.addEventListener\("notificationclick"/);

  const payloadFunction = lib.match(/function safePushPayload[\s\S]*?\n}/)?.[0] ?? "";
  assert.match(payloadFunction, /title: "REQ"/);
  assert.match(payloadFunction, /body: notification\.body/);
  assert.match(payloadFunction, /notificationTargetUrl/);
  assert.doesNotMatch(payloadFunction, /mobile|phone|email|notes|brokerage|buyer/i);
});

test("notification UI exposes bell, inbox, mark-read navigation, and opt-in entry points", async () => {
  const [shell, page, actions, requirementDetail] = await Promise.all([
    readFile(appShellPath, "utf8"),
    readFile(notificationsPagePath, "utf8"),
    readFile(notificationsActionsPath, "utf8"),
    readFile(requirementDetailPath, "utf8"),
  ]);

  assert.match(shell, /getUnreadNotificationCount/);
  assert.match(shell, /href="\/notifications"/);
  assert.match(shell, /bell-badge/);
  assert.match(shell, /href="\/profile"/);
  assert.match(page, /requireApprovedBroker/);
  assert.match(page, /Mark all as read/);
  assert.match(page, /openNotification/);
  assert.match(actions, /mark_notification_read/);
  assert.match(actions, /mark_all_notifications_read/);
  assert.match(actions, /redirect\(notificationTargetUrl\(row\.type, row\.entity_type, row\.entity_id\)\)/);
  assert.match(requirementDetail, /<NotificationPrompt \/>/);
});

test("Build 6 SQL security suite covers privacy, dedupe, expiry, and approval cases", async () => {
  const sql = await readFile(securityTestPath, "utf8");
  for (const phrase of [
    "anonymous visitors and regular brokers cannot create or browse notification records",
    "push subscriptions are authenticated owner-scoped records",
    "first active option from a broker creates one owner match notification",
    "second active option from the same broker does not duplicate owner notification",
    "new connection notifies responding broker",
    "duplicate connection does not duplicate connected notification",
    "unrelated broker cannot select other brokers notifications",
    "broker cannot register a push subscription for another user",
    "live REQ expiring within 24 hours creates owner reminder",
    "closed and already expired REQs do not create expiry reminders",
    "expiry reminder is idempotent for the same live cycle",
    "renewed live cycle can produce a new expiry reminder",
    "regular authenticated brokers cannot invoke cron reminder generation",
    "admin approval creates access approved notification once",
    "re-approving an already approved broker does not duplicate approval notification",
  ]) {
    assert.match(sql, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Build 6 setup is documented without representing push as enabled without env vars", async () => {
  const readme = await readFile(readmePath, "utf8");
  assert.match(readme, /NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
  assert.match(readme, /VAPID_PRIVATE_KEY/);
  assert.match(readme, /VAPID_SUBJECT/);
  assert.match(readme, /CRON_SECRET/);
  assert.match(readme, /Notifications and push boundary/i);
});
