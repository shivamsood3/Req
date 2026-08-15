begin;

create type public.notification_type as enum (
  'new_match',
  'connected',
  'req_expiring',
  'access_approved'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 180),
  entity_type text not null check (entity_type in ('requirement', 'account')),
  entity_id uuid,
  event_key text not null,
  read_at timestamptz,
  push_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_key)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index notifications_user_created_idx
on public.notifications(user_id, created_at desc);
create index notifications_user_unread_idx
on public.notifications(user_id, created_at desc)
where read_at is null;
create index notifications_push_pending_idx
on public.notifications(created_at)
where push_sent_at is null;
create index push_subscriptions_user_idx
on public.push_subscriptions(user_id, updated_at desc);

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

revoke all on public.notifications from public, anon, authenticated;
revoke all on public.push_subscriptions from public, anon, authenticated;

grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, update(push_sent_at) on public.notifications to service_role;
grant select, delete on public.push_subscriptions to service_role;

create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "notifications_mark_own_read"
on public.notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "push_subscriptions_delete_own"
on public.push_subscriptions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();

create or replace function public.create_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_entity_type text,
  p_entity_id uuid,
  p_event_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_notification_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  insert into public.notifications (
    user_id, type, title, body, entity_type, entity_id, event_key
  )
  values (
    p_user_id,
    p_type,
    trim(p_title),
    trim(p_body),
    p_entity_type,
    p_entity_id,
    p_event_key
  )
  on conflict (event_key) do nothing
  returning id into created_notification_id;

  return created_notification_id;
end;
$$;

create or replace function public.get_unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.notifications n
  where public.is_approved_user((select auth.uid()))
    and n.user_id = (select auth.uid())
    and n.read_at is null;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns table (
  id uuid,
  type text,
  entity_type text,
  entity_id uuid
)
language sql
security definer
set search_path = ''
as $$
  update public.notifications n
  set read_at = coalesce(n.read_at, now())
  where public.is_approved_user((select auth.uid()))
    and n.id = p_notification_id
    and n.user_id = (select auth.uid())
  returning n.id, n.type::text, n.entity_type, n.entity_id;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  if not public.is_approved_user((select auth.uid())) then
    raise exception using errcode = '42501', message = 'Approved broker access required';
  end if;

  update public.notifications
  set read_at = now()
  where user_id = (select auth.uid())
    and read_at is null;

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

create or replace function public.generate_req_expiring_notifications()
returns table (
  notification_id uuid,
  event_key text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  req record;
  generated_id uuid;
  generated_event_key text;
begin
  for req in
    select
      r.id,
      r.broker_id,
      r.live_since,
      coalesce(
        (select l.name
         from public.requirement_localities rl
         join public.localities l on l.id = rl.locality_id
         where rl.requirement_id = r.id
         order by l.sort_order, l.name
         limit 1),
        'your'
      ) as locality_name
    from public.requirements r
    where r.status = 'live'
      and r.expires_at > now()
      and r.expires_at <= now() + interval '24 hours'
  loop
    generated_event_key := 'req_expiring:' || req.id::text || ':' || extract(epoch from req.live_since)::text;
    generated_id := public.create_notification(
      req.broker_id,
      'req_expiring'::public.notification_type,
      'REQ expires tomorrow',
      'Still looking in ' || req.locality_name || '?',
      'requirement',
      req.id,
      generated_event_key
    );

    if generated_id is not null then
      notification_id := generated_id;
      event_key := generated_event_key;
      return next;
    end if;
  end loop;
end;
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
  respondent_name text;
  locality_name text;
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

  if active_option_count = 0 then
    select coalesce(nullif(full_name, ''), 'A broker')
    into respondent_name
    from public.profiles
    where id = current_user_id;

    select coalesce(
      (select l.name
       from public.requirement_localities rl
       join public.localities l on l.id = rl.locality_id
       where rl.requirement_id = p_requirement_id
       order by l.sort_order, l.name
       limit 1),
      'your'
    ) into locality_name;

    perform public.create_notification(
      requirement_owner_id,
      'new_match'::public.notification_type,
      'New match received',
      respondent_name || ' responded to your ' || locality_name || ' REQ.',
      'requirement',
      p_requirement_id,
      'new_match:' || p_requirement_id::text || ':' || current_user_id::text
    );
  end if;

  return created_match_id;
end;
$$;

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
  owner_name text;
  locality_name text;
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
  else
    select coalesce(nullif(full_name, ''), 'The REQ owner')
    into owner_name
    from public.profiles
    where id = current_user_id;

    select coalesce(
      (select l.name
       from public.requirement_localities rl
       join public.localities l on l.id = rl.locality_id
       where rl.requirement_id = p_requirement_id
       order by l.sort_order, l.name
       limit 1),
      'your'
    ) into locality_name;

    perform public.create_notification(
      p_responding_broker_id,
      'connected'::public.notification_type,
      'Connected',
      owner_name || ' connected with you on the ' || locality_name || ' REQ.',
      'requirement',
      p_requirement_id,
      'connected:' || p_requirement_id::text || ':' || p_responding_broker_id::text
    );
  end if;

  return created_connection_id;
end;
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

revoke all on function public.create_notification(uuid, public.notification_type, text, text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.get_unread_notification_count() from public, anon, authenticated;
grant execute on function public.get_unread_notification_count() to authenticated;
revoke all on function public.mark_notification_read(uuid) from public, anon, authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
revoke all on function public.mark_all_notifications_read() from public, anon, authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
revoke all on function public.generate_req_expiring_notifications() from public, anon, authenticated;
grant execute on function public.generate_req_expiring_notifications() to service_role;

revoke all on function public.submit_match(uuid, uuid, numeric, numeric, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_match(uuid, uuid, numeric, numeric, text, text, text, text) to authenticated;
revoke all on function public.connect_to_response(uuid, uuid) from public, anon, authenticated;
grant execute on function public.connect_to_response(uuid, uuid) to authenticated;
revoke all on function public.review_broker(uuid, text) from public, anon, authenticated;
grant execute on function public.review_broker(uuid, text) to authenticated;

commit;
