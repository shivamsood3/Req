begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'Build 2 security test failed: %', message;
  end if;
  raise notice 'ok: %', message;
end;
$$;

create or replace function pg_temp.assert_throws(statement text, message text)
returns void
language plpgsql
as $$
begin
  begin
    execute statement;
  exception when others then
    raise notice 'ok: %', message;
    return;
  end;
  raise exception 'Build 2 security test failed: %', message;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a2000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'build2-approved@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'build2-pending@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'build2-suspended@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'build2-rejected@example.com', '', now(), '{}', '{}', now(), now());

update public.profiles
set full_name = 'Build 2 Broker', company_name = 'REQ Test', mobile = '+91 99999 00001',
    primary_market = 'South Delhi', status = 'approved', approved_at = now()
where id = 'a2000000-0000-4000-8000-000000000001';

update public.profiles
set full_name = 'Pending Broker', company_name = 'REQ Test', mobile = '+91 99999 00002',
    primary_market = 'South Delhi', status = 'pending'
where id = 'a2000000-0000-4000-8000-000000000002';

update public.profiles
set full_name = 'Suspended Broker', company_name = 'REQ Test', mobile = '+91 99999 00003',
    primary_market = 'South Delhi', status = 'suspended', suspended_at = now()
where id = 'a2000000-0000-4000-8000-000000000003';

update public.profiles
set full_name = 'Rejected Broker', company_name = 'REQ Test', mobile = '+91 99999 00004',
    primary_market = 'South Delhi', status = 'rejected'
where id = 'a2000000-0000-4000-8000-000000000004';

insert into public.localities (id, name, slug, is_active, sort_order) values
  ('b2000000-0000-4000-8000-000000000001', 'Build 2 Active One', 'build2-active-one', true, 9901),
  ('b2000000-0000-4000-8000-000000000002', 'Build 2 Active Two', 'build2-active-two', true, 9902),
  ('b2000000-0000-4000-8000-000000000003', 'Build 2 Inactive', 'build2-inactive', false, 9903);

select pg_temp.assert_true(
  not has_function_privilege(
    'anon',
    'public.create_requirement(uuid[],text,numeric,numeric,numeric,numeric,text,text,text,text,text)',
    'execute'
  ),
  'anonymous cannot create requirement'
);

select set_config('request.jwt.claims', '{"sub":"a2000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws(
  $$select public.create_requirement(array['b2000000-0000-4000-8000-000000000001']::uuid[], 'floor', 10, 12, null, null, null, null, null, null, null)$$,
  'pending broker cannot create'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"a2000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws(
  $$select public.create_requirement(array['b2000000-0000-4000-8000-000000000001']::uuid[], 'floor', 10, 12, null, null, null, null, null, null, null)$$,
  'suspended broker cannot create'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"a2000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws(
  $$select public.create_requirement(array['b2000000-0000-4000-8000-000000000001']::uuid[], 'floor', 10, 12, null, null, null, null, null, null, null)$$,
  'rejected broker cannot create'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"a2000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select pg_temp.assert_throws(
  $$select public.create_requirement(array[]::uuid[], 'floor', 10, 12, null, null, null, null, null, null, null)$$,
  'one locality is required'
);
select pg_temp.assert_throws(
  $$select public.create_requirement(array['b2000000-0000-4000-8000-000000000003']::uuid[], 'floor', 10, 12, null, null, null, null, null, null, null)$$,
  'inactive locality is rejected'
);
select pg_temp.assert_throws(
  $$select public.create_requirement(array['b2000000-0000-4000-8000-000000000001']::uuid[], 'not-real', 10, 12, null, null, null, null, null, null, null)$$,
  'invalid property type is rejected'
);
select pg_temp.assert_throws(
  $$select public.create_requirement(array['b2000000-0000-4000-8000-000000000001']::uuid[], 'floor', 12, 10, null, null, null, null, null, null, null)$$,
  'invalid budget range is rejected'
);
select pg_temp.assert_throws(
  $$select public.create_requirement(array['b2000000-0000-4000-8000-000000000001']::uuid[], 'floor', 10, 12, 500, 300, 'sq yd', null, null, null, null)$$,
  'invalid size range is rejected'
);
select pg_temp.assert_throws(
  $$select public.create_requirement(array['b2000000-0000-4000-8000-000000000001']::uuid[], 'floor', 10, 12, null, null, null, null, null, null, repeat('x', 501))$$,
  'notes over 500 characters are rejected'
);

select pg_temp.assert_true(
  (select count(*) = 0 from public.requirements where broker_id = 'a2000000-0000-4000-8000-000000000001'),
  'failed creation leaves no requirement or locality rows'
);

select set_config(
  'build2.minimal_id',
  public.create_requirement(
    array['b2000000-0000-4000-8000-000000000001']::uuid[],
    'land', 20, 25, null, null, null, null, null, null, null
  )::text,
  true
);
select pg_temp.assert_true(
  exists (
    select 1 from public.requirements
    where id = current_setting('build2.minimal_id')::uuid
      and size_unit is null
      and floor_preference is null
      and buyer_type is null
      and urgency is null
      and notes is null
  ),
  'approved broker can create with every optional field omitted'
);

select set_config(
  'build2.created_id',
  public.create_requirement(
    array['b2000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000002']::uuid[],
    'floor', 12, 15, 325, 500, 'sq yd', 'First', 'End User', 'Immediate', 'Private Build 2 note'
  )::text,
  true
);

select pg_temp.assert_true(
  exists (
    select 1 from public.requirements r
    where r.id = current_setting('build2.created_id')::uuid
      and r.broker_id = 'a2000000-0000-4000-8000-000000000001'
      and r.status = 'live'
      and r.response_count = 0
      and r.renewal_count = 0
      and r.closed_at is null
      and r.expires_at between r.created_at + interval '6 days 23 hours 59 minutes'
                           and r.created_at + interval '7 days 1 minute'
  ),
  'approved broker creates a live seven-day REQ with forced ownership and zero counters'
);
select pg_temp.assert_true(
  (select count(*) = 2 from public.requirement_localities where requirement_id = current_setting('build2.created_id')::uuid),
  'multiple active localities are created atomically'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.get_broker_live_requirements() where id = current_setting('build2.created_id')::uuid),
  'new REQ appears in the authenticated live feed'
);
reset role;

set local role anon;
select pg_temp.assert_true(
  (select count(*) = 1 from public.public_requirement_previews where id = current_setting('build2.created_id')::uuid),
  'new REQ appears once in the safe public preview'
);
select pg_temp.assert_true(
  not has_column_privilege('anon', 'public.requirements', 'notes', 'select')
    and not has_column_privilege('anon', 'public.requirements', 'broker_id', 'select')
    and not has_table_privilege('anon', 'public.profiles', 'select'),
  'public preview still excludes notes, broker identity, and profile data'
);
reset role;

rollback;
