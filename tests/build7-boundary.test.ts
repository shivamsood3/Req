import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/20260815074153_build7_pilot_readiness.sql", import.meta.url);
const securityTestPath = new URL("../supabase/tests/build7_security.sql", import.meta.url);
const reportFormPath = new URL("../components/report-requirement-form.tsx", import.meta.url);
const requirementDetailPath = new URL("../app/requirements/[id]/page.tsx", import.meta.url);
const adminPagePath = new URL("../app/admin/page.tsx", import.meta.url);
const adminReportsPath = new URL("../app/admin/reports/page.tsx", import.meta.url);
const adminRequirementsPath = new URL("../app/admin/requirements/page.tsx", import.meta.url);
const adminLocalitiesPath = new URL("../app/admin/localities/page.tsx", import.meta.url);
const profilePagePath = new URL("../app/profile/page.tsx", import.meta.url);
const profileActionsPath = new URL("../app/profile/actions.ts", import.meta.url);
const privacyPath = new URL("../app/privacy/page.tsx", import.meta.url);
const termsPath = new URL("../app/terms/page.tsx", import.meta.url);
const readmePath = new URL("../README.md", import.meta.url);

test("Build 7 migration adds moderation without broker reputation or public report counts", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table public\.reports/i);
  assert.match(sql, /reported_broker_id uuid not null references public\.profiles/i);
  assert.match(sql, /reports_one_open_per_requirement_idx/i);
  assert.match(sql, /alter table public\.reports enable row level security/i);
  assert.match(sql, /reporter_id = \(select auth\.uid\(\)\)[\s\S]*or public\.is_admin/i);
  assert.match(sql, /function public\.submit_report/i);
  assert.match(sql, /select r\.broker_id into owner_id/i);
  assert.match(sql, /owner_id = current_user_id/i);
  assert.doesNotMatch(sql, /reputation|score|rating|public_report_count/i);
});

test("suspension and deletion are safe data-access changes, not hard deletes", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /owner_profile\.status = 'approved'[\s\S]*owner_profile\.deleted_at is null/i);
  assert.match(sql, /p\.status = 'approved'[\s\S]*p\.deleted_at is null/i);
  assert.match(sql, /function public\.request_account_deletion\(\)/i);
  assert.match(sql, /set status = 'closed'[\s\S]*where broker_id = current_user_id/i);
  assert.match(sql, /full_name = 'Deleted broker'/i);
  assert.match(sql, /mobile = null/i);
  assert.doesNotMatch(sql, /delete from public\.(requirements|broker_responses|matches|connections|reports)/i);
});

test("admin analytics are aggregate-only and admin-gated", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /function public\.get_admin_analytics\(\)/i);
  assert.match(sql, /weekly_active_brokers/i);
  assert.match(sql, /reqs_with_response/i);
  assert.match(sql, /match_rate numeric/i);
  assert.match(sql, /connection_rate numeric/i);
  assert.match(sql, /median_minutes_to_first_response/i);
  assert.match(sql, /first_responses as/i);
  assert.match(sql, /where public\.is_admin\(\(select auth\.uid\(\)\)\)/i);
  const analytics = sql.match(/function public\.get_admin_analytics\(\)[\s\S]*?\$\$;/i)?.[0] ?? "";
  assert.doesNotMatch(analytics, /email|mobile|phone|notes/i);
});

test("Build 7 UI exposes only pilot readiness surfaces", async () => {
  const [
    reportForm,
    requirementDetail,
    adminPage,
    adminReports,
    adminRequirements,
    adminLocalities,
    profilePage,
    profileActions,
    privacy,
    terms,
  ] = await Promise.all([
    readFile(reportFormPath, "utf8"),
    readFile(requirementDetailPath, "utf8"),
    readFile(adminPagePath, "utf8"),
    readFile(adminReportsPath, "utf8"),
    readFile(adminRequirementsPath, "utf8"),
    readFile(adminLocalitiesPath, "utf8"),
    readFile(profilePagePath, "utf8"),
    readFile(profileActionsPath, "utf8"),
    readFile(privacyPath, "utf8"),
    readFile(termsPath, "utf8"),
  ]);

  assert.match(reportForm, /Submit report/i);
  assert.match(requirementDetail, /ReportRequirementForm/);
  assert.match(adminPage, /North star/);
  assert.match(adminReports, /Suspend broker/);
  assert.match(adminRequirements, /Close REQ/);
  assert.match(adminLocalities, /Historical records remain/);
  assert.match(profilePage, /ProfileSettingsForm/);
  assert.match(profileActions, /request_account_deletion/);
  assert.match(privacy, /counsel-reviewed/i);
  assert.match(terms, /No guarantee/i);
  const combined = `${adminPage}\n${adminReports}\n${profilePage}\n${terms}`;
  assert.doesNotMatch(combined, /AI matching|inventory marketplace|followers|likes|CRM pipeline|payments/i);
});

test("Build 7 SQL security suite covers reporting, suspension, deletion, localities, and analytics", async () => {
  const sql = await readFile(securityTestPath, "utf8");
  for (const phrase of [
    "approved broker can report another broker requirement",
    "duplicate open report is not duplicated",
    "non-admin cannot read report queue",
    "admin can dismiss report",
    "admin can suspend broker from moderation",
    "suspended broker live REQ leaves public feed",
    "suspended broker cannot match",
    "admin can reactivate suspended broker",
    "disabled locality cannot be selected for new REQs",
    "historical disabled locality still displays",
    "own deletion anonymizes profile and revokes access",
    "own deletion closes live REQs",
    "own deletion preserves historical response records",
    "deleted account cannot create new REQs",
    "admin analytics calculates weekly active",
    "multiple options do not distort distinct responding broker metric",
  ]) {
    assert.match(sql, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("README documents final V0 pilot boundary", async () => {
  const readme = await readFile(readmePath, "utf8");
  assert.match(readme, /Build 7/i);
  assert.match(readme, /pilot checklist/i);
  assert.match(readme, /Privacy\/Terms/i);
  assert.match(readme, /STOP ALL FEATURE DEVELOPMENT AFTER THIS BUILD|final planned V0 build/i);
});
