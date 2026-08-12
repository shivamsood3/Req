import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeAuthError, validatePasswordPair } from "../lib/auth-errors.ts";

const loginPagePath = new URL("../app/login/page.tsx", import.meta.url);
const rootPagePath = new URL("../app/page.tsx", import.meta.url);
const loginFormPath = new URL("../components/login-form.tsx", import.meta.url);
const requestPagePath = new URL("../app/request-access/page.tsx", import.meta.url);
const requestThanksPath = new URL("../app/request-access/thanks/page.tsx", import.meta.url);
const requestFormPath = new URL("../components/request-access-form.tsx", import.meta.url);
const forgotFormPath = new URL("../components/forgot-password-form.tsx", import.meta.url);
const resetFormPath = new URL("../components/reset-password-form.tsx", import.meta.url);
const resetPagePath = new URL("../app/reset-password/page.tsx", import.meta.url);
const callbackPath = new URL("../app/auth/callback/route.ts", import.meta.url);
const confirmPath = new URL("../app/auth/confirm/route.ts", import.meta.url);
const homePath = new URL("../app/home/page.tsx", import.meta.url);
const appShellPath = new URL("../components/app-shell.tsx", import.meta.url);
const adminLayoutPath = new URL("../app/admin/layout.tsx", import.meta.url);
const profileActionPath = new URL("../app/profile-setup/actions.ts", import.meta.url);
const publicFeedPath = new URL("../components/public-feed.tsx", import.meta.url);
const publicFeedComponentPath = new URL("../components/public-feed.tsx", import.meta.url);
const supabaseConfigPath = new URL("../supabase/config.toml", import.meta.url);
const schemaPath = new URL("../supabase/migrations/202608110001_build0_schema.sql", import.meta.url);
const createRequirementPath = new URL("../supabase/migrations/202608120001_build2_create_requirement.sql", import.meta.url);
const build4Path = new URL("../supabase/migrations/202608120003_build4_broker_responses.sql", import.meta.url);

test("login uses Supabase email and password, then keeps existing profile routing", async () => {
  const [page, form] = await Promise.all([readFile(loginPagePath, "utf8"), readFile(loginFormPath, "utf8")]);
  assert.match(form, /signInWithPassword/);
  assert.match(form, /resolvePostAuthRoute/);
  assert.match(form, /eq\("id", user\.id\)/);
  assert.match(form, /Forgot password\?/);
  assert.match(page, /if \(user\) redirect\(resolvePostAuthRoute\(profile\)\)/);
  assert.doesNotMatch(`${page}\n${form}`, /signInWithOtp|Send magic link|No password required|Check your inbox/i);
});

test("request access creates a Supabase password user and shows pending approval instead of email verification", async () => {
  const [page, form, thanks] = await Promise.all([
    readFile(requestPagePath, "utf8"),
    readFile(requestFormPath, "utf8"),
    readFile(requestThanksPath, "utf8"),
  ]);
  assert.match(form, /auth\.signUp/);
  assert.match(form, /validatePasswordPair/);
  assert.match(form, /auth\.signOut/);
  assert.match(form, /router\.replace\("\/request-access\/thanks"\)/);
  assert.match(form, /Create account/);
  assert.match(thanks, /Request received/);
  assert.match(thanks, /pending approval/);
  assert.match(page, /if \(user\) redirect\(resolvePostAuthRoute\(profile\)\)/);
  assert.doesNotMatch(`${page}\n${form}\n${thanks}`, /Confirm your email|signInWithOtp|magic link|invite code|social login/i);
});

test("password validation stays simple and mismatch is rejected", () => {
  assert.equal(validatePasswordPair("1234567", "1234567"), "Password must be at least 8 characters.");
  assert.equal(validatePasswordPair("12345678", "abcdefgh"), "Passwords do not match.");
  assert.equal(validatePasswordPair("12345678", "12345678"), "");
});

test("invalid credentials and duplicate signup are broker-safe messages", () => {
  assert.equal(
    normalizeAuthError("Invalid login credentials", "Couldn’t sign you in. Try again."),
    "Email or password is incorrect.",
  );
  assert.equal(
    normalizeAuthError("User already registered", "Couldn’t create your account. Try again."),
    "If this email already has access, sign in or reset your password.",
  );
});

test("forgot and reset password use Supabase recovery only, not normal magic-link login", async () => {
  const [forgot, reset, resetPage, callback, confirm, config] = await Promise.all([
    readFile(forgotFormPath, "utf8"),
    readFile(resetFormPath, "utf8"),
    readFile(resetPagePath, "utf8"),
    readFile(callbackPath, "utf8"),
    readFile(confirmPath, "utf8"),
    readFile(supabaseConfigPath, "utf8"),
  ]);
  assert.match(forgot, /resetPasswordForEmail/);
  assert.match(forgot, /\/reset-password/);
  assert.match(reset, /exchangeCodeForSession/);
  assert.match(reset, /verifyOtp/);
  assert.match(reset, /setSession/);
  assert.match(reset, /auth\.updateUser\(\{ password \}\)/);
  assert.match(reset, /router\.replace\("\/login\?updated=password"\)/);
  assert.match(resetPage, /<ResetPasswordForm \/>/);
  assert.match(callback, /safeNextPath/);
  assert.match(confirm, /token_hash/);
  assert.match(confirm, /type/);
  assert.match(confirm, /verifyOtp/);
  assert.match(config, /https:\/\/req-sand\.vercel\.app\/reset-password/);
  assert.match(config, /https:\/\/req-sand\.vercel\.app\/auth\/confirm/);
  assert.doesNotMatch(`${forgot}\n${reset}\n${callback}\n${confirm}`, /signInWithOtp|Send magic link/i);
});

test("home shows the public live market before login and broker feed after approval", async () => {
  const [home, publicFeed] = await Promise.all([
    readFile(homePath, "utf8"),
    readFile(publicFeedComponentPath, "utf8"),
  ]);
  assert.match(home, /getSessionProfile/);
  assert.match(home, /if \(!user\)/);
  assert.match(home, /getPublicPreviews\(filters\)/);
  assert.match(home, /<PublicFeed/);
  assert.match(home, /basePath="\/home"/);
  assert.match(home, /getBrokerLiveRequirements\(filters\)/);
  assert.match(publicFeed, /basePath = "\/"/);
  assert.doesNotMatch(home, /requireApprovedBroker/);
});

test("domain root routes signed-in users into the app and signed-in chrome can sign out", async () => {
  const [rootPage, appShell, adminLayout] = await Promise.all([
    readFile(rootPagePath, "utf8"),
    readFile(appShellPath, "utf8"),
    readFile(adminLayoutPath, "utf8"),
  ]);
  assert.match(rootPage, /getSessionProfile/);
  assert.match(rootPage, /if \(user\) redirect\(resolvePostAuthRoute\(profile\)\)/);
  assert.match(rootPage, /dynamic = "force-dynamic"/);
  assert.match(appShell, /profile\.full_name/);
  assert.match(appShell, /action=\{signOut\}/);
  assert.match(appShell, /Sign out/);
  assert.match(adminLayout, /action=\{signOut\}/);
  assert.match(adminLayout, /Sign out/);
});

test("existing auth user IDs, ownership, and match responses remain based on auth.uid", async () => {
  const [schema, createRequirement, build4] = await Promise.all([
    readFile(schemaPath, "utf8"),
    readFile(createRequirementPath, "utf8"),
    readFile(build4Path, "utf8"),
  ]);
  assert.match(schema, /id uuid primary key references auth\.users\(id\) on delete cascade/);
  assert.match(schema, /after insert on auth\.users[\s\S]*public\.handle_new_user/);
  assert.match(schema, /current_user_id uuid := auth\.uid\(\)/);
  assert.match(createRequirement, /current_user_id uuid := auth\.uid\(\)/);
  assert.match(build4, /broker_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(`${schema}\n${createRequirement}\n${build4}`, /clerk|service_role|p_broker_id/i);
});

test("public requirement gate offers request access and sign in without magic-link copy", async () => {
  const source = await readFile(publicFeedPath, "utf8");
  assert.match(source, /Sign in to view the full REQ and respond with matching inventory/);
  assert.match(source, /href=\{`\/request-access\?next=\/requirements\/\$\{selected\.id\}`\}/);
  assert.match(source, /href="\/login"/);
  assert.doesNotMatch(source, /magic link|secure link|inbox/i);
});

test("profile setup and auth errors no longer point users back to magic links", async () => {
  const source = await readFile(profileActionPath, "utf8");
  assert.match(source, /Sign in again to continue/);
  assert.doesNotMatch(source, /magic link/i);
});
