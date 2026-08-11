# REQ V0 — Build 2

REQ is a private, mobile-first live requirement exchange for property brokers. Build 2 adds secure requirement publication to the production-ready discovery experience while preserving the product constitution:

**POST → MATCH → CONNECT**

REQ is not a property portal, CRM, social network, permanent inventory database, or AI product.

## Build 2 scope

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
- Disabled final-position placeholders for `I HAVE A MATCH` and `VIEW MATCHES`
- Database security regression tests for discovery and publication

Explicitly out of scope:

- Editing, closing, or renewing requirements
- Submitting matches, broker responses, or Connect
- Phone/email exposure, notifications, push, SMS, WhatsApp, or external email systems
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

## Requirement creation boundary

Only authenticated profiles with `status = approved` may execute `create_requirement`. The security-definer function validates every field and every active locality, then creates the requirement and its locality rows in one transaction. It derives `broker_id` from `auth.uid()` and fixes lifecycle values server-side: live status, zero responses, zero renewals, current publication timestamps, and expiry after seven days.

Anonymous users cannot execute the function. Pending, suspended, and rejected brokers are rejected inside the database even if they bypass the UI. The application has no direct requirement insert grant and uses no service-role key.

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

In **Supabase → Authentication → URL Configuration**:

- Local redirect: `http://localhost:3000/auth/callback`
- Production Site URL: `https://req-sand.vercel.app`
- Production redirect: `https://req-sand.vercel.app/auth/callback`

Magic links use Supabase's built-in email delivery. No external email provider is part of Build 1.

## Create the first admin

1. Use `/request-access` with the intended admin email.
2. Open the magic link and complete the broker profile.
3. In the Supabase SQL editor, run the following once, replacing the email:

```sql
update public.profiles
set role = 'admin',
    status = 'approved',
    approved_at = now()
where email = 'admin@example.com';
```

4. Sign out and sign in again. Do not expose a browser-based “make admin” action.

## Tests and checks

- `npm test` — authorization, safe serializers, filters, freshness, multi-locality, creation validation, duplicate-submit protection, and boundary checks
- `npm run lint` — source linting
- `npm run build` — production compilation
- `npm audit` — dependency audit
- `supabase/tests/build1_security.sql` — transactional database/RLS test suite; run in the Supabase SQL editor after the Build 1 migration
- `supabase/tests/build2_security.sql` — transactional creation/RLS test suite; run after the Build 2 migration

The SQL suite rolls back all test users and requirements.

## Vercel deployment

The production project is `shivamsood3s-projects/req`. Add the three environment variables to Production, Preview, and Development, deploy with the Next.js preset, then configure the production Supabase callback above. Database migrations are not run by Vercel.

## Build boundary

This repository intentionally stops after Build 2 publication. The `I HAVE A MATCH`, `VIEW MATCHES`, and `My REQs` controls remain non-functional placeholders. No Build 3+ product behavior is implemented.
