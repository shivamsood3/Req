# REQ V0 — Build 5

REQ is a private, mobile-first live requirement exchange for property brokers. Build 5 completes the V0 loop by allowing deliberate owner-initiated contact exchange after a broker submits an active match:

**POST → MATCH → CONNECT**

REQ is not a property portal, CRM, social network, permanent inventory database, or AI product.

## Build 5 scope

Included:

- Real database-backed public Live Market feed with safe preview fields only
- Approved-broker Live Market feed with broker attribution but no contact details
- Shareable Location, Property Type, and overlapping Budget filters
- One card per requirement with aggregated multi-locality display
- Strict effective-live rule: `status = live AND expires_at > now()`
- Feed ordering by `live_since DESC`, never `updated_at`
- Minute, hour, and day freshness formatting
- Approved-broker detail route at `/requirements/[id]`
- Logged-out detail gating through authentication
- Approved-broker-only Post a REQ form at `/post`
- Atomic `create_requirement` database function with server-owned lifecycle fields
- Multi-locality publication, normalized controlled values, and layered validation
- Seven-day live expiry and safe public-preview consent at publication
- Owner-only `My REQs` at `/my-reqs`, grouped into Active, Expiring, and History
- Posted and Responded tabs with a truthful empty Responded state until matching exists
- Owner-only editing for effectively live requirements without changing feed position or expiry
- Confirmed owner-only closing with immediate removal from live discovery
- `Keep Live` during the final 24 hours and `Make Live Again` for expired or closed requirements
- Updated freshness that distinguishes material edits from original publication freshness
- Owner history detail access without exposing another broker's closed or expired requirements
- Approved brokers can submit up to three structured options to another broker's effectively live REQ
- One broker response container per broker and requirement, with individually editable/withdrawable options
- Responding-broker response management and a functional My REQs Responded tab
- Owner-only, broker-grouped match inbox for live and historical REQs
- Derived response counts that count brokers with active options, never the number of options
- Owner-initiated `CONNECT` from a live REQ match inbox
- One connection maximum per requirement and responding broker
- Connection-scoped mobile sharing for the REQ owner and connected responding broker
- Standard `wa.me` WhatsApp handoff with short contextual messages
- Connected state in owner match inbox, respondent response history, and My REQs Responded
- Historical connection visibility after a REQ closes/expires or options are withdrawn
- Database security regression tests for discovery, publication, lifecycle ownership, match privacy, and connection contact privacy

Explicitly out of scope:

- Internal chat, WhatsApp Business API, automated messages, SMS, email notifications, push, or in-app notifications
- Email exposure
- Search, analytics, reporting, account deletion, chat, CRM, inventory, social features, payments, images, or AI

## Stack

- Next.js App Router with strict TypeScript
- Tailwind CSS and the existing REQ visual system
- Supabase Postgres, RLS, and Supabase Auth
- Vercel deployment

## Local setup

Requirements: Node.js 22.13+ and a Supabase project.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set the project values.
3. Apply the migrations in `supabase/migrations` in timestamp order.
4. Configure local and production callbacks in Supabase Auth.
5. Start the app: `npm run dev`

When Supabase is absent, `next dev` may use the isolated fixtures in `lib/dev-fixtures.ts`. Production never falls back to fixtures: a configured database is authoritative, including a genuinely empty feed.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | REQ Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Browser-safe publishable key; RLS remains authoritative |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | Canonical HTTPS app origin |

No service-role key is used by the application.

## Database migrations

Apply in order:

1. `202608110001_build0_schema.sql`
2. `202608110002_build0_seed.sql`
3. `20260811180619_harden_function_execute_privileges.sql`
4. `20260811235507_build1_live_discovery.sql`
5. `202608120001_build2_create_requirement.sql`
6. `202608120002_build3_requirement_lifecycle.sql`
7. `202608120003_build4_broker_responses.sql`
8. `202608120004_build5_connections.sql`

The Build 0 seed creates South Delhi localities and four development/demo requirements. The Build 1 migration explicitly deletes those four known requirement IDs so they are never represented as genuine production activity.

For a local demo database only, re-run `202608110002_build0_seed.sql` after all migrations. Never re-run that seed against production.

## Public/private data boundary

Public visitors query only `public_requirement_previews`, an aggregated safe view containing:

- locality names/slugs
- normalized property category
- budget and broad size
- optional floor preference
- response count and `live_since`

The view contains no broker identity, profile/contact data, buyer type, urgency, or notes. Its source RLS also enforces the effective-live rule.

Approved brokers use the separate `get_broker_live_requirements` database function. It independently verifies `auth.uid()` belongs to an approved profile and returns live requirement content plus posting broker name/company. Its return contract deliberately excludes mobile and email. Pending, suspended, rejected, and anonymous users receive no broker rows and cannot execute the function anonymously.

The public UI never fetches a full requirement row and hides fields in React.

Build 3 further narrows the authenticated row policy: approved brokers can read other brokers' requirements only while those requirements are effectively live. Closed and expired rows remain available solely to their owner through the owner-scoped lifecycle function. Public and authenticated live feeds continue to enforce `status = live AND expires_at > now()` in database access.

## Requirement creation boundary

Only authenticated profiles with `status = approved` may execute `create_requirement`. The security-definer function validates every field and every active locality, then creates the requirement and its locality rows in one transaction. It derives `broker_id` from `auth.uid()` and fixes lifecycle values server-side: live status, zero responses, zero renewals, current publication timestamps, and expiry after seven days.

Anonymous users cannot execute the function. Pending, suspended, and rejected brokers are rejected inside the database even if they bypass the UI. The application has no direct requirement insert grant and uses no service-role key.

## Requirement lifecycle boundary

Only an approved requirement owner may execute the Build 3 lifecycle functions:

- `get_own_requirements` returns only the current user's requirements, including owner history.
- `update_own_requirement` accepts effectively live requirements only, revalidates all controlled fields and active localities, and replaces locality rows atomically. It cannot change `live_since`, `expires_at`, status, renewal count, or response count.
- `close_own_requirement` closes an effectively live requirement and records `closed_at`.
- `renew_own_requirement` allows `Keep Live` only during the final 24 hours, or makes an expired/closed requirement live for a fresh seven-day window. Renewal explicitly changes `live_since`; ordinary editing never does.

All functions derive ownership from `auth.uid()`, reject anonymous and non-approved profiles, and expose no broker contact information.

## Match boundary

Build 4 stores options only beneath a requirement-specific `broker_responses` container. It creates no property, listing, or permanent inventory records.

- `submit_match` creates or reuses the caller's single response container and atomically enforces the three-active-option limit.
- `update_own_match` and `withdraw_own_match` require an approved caller, option ownership, active option status, and an effectively live requirement.
- `get_own_response` and `get_responded_requirements` expose only the caller's response history.
- `get_requirement_responses_for_owner` exposes active options only to the requirement owner, grouped by responding broker, with name and brokerage but no phone or email.

The public, broker, and owner requirement queries derive `response_count` from response containers that have at least one active option. Additional options from the same broker do not increase the total; withdrawing the final active option removes that broker from the total automatically. The legacy stored counter is not authoritative.

## Connect boundary

Build 5 creates one `connections` row per requirement and responding broker. The row stores only relationship IDs and `created_at`; phone numbers remain sourced from `profiles`.

- Only the live REQ owner may execute `connect_to_response`.
- The database derives `request_owner_id` from requirement ownership and rejects non-owners.
- New connections require an effectively live requirement and at least one active match option from an approved responding broker.
- Duplicate Connect attempts return/preserve the existing connection.
- Existing connections remain visible after the REQ later closes/expires or match options are withdrawn.
- Contact data is exposed only inside scoped owner/respondent read functions and only after a connection exists.
- Connected parties see registered mobile numbers, never email addresses.
- WhatsApp handoff is a normal `wa.me` deep link generated after contact is visible; REQ does not send messages automatically and does not integrate any WhatsApp API.

## Filtering

Both `/` and `/home` accept validated query parameters:

```text
?locality=defence-colony&locality=greater-kailash-i&type=floor&budgetMin=10&budgetMax=20
```

- Locality matches any selected active locality.
- Property Type uses normalized keys (`floor`, `house-plot`, `apartment`, `commercial`, `land`, `other`).
- Budget uses overlap logic: `requirement_max >= selected_min AND requirement_min <= selected_max`.
- Invalid locality, type, and budget values are ignored server-side.

## Authentication configuration

REQ V0 uses Supabase Auth with email and password. It does not use Clerk, social login, SMS, or magic links for normal sign-in.

In **Supabase → Authentication → URL Configuration**:

- Local redirect: `http://localhost:3000/auth/callback`
- Production Site URL: `https://req-sand.vercel.app`
- Production redirect: `https://req-sand.vercel.app/auth/callback`

In **Supabase → Authentication → Providers → Email**:

- Enable email/password signups and password login.
- Set the minimum password length to at least 8 characters.
- For the private manually approved pilot, email confirmation can be disabled so new brokers can complete profile setup immediately. Manual admin approval remains the membership gate.

If email confirmation remains enabled, new brokers will see a confirmation message after signup and can continue after confirming their email. Password reset links should use the same `/auth/callback` redirect; the app sends recovery users on to `/reset-password`.

Existing users created during the earlier magic-link flow keep the same `auth.users.id`, profile, REQs, responses, and matches. If they do not have a password yet, they should use **Forgot password?** once to set one.

## Create the first admin

1. Use `/request-access` with the intended admin email.
2. Create a password and complete the broker profile.
3. In the Supabase SQL editor, run the following once, replacing the email:

```sql
update public.profiles
set role = 'admin',
    status = 'approved',
    approved_at = now()
where email = 'admin@example.com';
```

4. Sign out and sign in again with email and password. Do not expose a browser-based “make admin” action.

## Tests and checks

- `npm test` — authorization, auth UX correction, safe serializers, filters, freshness, multi-locality, creation validation, lifecycle ownership, structured match validation, and Build boundaries
- `npm run lint` — source linting
- `npm run build` — production compilation
- `npm audit` — dependency audit
- `supabase/tests/build1_security.sql` — transactional database/RLS test suite; run in the Supabase SQL editor after the Build 1 migration
- `supabase/tests/build2_security.sql` — transactional creation/RLS test suite; run after the Build 2 migration
- `supabase/tests/build3_security.sql` — transactional owner lifecycle/RLS test suite; run after the Build 3 migration
- `supabase/tests/build4_security.sql` — transactional response grouping, ownership, lifecycle, privacy, count, edit, and withdrawal suite
- `supabase/tests/build5_security.sql` — transactional Connect/contact privacy, lifecycle, idempotency, and history suite

The SQL suite rolls back all test users and requirements.

## Vercel deployment

The production project is `shivamsood3s-projects/req`. Add the three environment variables to Production, Preview, and Development, deploy with the Next.js preset, then configure the production Supabase callback above. Database migrations are not run by Vercel.

## Build boundary

This repository intentionally stops at Build 5 Connect. Submit Match, response management, the Responded tab, owner match inbox, and connection-scoped mobile sharing are functional. Normal authentication is email and password. No Build 6+ notifications or later product behavior is implemented.
