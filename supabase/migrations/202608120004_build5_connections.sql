begin;

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  request_owner_id uuid not null references public.profiles(id) on delete cascade,
  responding_broker_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (requirement_id, responding_broker_id),
  check (request_owner_id <> responding_broker_id)
);

create index connections_owner_created_idx
on public.connections(request_owner_id, created_at desc);
create index connections_respondent_created_idx
on public.connections(responding_broker_id, created_at desc);

alter table public.connections enable row level security;
revoke all on public.connections from public, anon, authenticated;

create or replace function public.connect_to_response(
  p_requirement_id uuid,
  p_responding_broker_id uuid
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
  existing_connection_id uuid;
  created_connection_id uuid;
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
  if requirement_owner_id <> current_user_id then
    raise exception using errcode = '42501', message = 'Requirement owner access required';
  end if;
  if p_responding_broker_id = current_user_id then
    raise exception using errcode = '42501', message = 'Cannot connect to your own response';
  end if;

  select id into existing_connection_id
  from public.connections
  where requirement_id = p_requirement_id
    and request_owner_id = current_user_id
    and responding_broker_id = p_responding_broker_id;
  if existing_connection_id is not null then return existing_connection_id; end if;

  if requirement_status <> 'live' or requirement_expires_at <= now() then
    raise exception using errcode = '22023', message = 'This requirement is no longer live';
  end if;
  if not public.is_approved_user(p_responding_broker_id) then
    raise exception using errcode = '42501', message = 'Responding broker is not approved';
  end if;
  if not exists (
    select 1
    from public.broker_responses br
    where br.requirement_id = p_requirement_id
      and br.broker_id = p_responding_broker_id
      and exists (
        select 1 from public.matches m
        where m.broker_response_id = br.id and m.status = 'active'
      )
  ) then
    raise exception using errcode = '22023', message = 'Active response not found';
  end if;

  insert into public.connections(requirement_id, request_owner_id, responding_broker_id)
  values (p_requirement_id, current_user_id, p_responding_broker_id)
  on conflict (requirement_id, responding_broker_id) do nothing
  returning id into created_connection_id;

  if created_connection_id is null then
    select id into created_connection_id
    from public.connections
    where requirement_id = p_requirement_id
      and request_owner_id = current_user_id
      and responding_broker_id = p_responding_broker_id;
  end if;

  return created_connection_id;
end;
$$;

create or replace function public.get_own_response(p_requirement_id uuid)
returns table (
  requirement_id uuid,
  requirement_owner_id uuid,
  requirement_owner_name text,
  requirement_owner_brokerage text,
  requirement_owner_mobile text,
  connection_id uuid,
  connected_at timestamptz,
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
    owner_profile.full_name,
    owner_profile.company_name,
    case when c.id is not null then owner_profile.mobile else null end,
    c.id,
    c.created_at,
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
  join public.profiles owner_profile on owner_profile.id = r.broker_id
  join public.matches m on m.broker_response_id = br.id
  join public.localities ml on ml.id = m.locality_id
  left join public.connections c
    on c.requirement_id = r.id
   and c.request_owner_id = r.broker_id
   and c.responding_broker_id = br.broker_id
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
  response_updated_at timestamptz,
  connection_id uuid,
  connected_at timestamptz
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
    br.updated_at,
    c.id,
    c.created_at
  from public.broker_responses br
  join public.requirements r on r.id = br.requirement_id
  left join public.connections c
    on c.requirement_id = r.id
   and c.request_owner_id = r.broker_id
   and c.responding_broker_id = br.broker_id
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
  respondent_mobile text,
  connection_id uuid,
  connected_at timestamptz,
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
    case when c.id is not null then p.mobile else null end,
    c.id,
    c.created_at,
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
  left join public.connections c
    on c.requirement_id = r.id
   and c.request_owner_id = r.broker_id
   and c.responding_broker_id = br.broker_id
  left join public.matches m on m.broker_response_id = br.id and m.status = 'active'
  left join public.localities l on l.id = m.locality_id
  where public.is_approved_user((select auth.uid()))
    and r.broker_id = (select auth.uid())
    and r.id = p_requirement_id
    and (
      c.id is not null
      or exists (
        select 1 from public.matches active_m
        where active_m.broker_response_id = br.id and active_m.status = 'active'
      )
    )
  order by br.created_at, m.created_at nulls last;
$$;

revoke all on function public.connect_to_response(uuid, uuid) from public, anon, authenticated;
grant execute on function public.connect_to_response(uuid, uuid) to authenticated;
revoke all on function public.get_own_response(uuid) from public, anon, authenticated;
grant execute on function public.get_own_response(uuid) to authenticated;
revoke all on function public.get_responded_requirements() from public, anon, authenticated;
grant execute on function public.get_responded_requirements() to authenticated;
revoke all on function public.get_requirement_responses_for_owner(uuid) from public, anon, authenticated;
grant execute on function public.get_requirement_responses_for_owner(uuid) to authenticated;

commit;
