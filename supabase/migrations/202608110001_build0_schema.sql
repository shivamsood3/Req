begin;

create extension if not exists pgcrypto;

create type public.broker_role as enum ('broker', 'admin');
create type public.broker_status as enum ('pending', 'approved', 'suspended', 'rejected');
create type public.requirement_status as enum ('live', 'closed', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  mobile text,
  primary_market text,
  rera_number text,
  role public.broker_role not null default 'broker',
  status public.broker_status not null default 'pending',
  approved_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.localities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid references public.profiles(id) on delete set null,
  property_type text not null,
  budget_min numeric(12,2) not null check (budget_min > 0),
  budget_max numeric(12,2) not null check (budget_max >= budget_min),
  size_min numeric(12,2),
  size_max numeric(12,2),
  size_unit text,
  floor_preference text,
  buyer_type text,
  urgency text,
  notes text,
  status public.requirement_status not null default 'live',
  response_count integer not null default 0 check (response_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  live_since timestamptz not null default now(),
  expires_at timestamptz,
  closed_at timestamptz,
  renewal_count integer not null default 0 check (renewal_count >= 0),
  check (size_max is null or size_min is null or size_max >= size_min)
);

create table public.requirement_localities (
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  locality_id uuid not null references public.localities(id) on delete cascade,
  primary key (requirement_id, locality_id)
);

create index profiles_status_idx on public.profiles(status, created_at);
create index requirements_status_live_since_idx on public.requirements(status, live_since desc);
create index requirement_localities_locality_idx on public.requirement_localities(locality_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger requirements_set_updated_at before update on public.requirements
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role, status)
  values (new.id, coalesce(new.email, ''), 'broker', 'pending')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.is_approved_user(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = check_user_id and status = 'approved'
  );
$$;

create function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = check_user_id and role = 'admin' and status = 'approved'
  );
$$;

create function public.complete_broker_profile(
  p_full_name text,
  p_company_name text,
  p_mobile text,
  p_primary_market text,
  p_rera_number text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if length(trim(p_full_name)) < 2 or length(trim(p_company_name)) < 2 or
     length(trim(p_primary_market)) < 2 or p_mobile !~ '^[+0-9 ()-]{8,18}$' then
    raise exception 'Invalid profile fields';
  end if;

  select email into current_email from auth.users where id = current_user_id;

  insert into public.profiles (
    id, email, full_name, company_name, mobile, primary_market, rera_number, role, status
  ) values (
    current_user_id, coalesce(current_email, ''), trim(p_full_name), trim(p_company_name),
    trim(p_mobile), trim(p_primary_market), nullif(trim(coalesce(p_rera_number, '')), ''),
    'broker', 'pending'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    company_name = excluded.company_name,
    mobile = excluded.mobile,
    primary_market = excluded.primary_market,
    rera_number = excluded.rera_number,
    status = case
      when public.profiles.status in ('approved', 'suspended', 'rejected') then public.profiles.status
      else 'pending'
    end;
end;
$$;

create function public.review_broker(p_profile_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Invalid decision'; end if;

  update public.profiles
  set status = p_decision::public.broker_status,
      approved_at = case when p_decision = 'approved' then now() else null end,
      suspended_at = null
  where id = p_profile_id and status = 'pending' and role = 'broker';

  if not found then raise exception 'Pending broker not found'; end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.localities enable row level security;
alter table public.requirements enable row level security;
alter table public.requirement_localities enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_admin((select auth.uid())));

create policy "localities_public_read" on public.localities
for select to anon, authenticated
using (is_active = true);

create policy "requirements_approved_read" on public.requirements
for select to authenticated
using (public.is_approved_user((select auth.uid())));

create policy "requirements_public_preview_read" on public.requirements
for select to anon
using (
  status = 'live'
  and (expires_at is null or expires_at > now())
);

create policy "requirement_localities_approved_read" on public.requirement_localities
for select to authenticated
using (public.is_approved_user((select auth.uid())));

create policy "requirement_localities_public_preview_read" on public.requirement_localities
for select to anon
using (
  exists (
    select 1
    from public.requirements r
    where r.id = requirement_id
      and r.status = 'live'
      and (r.expires_at is null or r.expires_at > now())
  )
);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
revoke all on public.localities from anon, authenticated;
grant select on public.localities to anon, authenticated;
revoke all on public.requirements from anon, authenticated;
grant select (
  id, property_type, budget_min, budget_max, size_min, size_max, size_unit,
  floor_preference, status, response_count, live_since, expires_at
) on public.requirements to anon;
grant select on public.requirements to authenticated;
revoke all on public.requirement_localities from anon, authenticated;
grant select on public.requirement_localities to anon;
grant select on public.requirement_localities to authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_approved_user(uuid) from public, anon, authenticated;
grant execute on function public.is_approved_user(uuid) to authenticated;
revoke all on function public.is_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
revoke all on function public.complete_broker_profile(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.complete_broker_profile(text, text, text, text, text) to authenticated;
revoke all on function public.review_broker(uuid, text) from public, anon, authenticated;
grant execute on function public.review_broker(uuid, text) to authenticated;

create view public.public_requirement_previews
with (security_barrier = true, security_invoker = true)
as
select
  r.id,
  l.name as locality_name,
  l.slug as locality_slug,
  r.property_type,
  r.budget_min,
  r.budget_max,
  r.size_min,
  r.size_max,
  r.size_unit,
  r.floor_preference,
  r.response_count,
  r.live_since
from public.requirements r
join public.requirement_localities rl on rl.requirement_id = r.id
join public.localities l on l.id = rl.locality_id
where r.status = 'live'
  and l.is_active = true
  and (r.expires_at is null or r.expires_at > now());

revoke all on public.public_requirement_previews from public;
grant select on public.public_requirement_previews to anon, authenticated;

commit;
