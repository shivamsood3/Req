begin;

create type public.match_status as enum ('active', 'withdrawn');

create table public.broker_responses (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  broker_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requirement_id, broker_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  broker_response_id uuid not null references public.broker_responses(id) on delete cascade,
  locality_id uuid not null references public.localities(id),
  asking_price numeric(12,2) not null check (asking_price > 0),
  size numeric(12,2) check (size is null or size > 0),
  size_unit text check (size_unit is null or size_unit in ('sq yd', 'sq ft', 'acre')),
  floor text check (floor is null or floor in ('Ground', 'First', 'Second', 'Third', 'Top', 'Other')),
  source text check (source is null or source in ('Direct', 'Through another broker', 'Prefer not to say')),
  notes text check (notes is null or char_length(notes) <= 500),
  status public.match_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  check (
    (status = 'active' and withdrawn_at is null)
    or (status = 'withdrawn' and withdrawn_at is not null)
  ),
  check (
    (size is null and size_unit is null)
    or (size is not null and size_unit is not null)
  )
);

create index broker_responses_broker_updated_idx
on public.broker_responses(broker_id, updated_at desc);
create index broker_responses_requirement_idx
on public.broker_responses(requirement_id);
create index matches_response_status_idx
on public.matches(broker_response_id, status, created_at);

alter table public.broker_responses enable row level security;
alter table public.matches enable row level security;

revoke all on public.broker_responses from public, anon, authenticated;
revoke all on public.matches from public, anon, authenticated;

create trigger broker_responses_set_updated_at before update on public.broker_responses
for each row execute function public.set_updated_at();
create trigger matches_set_updated_at before update on public.matches
for each row execute function public.set_updated_at();

-- Response totals are derived from response containers that still have an
-- active option. The legacy requirements.response_count column is not used as
-- an authority, so option count and broker count cannot drift apart.
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
  where br.requirement_id = p_requirement_id
    and r.status = 'live'
    and r.expires_at > now()
    and exists (
      select 1 from public.matches m
      where m.broker_response_id = br.id and m.status = 'active'
    );
$$;
revoke all on function public.public_active_response_count(uuid) from public, anon, authenticated;
grant execute on function public.public_active_response_count(uuid) to anon, authenticated;

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
    (
      select count(*)::integer from public.broker_responses count_br
      where count_br.requirement_id = r.id
        and exists (
          select 1 from public.matches count_m
          where count_m.broker_response_id = count_br.id and count_m.status = 'active'
        )
    ) as response_count,
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
    r.live_since, r.updated_at, r.expires_at
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
    (
      select count(*)::integer from public.broker_responses count_br
      where count_br.requirement_id = r.id
        and exists (
          select 1 from public.matches count_m
          where count_m.broker_response_id = count_br.id and count_m.status = 'active'
        )
    ),
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
    r.floor_preference, r.buyer_type, r.urgency, r.notes,
    r.status, r.created_at, r.updated_at, r.live_since, r.expires_at,
    r.closed_at, r.renewal_count
  order by r.live_since desc;
$$;

create or replace function public.submit_match(
  p_requirement_id uuid,
  p_locality_id uuid,
  p_asking_price numeric,
  p_size numeric,
  p_size_unit text,
  p_floor text,
  p_source text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  requirement_owner_id uuid;
  requirement_status public.requirement_status;
  requirement_expires_at timestamptz;
  response_id uuid;
  active_option_count integer;
  canonical_size_unit text;
  canonical_floor text;
  canonical_source text;
  canonical_notes text;
  created_match_id uuid;
begin
  if current_user_id is null or not public.is_approved_user(current_user_id) then
    raise exception using errcode = '42501', message = 'Approved broker access required';
  end if;

  select broker_id, status, expires_at
  into requirement_owner_id, requirement_status, requirement_expires_at
  from public.requirements
  where id = p_requirement_id
  for update;
  if not found then raise exception using errcode = '22023', message = 'Requirement not found'; end if;
  if requirement_owner_id = current_user_id then
    raise exception using errcode = '42501', message = 'You cannot respond to your own requirement';
  end if;
  if requirement_status <> 'live' or requirement_expires_at <= now() then
    raise exception using errcode = '22023', message = 'This requirement is no longer live';
  end if;

  if not exists(select 1 from public.localities where id = p_locality_id and is_active = true) then
    raise exception using errcode = '22023', message = 'A valid active locality is required';
  end if;
  if p_asking_price is null or p_asking_price <= 0 then
    raise exception using errcode = '22023', message = 'Asking price must be above zero';
  end if;
  if p_size is not null and p_size <= 0 then
    raise exception using errcode = '22023', message = 'Size must be above zero';
  end if;
  if p_size is not null then
    canonical_size_unit := case p_size_unit when 'sq yd' then 'sq yd' when 'sq ft' then 'sq ft' when 'acre' then 'acre' else null end;
    if canonical_size_unit is null then raise exception using errcode = '22023', message = 'Invalid size unit'; end if;
  else
    canonical_size_unit := null;
  end if;
  canonical_floor := case
    when nullif(trim(coalesce(p_floor, '')), '') is null then null
    when p_floor in ('Ground', 'First', 'Second', 'Third', 'Top', 'Other') then p_floor
    else '__invalid__' end;
  if canonical_floor = '__invalid__' then raise exception using errcode = '22023', message = 'Invalid floor'; end if;
  canonical_source := case
    when nullif(trim(coalesce(p_source, '')), '') is null then null
    when p_source in ('Direct', 'Through another broker', 'Prefer not to say') then p_source
    else '__invalid__' end;
  if canonical_source = '__invalid__' then raise exception using errcode = '22023', message = 'Invalid source'; end if;
  canonical_notes := nullif(trim(coalesce(p_notes, '')), '');
  if char_length(coalesce(canonical_notes, '')) > 500 then
    raise exception using errcode = '22023', message = 'Notes exceed 500 characters';
  end if;

  insert into public.broker_responses(requirement_id, broker_id)
  values (p_requirement_id, current_user_id)
  on conflict (requirement_id, broker_id) do update set updated_at = now()
  returning id into response_id;

  select count(*)::integer into active_option_count
  from public.matches where broker_response_id = response_id and status = 'active';
  if active_option_count >= 3 then
    raise exception using errcode = '22023', message = 'Maximum 3 active match options allowed';
  end if;

  insert into public.matches(
    broker_response_id, locality_id, asking_price, size, size_unit, floor, source, notes
  ) values (
    response_id, p_locality_id, p_asking_price, p_size, canonical_size_unit,
    canonical_floor, canonical_source, canonical_notes
  ) returning id into created_match_id;

  return created_match_id;
end;
$$;

create or replace function public.update_own_match(
  p_match_id uuid,
  p_locality_id uuid,
  p_asking_price numeric,
  p_size numeric,
  p_size_unit text,
  p_floor text,
  p_source text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owning_response_id uuid;
  requirement_status public.requirement_status;
  requirement_expires_at timestamptz;
  canonical_size_unit text;
  canonical_floor text;
  canonical_source text;
  canonical_notes text;
begin
  if current_user_id is null or not public.is_approved_user(current_user_id) then
    raise exception using errcode = '42501', message = 'Approved broker access required';
  end if;

  select br.id, r.status, r.expires_at
  into owning_response_id, requirement_status, requirement_expires_at
  from public.matches m
  join public.broker_responses br on br.id = m.broker_response_id
  join public.requirements r on r.id = br.requirement_id
  where m.id = p_match_id and m.status = 'active' and br.broker_id = current_user_id
  for update of m, br, r;
  if not found then raise exception using errcode = '42501', message = 'Active match owner access required'; end if;
  if requirement_status <> 'live' or requirement_expires_at <= now() then
    raise exception using errcode = '22023', message = 'This requirement is no longer live';
  end if;

  if not exists(select 1 from public.localities where id = p_locality_id and is_active = true) then
    raise exception using errcode = '22023', message = 'A valid active locality is required';
  end if;
  if p_asking_price is null or p_asking_price <= 0 then raise exception using errcode = '22023', message = 'Asking price must be above zero'; end if;
  if p_size is not null and p_size <= 0 then raise exception using errcode = '22023', message = 'Size must be above zero'; end if;
  if p_size is not null then
    canonical_size_unit := case p_size_unit when 'sq yd' then 'sq yd' when 'sq ft' then 'sq ft' when 'acre' then 'acre' else null end;
    if canonical_size_unit is null then raise exception using errcode = '22023', message = 'Invalid size unit'; end if;
  else
    canonical_size_unit := null;
  end if;
  canonical_floor := case
    when nullif(trim(coalesce(p_floor, '')), '') is null then null
    when p_floor in ('Ground', 'First', 'Second', 'Third', 'Top', 'Other') then p_floor
    else '__invalid__' end;
  if canonical_floor = '__invalid__' then raise exception using errcode = '22023', message = 'Invalid floor'; end if;
  canonical_source := case
    when nullif(trim(coalesce(p_source, '')), '') is null then null
    when p_source in ('Direct', 'Through another broker', 'Prefer not to say') then p_source
    else '__invalid__' end;
  if canonical_source = '__invalid__' then raise exception using errcode = '22023', message = 'Invalid source'; end if;
  canonical_notes := nullif(trim(coalesce(p_notes, '')), '');
  if char_length(coalesce(canonical_notes, '')) > 500 then raise exception using errcode = '22023', message = 'Notes exceed 500 characters'; end if;

  update public.matches set
    locality_id = p_locality_id,
    asking_price = p_asking_price,
    size = p_size,
    size_unit = canonical_size_unit,
    floor = canonical_floor,
    source = canonical_source,
    notes = canonical_notes
  where id = p_match_id;
  update public.broker_responses set updated_at = now() where id = owning_response_id;
end;
$$;

create or replace function public.withdraw_own_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owning_response_id uuid;
  requirement_status public.requirement_status;
  requirement_expires_at timestamptz;
begin
  if current_user_id is null or not public.is_approved_user(current_user_id) then
    raise exception using errcode = '42501', message = 'Approved broker access required';
  end if;
  select br.id, r.status, r.expires_at
  into owning_response_id, requirement_status, requirement_expires_at
  from public.matches m
  join public.broker_responses br on br.id = m.broker_response_id
  join public.requirements r on r.id = br.requirement_id
  where m.id = p_match_id and m.status = 'active' and br.broker_id = current_user_id
  for update of m, br, r;
  if not found then raise exception using errcode = '42501', message = 'Active match owner access required'; end if;
  if requirement_status <> 'live' or requirement_expires_at <= now() then
    raise exception using errcode = '22023', message = 'This requirement is no longer live';
  end if;

  update public.matches
  set status = 'withdrawn', withdrawn_at = now()
  where id = p_match_id;
  update public.broker_responses set updated_at = now() where id = owning_response_id;
end;
$$;

create or replace function public.get_own_response(p_requirement_id uuid)
returns table (
  requirement_id uuid,
  requirement_owner_id uuid,
  requirement_locality_names text[],
  property_type_key text,
  budget_min numeric,
  budget_max numeric,
  effective_status text,
  expires_at timestamptz,
  response_id uuid,
  active_option_count integer,
  withdrawn_option_count integer,
  match_id uuid,
  match_locality_id uuid,
  match_locality_name text,
  asking_price numeric,
  match_size numeric,
  match_size_unit text,
  match_floor text,
  match_source text,
  match_notes text,
  match_status text,
  match_created_at timestamptz,
  match_updated_at timestamptz,
  withdrawn_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.broker_id,
    (select array_agg(l.name order by l.sort_order, l.name)
      from public.requirement_localities rl join public.localities l on l.id = rl.locality_id
      where rl.requirement_id = r.id),
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
    case when r.status = 'live' and r.expires_at > now() then 'live'
      when r.status = 'closed' then 'closed' else 'expired' end,
    r.expires_at,
    br.id,
    (select count(*)::integer from public.matches am where am.broker_response_id = br.id and am.status = 'active'),
    (select count(*)::integer from public.matches wm where wm.broker_response_id = br.id and wm.status = 'withdrawn'),
    m.id,
    m.locality_id,
    ml.name,
    m.asking_price,
    m.size,
    m.size_unit,
    m.floor,
    m.source,
    m.notes,
    m.status::text,
    m.created_at,
    m.updated_at,
    m.withdrawn_at
  from public.broker_responses br
  join public.requirements r on r.id = br.requirement_id
  join public.matches m on m.broker_response_id = br.id
  join public.localities ml on ml.id = m.locality_id
  where public.is_approved_user((select auth.uid()))
    and br.broker_id = (select auth.uid())
    and br.requirement_id = p_requirement_id
  order by m.created_at;
$$;

create or replace function public.get_responded_requirements()
returns table (
  requirement_id uuid,
  requirement_locality_names text[],
  property_type_key text,
  budget_min numeric,
  budget_max numeric,
  effective_status text,
  active_option_count integer,
  withdrawn_option_count integer,
  response_updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    (select array_agg(l.name order by l.sort_order, l.name)
      from public.requirement_localities rl join public.localities l on l.id = rl.locality_id
      where rl.requirement_id = r.id),
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
    case when r.status = 'live' and r.expires_at > now() then 'live'
      when r.status = 'closed' then 'closed' else 'expired' end,
    (select count(*)::integer from public.matches am where am.broker_response_id = br.id and am.status = 'active'),
    (select count(*)::integer from public.matches wm where wm.broker_response_id = br.id and wm.status = 'withdrawn'),
    br.updated_at
  from public.broker_responses br
  join public.requirements r on r.id = br.requirement_id
  where public.is_approved_user((select auth.uid()))
    and br.broker_id = (select auth.uid())
  order by br.updated_at desc;
$$;

create or replace function public.get_requirement_responses_for_owner(p_requirement_id uuid)
returns table (
  requirement_id uuid,
  requirement_locality_names text[],
  budget_min numeric,
  budget_max numeric,
  effective_status text,
  response_id uuid,
  respondent_id uuid,
  respondent_name text,
  respondent_brokerage text,
  option_count integer,
  match_id uuid,
  match_locality_name text,
  asking_price numeric,
  match_size numeric,
  match_size_unit text,
  match_floor text,
  match_source text,
  match_notes text,
  match_created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    (select array_agg(l.name order by l.sort_order, l.name)
      from public.requirement_localities rl join public.localities l on l.id = rl.locality_id
      where rl.requirement_id = r.id),
    r.budget_min,
    r.budget_max,
    case when r.status = 'live' and r.expires_at > now() then 'live'
      when r.status = 'closed' then 'closed' else 'expired' end,
    br.id,
    br.broker_id,
    p.full_name,
    p.company_name,
    (select count(*)::integer from public.matches cm where cm.broker_response_id = br.id and cm.status = 'active'),
    m.id,
    l.name,
    m.asking_price,
    m.size,
    m.size_unit,
    m.floor,
    m.source,
    m.notes,
    m.created_at
  from public.requirements r
  join public.broker_responses br on br.requirement_id = r.id
  join public.profiles p on p.id = br.broker_id
  join public.matches m on m.broker_response_id = br.id and m.status = 'active'
  join public.localities l on l.id = m.locality_id
  where public.is_approved_user((select auth.uid()))
    and r.broker_id = (select auth.uid())
    and r.id = p_requirement_id
  order by br.created_at, m.created_at;
$$;

revoke all on function public.get_own_requirements(uuid) from public, anon, authenticated;
grant execute on function public.get_own_requirements(uuid) to authenticated;

revoke all on function public.submit_match(uuid, uuid, numeric, numeric, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_match(uuid, uuid, numeric, numeric, text, text, text, text) to authenticated;
revoke all on function public.update_own_match(uuid, uuid, numeric, numeric, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_own_match(uuid, uuid, numeric, numeric, text, text, text, text) to authenticated;
revoke all on function public.withdraw_own_match(uuid) from public, anon, authenticated;
grant execute on function public.withdraw_own_match(uuid) to authenticated;
revoke all on function public.get_own_response(uuid) from public, anon, authenticated;
grant execute on function public.get_own_response(uuid) to authenticated;
revoke all on function public.get_responded_requirements() from public, anon, authenticated;
grant execute on function public.get_responded_requirements() to authenticated;
revoke all on function public.get_requirement_responses_for_owner(uuid) from public, anon, authenticated;
grant execute on function public.get_requirement_responses_for_owner(uuid) to authenticated;

commit;
