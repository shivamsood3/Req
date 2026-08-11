# REQ V0 — Build 0

REQ is a private, mobile-first live requirement exchange for property brokers. Build 0 establishes the public preview, passwordless access request, broker approval, and protected application shell needed to test the product safely.

> **REQ V0 exists solely to test whether property brokers will post live buyer requirements, respond with matching inventory, and form useful broker-to-broker connections.**
>
> **Do not add product functionality outside the approved POST → MATCH → CONNECT roadmap without explicit approval.**

## Product constitution

REQ tests one behaviour:

**POST → MATCH → CONNECT**

REQ is not a property portal, CRM, social network, inventory management system, or AI product. Build 0 does not implement the three core actions; it prepares a secure foundation for them.

## Build 0 scope

Included:

- Public, safe requirement preview feed at `/`
- Supabase email magic-link authentication with separate request-access and existing-member flows
- Broker profile completion and pending-approval state
- Admin-only broker approval/rejection screen
- Approved broker-only `/home` shell
- Role and status authorization enforced on the server and in Postgres RLS
- South Delhi locality seed and realistic public preview fixtures
- PWA manifest, mobile metadata, and placeholder branded icons
- Error/loading states, validation, and authorization tests

Explicitly out of scope:

- Posting or editing requirements
- Matching inventory
- Connect workflows or contact exchange
- Notifications, push, SMS, WhatsApp, or transactional email integrations
- Internal chat, reporting, account deletion, analytics, payments, search, images, or AI

## Stack

- Next.js App Router with strict TypeScript
- Tailwind CSS
- Supabase Postgres and Supabase Auth
- Vercel-compatible deployment

## Local setup

Requirements: Node.js 22.13+ and a Supabase project.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set your project values.
3. Apply the migrations in `supabase/migrations` to your Supabase project.
4. Add the local callback URL in Supabase Auth (see below).
5. Start the app: `npm run dev`

The public preview uses safe local fixtures when Supabase variables are absent, so the public UI can still be reviewed before backend configuration. Authentication and protected areas require Supabase.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key; RLS remains authoritative |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | Canonical app URL, e.g. `https://req.example.com` |

No service-role key is used by the application. Admin actions run as authenticated users through a guarded Postgres function.

## Supabase setup

Create a Supabase project, then apply in order:

1. `supabase/migrations/202608110001_build0_schema.sql`
2. `supabase/migrations/202608110002_build0_seed.sql`
3. `supabase/migrations/20260811180619_harden_function_execute_privileges.sql`

Using the Supabase CLI, link the project and run `supabase db push`. Alternatively, paste each migration into the SQL editor in order.

In **Authentication → URL Configuration**, set:

- Site URL: `http://localhost:3000` locally, then the production URL after deployment
- Redirect URL: `http://localhost:3000/auth/callback`
- Production redirect URL: `https://your-domain/auth/callback`

Email magic links use Supabase's built-in email delivery for Build 0. Configure a custom SMTP provider later only if required; no external transactional email platform is integrated here.

## Authentication and authorization

Authentication uses Supabase passwordless email OTP links. The browser initiates the magic link, `/auth/callback` exchanges the code for an HTTP-cookie session, and server-rendered routes read and verify the user with Supabase.

Routing after authentication:

- Missing/incomplete profile → `/profile-setup`
- Complete, pending profile → `/pending`
- Approved broker → `/home`
- Approved admin → `/admin`
- Rejected/suspended account → `/access-suspended`

Authorization is defense in depth:

- Protected Next.js pages verify the current user and profile on the server.
- `profiles`, `requirements`, and junction tables have RLS enabled.
- Direct profile writes are revoked from browser roles.
- Profile completion and broker review run through narrow `security definer` Postgres functions.
- The admin review function independently verifies `role = admin` and `status = approved`.
- Anonymous users can query only the safe `public_requirement_previews` view and active localities, never private requirement columns or profile data.

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

4. Sign out and sign in again. The account will route to `/admin`.

Do not expose a browser-based “make admin” action.

## Tests and checks

- `npm test` — authorization, routing, safe preview serialization, and pending-profile defaults
- `npm run lint` — source linting
- `npm run build` — production compilation

## Vercel deployment

1. Import the GitHub repository into Vercel.
2. Add the three environment variables above for Preview and Production.
3. Deploy with the standard Next.js framework preset.
4. Add the final Vercel/domain callback URL to Supabase Auth redirect URLs.
5. Set the production Supabase Site URL and `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin.

Database migrations are not automatically executed by Vercel; apply them to Supabase before testing authentication.

## Build boundary

This repository intentionally stops at Build 0. The disabled `+` and “My REQs” controls are shell placeholders only. There is no posting, matching, connection, notification, or other Build 1+ implementation.
