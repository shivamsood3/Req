begin;

-- Build 1 treats a requirement as live only while both its stored status and
-- expiry agree. This prevents stale rows from leaking between expiry jobs.
drop policy if exists "requirements_public_preview_read" on public.requirements;
create policy "requirements_public_preview_read" on public.requirements
for select to anon
using (
  status = 'live'
  and expires_at > now()
);

drop policy if exists "requirement_localities_public_preview_read" on public.requirement_localities;
create policy "requirement_localities_public_preview_read" on public.requirement_localities
for select to anon
using (
  exists (
    select 1
    from public.requirements r
    where r.id = requirement_id
      and r.status = 'live'
      and r.expires_at > now()
  )
);

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
  r.live_since
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
  r.live_since;

revoke all on public.public_requirement_previews from public;
grant select on public.public_requirement_previews to anon, authenticated;

-- Approved brokers use a separate database access path. It returns the full
-- live requirement content needed by Build 1 plus safe broker attribution,
-- but deliberately has no email or mobile columns.
create or replace function public.get_broker_live_requirements(
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
    r.id,
    r.broker_id,
    p.full_name,
    p.company_name,
    r.property_type,
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
    r.expires_at
  order by r.live_since desc
  limit 100;
$$;

revoke all on function public.get_broker_live_requirements(text[], text, numeric, numeric, uuid)
from public, anon, authenticated;
grant execute on function public.get_broker_live_requirements(text[], text, numeric, numeric, uuid)
to authenticated;

create index if not exists requirements_live_expiry_sort_idx
on public.requirements(status, expires_at, live_since desc);

create index if not exists requirements_live_budget_overlap_idx
on public.requirements(status, budget_min, budget_max);

create index if not exists requirements_live_property_type_idx
on public.requirements(status, lower(trim(property_type)), live_since desc);

create index if not exists requirement_localities_locality_requirement_idx
on public.requirement_localities(locality_id, requirement_id);

-- These IDs belong to the Build 0 development/demo fixtures. They must never
-- be represented as genuine pilot activity in production.
delete from public.requirements
where id in (
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000004'
);

commit;
