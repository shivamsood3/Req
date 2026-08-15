begin;

alter table public.profiles
add column if not exists deleted_at timestamptz;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete set null,
  reported_broker_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('fake_requirement', 'spam', 'misleading_information', 'inappropriate_conduct', 'other')),
  notes text check (notes is null or char_length(notes) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_action text check (admin_action is null or admin_action in ('dismissed', 'warned', 'broker_suspended', 'requirement_closed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((status = 'open' and resolved_at is null) or (status <> 'open' and resolved_at is not null))
);

create unique index reports_one_open_per_requirement_idx
on public.reports(reporter_id, requirement_id)
where status = 'open' and requirement_id is not null;

create index reports_status_created_idx on public.reports(status, created_at desc);
create index reports_reported_broker_idx on public.reports(reported_broker_id, created_at desc);
create index profiles_deleted_idx on public.profiles(deleted_at) where deleted_at is not null;
create index requirements_broker_status_live_idx on public.requirements(broker_id, status, expires_at);
create index broker_responses_created_requirement_idx on public.broker_responses(requirement_id, created_at);
create index connections_requirement_created_idx on public.connections(requirement_id, created_at);

alter table public.reports enable row level security;
revoke all on public.reports from public, anon, authenticated;
grant select on public.reports to authenticated;

create policy "reports_select_own_or_admin"
on public.reports
for select
to authenticated
using (
  reporter_id = (select auth.uid())
  or public.is_admin((select auth.uid()))
);

create or replace function public.is_approved_user(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and status = 'approved'
      and deleted_at is null
  );
$$;

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
      and status = 'approved'
      and deleted_at is null
  );
$$;

drop policy if exists "requirements_public_preview_read" on public.requirements;
create policy "requirements_public_preview_read" on public.requirements
for select to anon
using (
  status = 'live'
  and expires_at > now()
  and exists (
    select 1 from public.profiles owner_profile
    where owner_profile.id = broker_id
      and owner_profile.status = 'approved'
      and owner_profile.deleted_at is null
  )
);

drop policy if exists "requirements_approved_read" on public.requirements;
create policy "requirements_approved_read" on public.requirements
for select to authenticated
using (
  public.is_approved_user((select auth.uid()))
  and (
    broker_id = (select auth.uid())
    or (
      status = 'live'
      and expires_at > now()
      and exists (
        select 1 from public.profiles owner_profile
        where owner_profile.id = broker_id
          and owner_profile.status = 'approved'
          and owner_profile.deleted_at is null
      )
    )
  )
);

drop policy if exists "requirement_localities_public_preview_read" on public.requirement_localities;
create policy "requirement_localities_public_preview_read" on public.requirement_localities
for select to anon
using (
  exists (
    select 1
    from public.requirements r
    join public.profiles owner_profile on owner_profile.id = r.broker_id
    where r.id = requirement_id
      and r.status = 'live'
      and r.expires_at > now()
      and owner_profile.status = 'approved'
      and owner_profile.deleted_at is null
  )
);

drop policy if exists "requirement_localities_approved_read" on public.requirement_localities;
create policy "requirement_localities_approved_read" on public.requirement_localities
for select to authenticated
using (
  public.is_approved_user((select auth.uid()))
  and exists (
    select 1
    from public.requirements r
    left join public.profiles owner_profile on owner_profile.id = r.broker_id
    where r.id = requirement_id
      and (
        r.broker_id = (select auth.uid())
        or (
          r.status = 'live'
          and r.expires_at > now()
          and owner_profile.status = 'approved'
          and owner_profile.deleted_at is null
        )
      )
  )
);

drop policy if exists "localities_admin_read_all" on public.localities;
create policy "localities_admin_read_all"
on public.localities
for select
to authenticated
using (public.is_admin((select auth.uid())));

create or replace function public.public_active_response_count(p_requirement_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.broker_responses br
  join public.requirements r on r.id = br.requirement_id
  join public.profiles respondent on respondent.id = br.broker_id
  where br.requirement_id = p_requirement_id
    and r.status = 'live'
    and r.expires_at > now()
    and respondent.status = 'approved'
    and respondent.deleted_at is null
    and exists (
      select 1 from public.matches m
      where m.broker_response_id = br.id and m.status = 'active'
    );
$$;

drop view if exists public.public_requirement_previews;
create view public.public_requirement_previews
with (security_barrier = true, security_invoker = true)
as
select
  r.id,
  array_agg(l.name order by l.sort_order, l.name)::text[] as locality_names,
  array_agg(l.slug order by l.sort_order, l.name)::text[] as locality_slugs,
  case
    when lower(trim(r.property_type)) in ('independent floor', 'builder floor', 'floor') then 'floor'
    when lower(trim(r.property_type)) in ('independent house', 'house', 'plot', 'house / plot') then 'house-plot'
    when lower(trim(r.property_type)) = 'apartment' then 'apartment'
    when lower(trim(r.property_type)) = 'commercial' then 'commercial'
    when lower(trim(r.property_type)) = 'land' then 'land'
    else 'other'
  end as property_type_key,
  r.budget_min,
  r.budget_max,
  r.size_min,
  r.size_max,
  r.size_unit,
  r.floor_preference,
  public.public_active_response_count(r.id) as response_count,
  r.live_since,
  r.updated_at
from public.requirements r
join public.profiles owner_profile on owner_profile.id = r.broker_id
join public.requirement_localities rl on rl.requirement_id = r.id
join public.localities l on l.id = rl.locality_id
where r.status = 'live'
  and r.expires_at > now()
  and owner_profile.status = 'approved'
  and owner_profile.deleted_at is null
  and l.is_active = true
group by
  r.id, r.property_type, r.budget_min, r.budget_max, r.size_min, r.size_max,
  r.size_unit, r.floor_preference, r.live_since, r.updated_at;

revoke all on public.public_requirement_previews from public;
grant select on public.public_requirement_previews to anon, authenticated;

drop function if exists public.get_broker_live_requirements(text[], text, numeric, numeric, uuid);
create function public.get_broker_live_requirements(
  p_locality_slugs text[] default null,
  p_property_type_key text default null,
  p_budget_min numeric default null,
  p_budget_max numeric default null,
  p_requirement_id uuid default null
)
returns table (
  id uuid,
  broker_id uuid,
  broker_name text,
  brokerage text,
  locality_names text[],
  locality_slugs text[],
  property_type_key text,
  budget_min numeric,
  budget_max numeric,
  size_min numeric,
  size_max numeric,
  size_unit text,
  floor_preference text,
  buyer_type text,
  urgency text,
  notes text,
  response_count integer,
  own_active_option_count integer,
  live_since timestamptz,
  updated_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.broker_id,
    p.full_name as broker_name,
    p.company_name as brokerage,
    array_agg(l.name order by l.sort_order, l.name)::text[] as locality_names,
    array_agg(l.slug order by l.sort_order, l.name)::text[] as locality_slugs,
    case
      when lower(trim(r.property_type)) in ('independent floor', 'builder floor', 'floor') then 'floor'
      when lower(trim(r.property_type)) in ('independent house', 'house', 'plot', 'house / plot') then 'house-plot'
      when lower(trim(r.property_type)) = 'apartment' then 'apartment'
      when lower(trim(r.property_type)) = 'commercial' then 'commercial'
      when lower(trim(r.property_type)) = 'land' then 'land'
      else 'other'
    end as property_type_key,
    r.budget_min,
    r.budget_max,
    r.size_min,
    r.size_max,
    r.size_unit,
    r.floor_preference,
    r.buyer_type,
    r.urgency,
    r.notes,
    public.public_active_response_count(r.id) as response_count,
    (
      select count(*)::integer
      from public.broker_responses own_br
      join public.matches own_m on own_m.broker_response_id = own_br.id and own_m.status = 'active'
      where own_br.requirement_id = r.id and own_br.broker_id = (select auth.uid())
    ) as own_active_option_count,
    r.live_since,
    r.updated_at,
    r.expires_at
  from public.requirements r
  join public.profiles p on p.id = r.broker_id
  join public.requirement_localities rl on rl.requirement_id = r.id
  join public.localities l on l.id = rl.locality_id and l.is_active = true
  where public.is_approved_user((select auth.uid()))
    and p.status = 'approved'
    and p.deleted_at is null
    and r.status = 'live'
    and r.expires_at > now()
    and (p_requirement_id is null or r.id = p_requirement_id)
    and (
      p_locality_slugs is null
      or cardinality(p_locality_slugs) = 0
      or exists (
        select 1
        from public.requirement_localities filter_rl
        join public.localities filter_l on filter_l.id = filter_rl.locality_id
        where filter_rl.requirement_id = r.id
          and filter_l.is_active = true
          and filter_l.slug = any(p_locality_slugs)
      )
    )
    and (
      p_property_type_key is null
      or p_property_type_key = case
        when lower(trim(r.property_type)) in ('independent floor', 'builder floor', 'floor') then 'floor'
        when lower(trim(r.property_type)) in ('independent house', 'house', 'plot', 'house / plot') then 'house-plot'
        when lower(trim(r.property_type)) = 'apartment' then 'apartment'
        when lower(trim(r.property_type)) = 'commercial' then 'commercial'
        when lower(trim(r.property_type)) = 'land' then 'land'
        else 'other'
      end
    )
    and (p_budget_min is null or r.budget_max >= p_budget_min)
    and (p_budget_max is null or r.budget_min <= p_budget_max)
  group by
    r.id, r.broker_id, p.full_name, p.company_name, r.property_type,
    r.budget_min, r.budget_max, r.size_min, r.size_max, r.size_unit,
    r.floor_preference, r.buyer_type, r.urgency, r.notes,
    r.live_since, r.updated_at, r.expires_at
  order by r.live_since desc
  limit 100;
$$;

create or replace function public.submit_report(
  p_requirement_id uuid,
  p_reason text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owner_id uuid;
  report_id uuid;
  canonical_notes text;
begin
  if current_user_id is null or not public.is_approved_user(current_user_id) then
    raise exception using errcode = '42501', message = 'Approved broker access required';
  end if;
  if p_reason not in ('fake_requirement', 'spam', 'misleading_information', 'inappropriate_conduct', 'other') then
    raise exception using errcode = '22023', message = 'Invalid report reason';
  end if;
  canonical_notes := nullif(trim(coalesce(p_notes, '')), '');
  if char_length(coalesce(canonical_notes, '')) > 500 then
    raise exception using errcode = '22023', message = 'Notes exceed 500 characters';
  end if;

  select r.broker_id into owner_id
  from public.requirements r
  join public.profiles owner_profile on owner_profile.id = r.broker_id
  where r.id = p_requirement_id
    and r.status = 'live'
    and r.expires_at > now()
    and owner_profile.status = 'approved'
    and owner_profile.deleted_at is null;

  if owner_id is null then
    raise exception using errcode = '22023', message = 'Requirement not available for reporting';
  end if;
  if owner_id = current_user_id then
    raise exception using errcode = '42501', message = 'You cannot report your own requirement';
  end if;

  insert into public.reports(reporter_id, requirement_id, reported_broker_id, reason, notes)
  values (current_user_id, p_requirement_id, owner_id, p_reason, canonical_notes)
  on conflict (reporter_id, requirement_id) where status = 'open' and requirement_id is not null
  do update set notes = coalesce(public.reports.notes, excluded.notes)
  returning id into report_id;

  return report_id;
end;
$$;

create or replace function public.get_own_open_report_for_requirement(p_requirement_id uuid)
returns table (
  id uuid,
  reason text,
  notes text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.reason, r.notes, r.status, r.created_at
  from public.reports r
  where public.is_approved_user((select auth.uid()))
    and r.reporter_id = (select auth.uid())
    and r.requirement_id = p_requirement_id
    and r.status = 'open'
  limit 1;
$$;

create or replace function public.get_admin_reports()
returns table (
  id uuid,
  reason text,
  notes text,
  status text,
  admin_action text,
  created_at timestamptz,
  resolved_at timestamptz,
  requirement_id uuid,
  requirement_label text,
  reported_broker_id uuid,
  reported_broker_name text,
  reported_brokerage text,
  reporter_id uuid,
  reporter_name text,
  reporter_brokerage text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    report.id,
    report.reason,
    report.notes,
    report.status,
    report.admin_action,
    report.created_at,
    report.resolved_at,
    report.requirement_id,
    coalesce(
      (select string_agg(l.name, ' + ' order by l.sort_order, l.name)
       from public.requirement_localities rl
       join public.localities l on l.id = rl.locality_id
       where rl.requirement_id = report.requirement_id),
      'Requirement unavailable'
    ),
    report.reported_broker_id,
    reported.full_name,
    reported.company_name,
    report.reporter_id,
    reporter.full_name,
    reporter.company_name
  from public.reports report
  left join public.profiles reported on reported.id = report.reported_broker_id
  left join public.profiles reporter on reporter.id = report.reporter_id
  where public.is_admin((select auth.uid()))
  order by report.created_at desc
  limit 200;
$$;

create or replace function public.moderate_report(p_report_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_row public.reports%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  if p_action not in ('dismiss', 'warn', 'suspend_broker', 'close_requirement') then
    raise exception using errcode = '22023', message = 'Invalid moderation action';
  end if;

  select * into report_row from public.reports where id = p_report_id for update;
  if not found then raise exception using errcode = '22023', message = 'Report not found'; end if;

  if p_action = 'suspend_broker' then
    update public.profiles
    set status = 'suspended',
        approved_at = null,
        suspended_at = now(),
        updated_at = now()
    where id = report_row.reported_broker_id
      and role = 'broker'
      and deleted_at is null;
  elsif p_action = 'close_requirement' and report_row.requirement_id is not null then
    update public.requirements
    set status = 'closed',
        closed_at = coalesce(closed_at, now()),
        updated_at = now()
    where id = report_row.requirement_id
      and status = 'live';
  end if;

  update public.reports
  set status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end,
      admin_action = case
        when p_action = 'dismiss' then 'dismissed'
        when p_action = 'warn' then 'warned'
        when p_action = 'suspend_broker' then 'broker_suspended'
        when p_action = 'close_requirement' then 'requirement_closed'
      end,
      resolved_at = now()
  where id = p_report_id;
end;
$$;

create or replace function public.get_admin_requirements()
returns table (
  id uuid,
  broker_id uuid,
  broker_name text,
  brokerage text,
  locality_names text[],
  budget_min numeric,
  budget_max numeric,
  property_type text,
  stored_status text,
  effective_status text,
  created_at timestamptz,
  live_since timestamptz,
  expires_at timestamptz,
  response_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.broker_id,
    p.full_name,
    p.company_name,
    (select array_agg(l.name order by l.sort_order, l.name)
     from public.requirement_localities rl
     join public.localities l on l.id = rl.locality_id
     where rl.requirement_id = r.id),
    r.budget_min,
    r.budget_max,
    r.property_type,
    r.status::text,
    case when r.status = 'live' and r.expires_at > now() then 'live'
      when r.status = 'closed' then 'closed' else 'expired' end,
    r.created_at,
    r.live_since,
    r.expires_at,
    public.public_active_response_count(r.id)
  from public.requirements r
  left join public.profiles p on p.id = r.broker_id
  where public.is_admin((select auth.uid()))
  order by r.created_at desc
  limit 300;
$$;

create or replace function public.admin_close_requirement(p_requirement_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  update public.requirements
  set status = 'closed',
      closed_at = coalesce(closed_at, now()),
      updated_at = now()
  where id = p_requirement_id
    and status = 'live';
end;
$$;

create or replace function public.get_admin_localities()
returns table (
  id uuid,
  name text,
  slug text,
  is_active boolean,
  sort_order integer,
  requirement_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    l.name,
    l.slug,
    l.is_active,
    l.sort_order,
    (select count(*)::integer from public.requirement_localities rl where rl.locality_id = l.id)
  from public.localities l
  where public.is_admin((select auth.uid()))
  order by l.sort_order, l.name;
$$;

create or replace function public.create_admin_locality(p_name text, p_slug text, p_sort_order integer default 0)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  canonical_name text := trim(coalesce(p_name, ''));
  canonical_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if not public.is_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  if char_length(canonical_name) < 2 or canonical_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'Invalid locality';
  end if;
  insert into public.localities(name, slug, is_active, sort_order)
  values (canonical_name, canonical_slug, true, coalesce(p_sort_order, 0))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.update_admin_locality(
  p_locality_id uuid,
  p_name text,
  p_slug text,
  p_is_active boolean,
  p_sort_order integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  canonical_name text := trim(coalesce(p_name, ''));
  canonical_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if not public.is_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  if char_length(canonical_name) < 2 or canonical_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'Invalid locality';
  end if;
  update public.localities
  set name = canonical_name,
      slug = canonical_slug,
      is_active = coalesce(p_is_active, false),
      sort_order = coalesce(p_sort_order, 0)
  where id = p_locality_id;
end;
$$;

create or replace function public.update_own_profile(
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
begin
  if current_user_id is null or not public.is_approved_user(current_user_id) then
    raise exception using errcode = '42501', message = 'Approved broker access required';
  end if;
  if length(trim(p_full_name)) < 2
    or length(trim(p_company_name)) < 2
    or length(trim(p_primary_market)) < 2
    or p_mobile !~ '^[+0-9 ()-]{8,18}$' then
    raise exception using errcode = '22023', message = 'Invalid profile fields';
  end if;
  update public.profiles
  set full_name = trim(p_full_name),
      company_name = trim(p_company_name),
      mobile = trim(p_mobile),
      primary_market = trim(p_primary_market),
      rera_number = nullif(trim(coalesce(p_rera_number, '')), ''),
      updated_at = now()
  where id = current_user_id
    and deleted_at is null;
end;
$$;

create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  update public.requirements
  set status = 'closed',
      closed_at = coalesce(closed_at, now()),
      updated_at = now()
  where broker_id = current_user_id
    and status = 'live';

  delete from public.push_subscriptions
  where user_id = current_user_id;

  update public.profiles
  set status = 'rejected',
      approved_at = null,
      suspended_at = now(),
      deleted_at = coalesce(deleted_at, now()),
      full_name = 'Deleted broker',
      company_name = null,
      mobile = null,
      primary_market = null,
      rera_number = null,
      updated_at = now()
  where id = current_user_id;
end;
$$;

create or replace function public.get_profile_stats()
returns table (
  reqs_posted integer,
  matches_submitted integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from public.requirements r where r.broker_id = (select auth.uid())),
    (
      select count(*)::integer
      from public.matches m
      join public.broker_responses br on br.id = m.broker_response_id
      where br.broker_id = (select auth.uid())
    )
  where public.is_approved_user((select auth.uid()));
$$;

create or replace function public.get_admin_analytics()
returns table (
  approved_brokers integer,
  pending_brokers integer,
  weekly_active_brokers integer,
  live_reqs integer,
  reqs_last_7d integer,
  reqs_last_30d integer,
  reqs_posted integer,
  reqs_with_response integer,
  match_rate numeric,
  connections_initiated integer,
  connection_rate numeric,
  median_minutes_to_first_response numeric,
  match_options_submitted integer,
  responding_brokers integer,
  renewals integer,
  week_reqs_posted integer,
  week_brokers_responded integer,
  week_connections integer,
  north_star_connections_per_wab numeric,
  north_star_reqs_with_response integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with approved as (
    select id from public.profiles where status = 'approved' and role = 'broker' and deleted_at is null
  ),
  reqs as (
    select * from public.requirements
  ),
  first_responses as (
    select br.requirement_id, min(br.created_at) as first_response_at
    from public.broker_responses br
    join public.profiles p on p.id = br.broker_id
    where p.status = 'approved' and p.deleted_at is null
    group by br.requirement_id
  ),
  connected_reqs as (
    select distinct requirement_id from public.connections
  ),
  active_brokers as (
    select broker_id as id from public.requirements where created_at >= now() - interval '7 days' or updated_at >= now() - interval '7 days'
    union
    select broker_id from public.broker_responses where created_at >= now() - interval '7 days' or updated_at >= now() - interval '7 days'
    union
    select request_owner_id from public.connections where created_at >= now() - interval '7 days'
    union
    select responding_broker_id from public.connections where created_at >= now() - interval '7 days'
  ),
  aggregates as (
    select
      (select count(*)::integer from approved) as approved_brokers,
      (select count(*)::integer from public.profiles where role = 'broker' and status = 'pending' and deleted_at is null) as pending_brokers,
      (select count(*)::integer from active_brokers ab join approved a on a.id = ab.id) as weekly_active_brokers,
      (select count(*)::integer from reqs r join public.profiles p on p.id = r.broker_id where r.status = 'live' and r.expires_at > now() and p.status = 'approved' and p.deleted_at is null) as live_reqs,
      (select count(*)::integer from reqs where created_at >= now() - interval '7 days') as reqs_last_7d,
      (select count(*)::integer from reqs where created_at >= now() - interval '30 days') as reqs_last_30d,
      (select count(*)::integer from reqs) as reqs_posted,
      (select count(*)::integer from first_responses) as reqs_with_response,
      (select count(*)::integer from public.connections) as connections_initiated,
      (select count(*)::integer from public.matches) as match_options_submitted,
      (select count(distinct broker_id)::integer from public.broker_responses) as responding_brokers,
      (select coalesce(sum(renewal_count), 0)::integer from reqs) as renewals,
      (select count(*)::integer from reqs where created_at >= now() - interval '7 days') as week_reqs_posted,
      (select count(distinct broker_id)::integer from public.broker_responses where created_at >= now() - interval '7 days') as week_brokers_responded,
      (select count(*)::integer from public.connections where created_at >= now() - interval '7 days') as week_connections,
      (select percentile_cont(0.5) within group (order by extract(epoch from (fr.first_response_at - r.live_since)) / 60)
       from first_responses fr
       join reqs r on r.id = fr.requirement_id
       where fr.first_response_at >= r.live_since) as median_minutes_to_first_response,
      (select count(*)::integer from connected_reqs) as reqs_with_connection
  )
  select
    approved_brokers,
    pending_brokers,
    weekly_active_brokers,
    live_reqs,
    reqs_last_7d,
    reqs_last_30d,
    reqs_posted,
    reqs_with_response,
    case when reqs_posted = 0 then null else round((reqs_with_response::numeric / reqs_posted::numeric) * 100, 1) end,
    connections_initiated,
    case when reqs_posted = 0 then null else round((reqs_with_connection::numeric / reqs_posted::numeric) * 100, 1) end,
    round(median_minutes_to_first_response::numeric, 1),
    match_options_submitted,
    responding_brokers,
    renewals,
    week_reqs_posted,
    week_brokers_responded,
    week_connections,
    case when weekly_active_brokers = 0 then null else round(week_connections::numeric / weekly_active_brokers::numeric, 2) end,
    reqs_with_response
  from aggregates
  where public.is_admin((select auth.uid()));
$$;

create or replace function public.review_broker(p_profile_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_status public.broker_status;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  if p_decision not in ('pending', 'approved', 'suspended', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  select status
  into previous_status
  from public.profiles
  where id = p_profile_id
    and id <> auth.uid()
    and role = 'broker'
    and deleted_at is null
  for update;

  if not found then raise exception 'Broker not found'; end if;

  update public.profiles
  set status = p_decision::public.broker_status,
      approved_at = case when p_decision = 'approved' then coalesce(approved_at, now()) else null end,
      suspended_at = case when p_decision = 'suspended' then now() else null end,
      updated_at = now()
  where id = p_profile_id;

  if p_decision = 'approved' and previous_status <> 'approved'::public.broker_status then
    perform public.create_notification(
      p_profile_id,
      'access_approved'::public.notification_type,
      'Access approved',
      'Your REQ account is ready.',
      'account',
      p_profile_id,
      'access_approved:' || p_profile_id::text
    );
  end if;
end;
$$;

revoke all on function public.is_approved_user(uuid) from public, anon, authenticated;
grant execute on function public.is_approved_user(uuid) to anon, authenticated;
revoke all on function public.is_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
revoke all on function public.public_active_response_count(uuid) from public, anon, authenticated;
grant execute on function public.public_active_response_count(uuid) to anon, authenticated;
revoke all on function public.get_broker_live_requirements(text[], text, numeric, numeric, uuid) from public, anon, authenticated;
grant execute on function public.get_broker_live_requirements(text[], text, numeric, numeric, uuid) to authenticated;
revoke all on function public.submit_report(uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_report(uuid, text, text) to authenticated;
revoke all on function public.get_own_open_report_for_requirement(uuid) from public, anon, authenticated;
grant execute on function public.get_own_open_report_for_requirement(uuid) to authenticated;
revoke all on function public.get_admin_reports() from public, anon, authenticated;
grant execute on function public.get_admin_reports() to authenticated;
revoke all on function public.moderate_report(uuid, text) from public, anon, authenticated;
grant execute on function public.moderate_report(uuid, text) to authenticated;
revoke all on function public.get_admin_requirements() from public, anon, authenticated;
grant execute on function public.get_admin_requirements() to authenticated;
revoke all on function public.admin_close_requirement(uuid) from public, anon, authenticated;
grant execute on function public.admin_close_requirement(uuid) to authenticated;
revoke all on function public.get_admin_localities() from public, anon, authenticated;
grant execute on function public.get_admin_localities() to authenticated;
revoke all on function public.create_admin_locality(text, text, integer) from public, anon, authenticated;
grant execute on function public.create_admin_locality(text, text, integer) to authenticated;
revoke all on function public.update_admin_locality(uuid, text, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.update_admin_locality(uuid, text, text, boolean, integer) to authenticated;
revoke all on function public.update_own_profile(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_own_profile(text, text, text, text, text) to authenticated;
revoke all on function public.request_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;
revoke all on function public.get_profile_stats() from public, anon, authenticated;
grant execute on function public.get_profile_stats() to authenticated;
revoke all on function public.get_admin_analytics() from public, anon, authenticated;
grant execute on function public.get_admin_analytics() to authenticated;
revoke all on function public.review_broker(uuid, text) from public, anon, authenticated;
grant execute on function public.review_broker(uuid, text) to authenticated;

commit;
