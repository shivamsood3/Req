begin;

-- Approved brokers may read other brokers' effective-live requirements, but
-- only the owner may read historical rows through direct table access.
drop policy if exists "requirements_approved_read" on public.requirements;
create policy "requirements_approved_read" on public.requirements
for select to authenticated
using (
  public.is_approved_user((select auth.uid()))
  and (
    (status = 'live' and expires_at > now())
    or broker_id = (select auth.uid())
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
    where r.id = requirement_id
      and (
        (r.status = 'live' and r.expires_at > now())
        or r.broker_id = (select auth.uid())
      )
  )
);

-- Updated timestamps are safe public metadata and let the feed distinguish an
-- edit from a new publication without changing sort order or expiry.
grant select (updated_at) on public.requirements to anon;

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
  r.response_count,
  r.live_since,
  r.updated_at
from public.requirements r
join public.requirement_localities rl on rl.requirement_id = r.id
join public.localities l on l.id = rl.locality_id
where r.status = 'live'
  and r.expires_at > now()
  and l.is_active = true
group by
  r.id,
  r.property_type,
  r.budget_min,
  r.budget_max,
  r.size_min,
  r.size_max,
  r.size_unit,
  r.floor_preference,
  r.response_count,
  r.live_since,
  r.updated_at;

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
    r.response_count,
    r.live_since,
    r.updated_at,
    r.expires_at
  from public.requirements r
  join public.requirement_localities rl on rl.requirement_id = r.id
  join public.localities l on l.id = rl.locality_id and l.is_active = true
  left join public.profiles p on p.id = r.broker_id
  where public.is_approved_user((select auth.uid()))
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
    r.response_count, r.live_since, r.updated_at, r.expires_at
  order by r.live_since desc
  limit 100;
$$;

revoke all on function public.get_broker_live_requirements(text[], text, numeric, numeric, uuid)
from public, anon, authenticated;
grant execute on function public.get_broker_live_requirements(text[], text, numeric, numeric, uuid)
to authenticated;

create or replace function public.get_own_requirements(p_requirement_id uuid default null)
returns table (
  id uuid,
  broker_id uuid,
  broker_name text,
  brokerage text,
  locality_ids uuid[],
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
  stored_status text,
  effective_status text,
  created_at timestamptz,
  updated_at timestamptz,
  live_since timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  renewal_count integer
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
    array_agg(l.id order by l.sort_order, l.name)::uuid[],
    array_agg(l.name order by l.sort_order, l.name)::text[],
    array_agg(l.slug order by l.sort_order, l.name)::text[],
    case
      when lower(trim(r.property_type)) in ('independent floor', 'builder floor', 'floor') then 'floor'
      when lower(trim(r.property_type)) in ('independent house', 'house', 'plot', 'house / plot') then 'house-plot'
      when lower(trim(r.property_type)) = 'apartment' then 'apartment'
      when lower(trim(r.property_type)) = 'commercial' then 'commercial'
      when lower(trim(r.property_type)) = 'land' then 'land'
      else 'other'
    end,
    r.budget_min,
    r.budget_max,
    r.size_min,
    r.size_max,
    r.size_unit,
    r.floor_preference,
    r.buyer_type,
    r.urgency,
    r.notes,
    r.response_count,
    r.status::text,
    case
      when r.status = 'live' and r.expires_at > now() then 'live'
      when r.status = 'closed' then 'closed'
      else 'expired'
    end,
    r.created_at,
    r.updated_at,
    r.live_since,
    r.expires_at,
    r.closed_at,
    r.renewal_count
  from public.requirements r
  join public.requirement_localities rl on rl.requirement_id = r.id
  join public.localities l on l.id = rl.locality_id
  join public.profiles p on p.id = r.broker_id
  where public.is_approved_user((select auth.uid()))
    and r.broker_id = (select auth.uid())
    and (p_requirement_id is null or r.id = p_requirement_id)
  group by
    r.id, r.broker_id, p.full_name, p.company_name, r.property_type,
    r.budget_min, r.budget_max, r.size_min, r.size_max, r.size_unit,
    r.floor_preference, r.buyer_type, r.urgency, r.notes, r.response_count,
    r.status, r.created_at, r.updated_at, r.live_since, r.expires_at,
    r.closed_at, r.renewal_count
  order by r.live_since desc;
$$;

revoke all on function public.get_own_requirements(uuid) from public, anon, authenticated;
grant execute on function public.get_own_requirements(uuid) to authenticated;

create or replace function public.update_own_requirement(
  p_requirement_id uuid,
  p_locality_ids uuid[],
  p_property_type_key text,
  p_budget_min numeric,
  p_budget_max numeric,
  p_size_min numeric,
  p_size_max numeric,
  p_size_unit text,
  p_floor_preference text,
  p_buyer_type text,
  p_urgency text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_status public.requirement_status;
  current_expires_at timestamptz;
  normalized_locality_ids uuid[];
  canonical_property_type text;
  canonical_size_unit text;
  canonical_floor text;
  canonical_buyer_type text;
  canonical_urgency text;
  canonical_notes text;
begin
  if current_user_id is null or not public.is_approved_user(current_user_id) then
    raise exception using errcode = '42501', message = 'Approved broker access required';
  end if;

  select status, expires_at
  into current_status, current_expires_at
  from public.requirements
  where id = p_requirement_id and broker_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Requirement owner access required';
  end if;
  if current_status <> 'live' or current_expires_at <= now() then
    raise exception using errcode = '22023', message = 'This requirement is no longer live';
  end if;

  select array_agg(locality_id order by locality_id)
  into normalized_locality_ids
  from (
    select distinct locality_id
    from unnest(coalesce(p_locality_ids, array[]::uuid[])) as locality_id
    where locality_id is not null
  ) selected_localities;
  if coalesce(cardinality(normalized_locality_ids), 0) = 0 then
    raise exception using errcode = '22023', message = 'At least one locality is required';
  end if;
  if (
    select count(*) from public.localities
    where id = any(normalized_locality_ids) and is_active = true
  ) <> cardinality(normalized_locality_ids) then
    raise exception using errcode = '22023', message = 'A selected locality is unavailable';
  end if;

  canonical_property_type := case p_property_type_key
    when 'floor' then 'Independent Floor'
    when 'house-plot' then 'House / Plot'
    when 'apartment' then 'Apartment'
    when 'commercial' then 'Commercial'
    when 'land' then 'Land'
    when 'other' then 'Other'
    else null
  end;
  if canonical_property_type is null then raise exception using errcode = '22023', message = 'Invalid property type'; end if;

  if p_budget_min is null or p_budget_min <= 0 then raise exception using errcode = '22023', message = 'Minimum budget must be above zero'; end if;
  if p_budget_max is null or p_budget_max <= 0 or p_budget_max < p_budget_min then raise exception using errcode = '22023', message = 'Invalid budget range'; end if;
  if p_size_min is not null and p_size_min <= 0 then raise exception using errcode = '22023', message = 'Minimum size must be above zero'; end if;
  if p_size_max is not null and p_size_max <= 0 then raise exception using errcode = '22023', message = 'Maximum size must be above zero'; end if;
  if p_size_min is not null and p_size_max is not null and p_size_max < p_size_min then raise exception using errcode = '22023', message = 'Invalid size range'; end if;

  if p_size_min is not null or p_size_max is not null then
    canonical_size_unit := case p_size_unit when 'sq yd' then 'sq yd' when 'sq ft' then 'sq ft' when 'acre' then 'acre' else null end;
    if canonical_size_unit is null then raise exception using errcode = '22023', message = 'Invalid size unit'; end if;
  else
    canonical_size_unit := null;
  end if;

  canonical_floor := case
    when nullif(trim(coalesce(p_floor_preference, '')), '') is null then null
    when p_floor_preference = 'Ground' then 'Ground' when p_floor_preference = 'First' then 'First'
    when p_floor_preference = 'Second' then 'Second' when p_floor_preference = 'Third' then 'Third'
    when p_floor_preference = 'Top' then 'Top' when p_floor_preference = 'Any' then 'Any'
    else '__invalid__' end;
  if canonical_floor = '__invalid__' then raise exception using errcode = '22023', message = 'Invalid floor preference'; end if;

  canonical_buyer_type := case
    when nullif(trim(coalesce(p_buyer_type, '')), '') is null then null
    when p_buyer_type = 'End User' then 'End User' when p_buyer_type = 'Developer' then 'Developer'
    when p_buyer_type = 'Investor' then 'Investor' when p_buyer_type = 'Corporate' then 'Corporate'
    when p_buyer_type = 'Other' then 'Other' else '__invalid__' end;
  if canonical_buyer_type = '__invalid__' then raise exception using errcode = '22023', message = 'Invalid buyer type'; end if;

  canonical_urgency := case
    when nullif(trim(coalesce(p_urgency, '')), '') is null then null
    when p_urgency = 'Immediate' then 'Immediate' when p_urgency = 'Active' then 'Active'
    when p_urgency = 'Flexible' then 'Flexible' else '__invalid__' end;
  if canonical_urgency = '__invalid__' then raise exception using errcode = '22023', message = 'Invalid urgency'; end if;

  canonical_notes := nullif(trim(coalesce(p_notes, '')), '');
  if char_length(coalesce(canonical_notes, '')) > 500 then raise exception using errcode = '22023', message = 'Notes exceed 500 characters'; end if;

  update public.requirements
  set property_type = canonical_property_type,
      budget_min = p_budget_min,
      budget_max = p_budget_max,
      size_min = p_size_min,
      size_max = p_size_max,
      size_unit = canonical_size_unit,
      floor_preference = canonical_floor,
      buyer_type = canonical_buyer_type,
      urgency = canonical_urgency,
      notes = canonical_notes,
      updated_at = now()
  where id = p_requirement_id;

  delete from public.requirement_localities where requirement_id = p_requirement_id;
  insert into public.requirement_localities (requirement_id, locality_id)
  select p_requirement_id, locality_id from unnest(normalized_locality_ids) as locality_id;
end;
$$;

create or replace function public.close_own_requirement(p_requirement_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_status public.requirement_status;
  current_expires_at timestamptz;
begin
  if current_user_id is null or not public.is_approved_user(current_user_id) then
    raise exception using errcode = '42501', message = 'Approved broker access required';
  end if;
  select status, expires_at into current_status, current_expires_at
  from public.requirements
  where id = p_requirement_id and broker_id = current_user_id
  for update;
  if not found then raise exception using errcode = '42501', message = 'Requirement owner access required'; end if;
  if current_status <> 'live' or current_expires_at <= now() then
    raise exception using errcode = '22023', message = 'Only a live requirement can be closed';
  end if;

  update public.requirements
  set status = 'closed', closed_at = now(), updated_at = now()
  where id = p_requirement_id;
end;
$$;

create or replace function public.renew_own_requirement(p_requirement_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_status public.requirement_status;
  current_expires_at timestamptz;
  renewed_at timestamptz := now();
begin
  if current_user_id is null or not public.is_approved_user(current_user_id) then
    raise exception using errcode = '42501', message = 'Approved broker access required';
  end if;
  select status, expires_at into current_status, current_expires_at
  from public.requirements
  where id = p_requirement_id and broker_id = current_user_id
  for update;
  if not found then raise exception using errcode = '42501', message = 'Requirement owner access required'; end if;

  if current_status = 'live'
     and current_expires_at > renewed_at
     and current_expires_at > renewed_at + interval '24 hours' then
    raise exception using errcode = '22023', message = 'This requirement is not yet expiring';
  end if;

  update public.requirements
  set status = 'live',
      live_since = renewed_at,
      expires_at = renewed_at + interval '7 days',
      renewal_count = renewal_count + 1,
      closed_at = null,
      updated_at = renewed_at
  where id = p_requirement_id;
end;
$$;

revoke all on function public.update_own_requirement(uuid, uuid[], text, numeric, numeric, numeric, numeric, text, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.update_own_requirement(uuid, uuid[], text, numeric, numeric, numeric, numeric, text, text, text, text, text)
to authenticated;

revoke all on function public.close_own_requirement(uuid) from public, anon, authenticated;
grant execute on function public.close_own_requirement(uuid) to authenticated;

revoke all on function public.renew_own_requirement(uuid) from public, anon, authenticated;
grant execute on function public.renew_own_requirement(uuid) to authenticated;

create index if not exists requirements_owner_history_idx
on public.requirements(broker_id, created_at desc);

commit;
