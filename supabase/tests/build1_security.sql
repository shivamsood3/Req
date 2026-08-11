begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'Build 1 security test failed: %', message;
  end if;
  raise notice 'ok: %', message;
end;
$$;

-- Test identities exist only inside this transaction and are rolled back.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'build1-approved@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'build1-pending@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'build1-suspended@example.com', '', now(), '{}', '{}', now(), now());

update public.profiles
set full_name = 'Approved Broker', company_name = 'REQ Test', mobile = '+91 99999 00001',
    primary_market = 'South Delhi', status = 'approved', approved_at = now()
where id = 'a1000000-0000-4000-8000-000000000001';

update public.profiles
set full_name = 'Pending Broker', company_name = 'REQ Test', mobile = '+91 99999 00002',
    primary_market = 'South Delhi', status = 'pending'
where id = 'a1000000-0000-4000-8000-000000000002';

update public.profiles
set full_name = 'Suspended Broker', company_name = 'REQ Test', mobile = '+91 99999 00003',
    primary_market = 'South Delhi', status = 'suspended', suspended_at = now()
where id = 'a1000000-0000-4000-8000-000000000003';

insert into public.requirements (
  id, broker_id, property_type, budget_min, budget_max, size_min, size_max,
  size_unit, floor_preference, buyer_type, urgency, notes, status,
  response_count, live_since, expires_at
) values
  ('d1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Independent Floor', 12, 15, 325, 500, 'sq yd', 'First floor preferred', 'End user', 'Immediate', 'Approved brokers may read this note.', 'live', 3, now() - interval '38 minutes', now() + interval '6 days'),
  ('d1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Independent Floor', 10, 12, 250, 350, 'sq yd', null, null, null, 'Expired test', 'live', 0, now() - interval '2 days', now() - interval '1 minute'),
  ('d1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'Apartment', 8, 10, 1800, 2200, 'sq ft', null, null, null, 'Closed test', 'closed', 0, now() - interval '1 day', now() + interval '2 days'),
  ('d1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'Commercial', 30, 40, null, null, null, null, 'Investor', 'Flexible', null, 'live', 1, now() - interval '2 hours', now() + interval '4 days');

insert into public.requirement_localities (requirement_id, locality_id)
select fixture.requirement_id::uuid, l.id
from (values
  ('d1000000-0000-4000-8000-000000000001', 'defence-colony'),
  ('d1000000-0000-4000-8000-000000000002', 'defence-colony'),
  ('d1000000-0000-4000-8000-000000000003', 'hauz-khas'),
  ('d1000000-0000-4000-8000-000000000004', 'defence-colony'),
  ('d1000000-0000-4000-8000-000000000004', 'greater-kailash-i')
) as fixture(requirement_id, locality_slug)
join public.localities l on l.slug = fixture.locality_slug;

select pg_temp.assert_true(
  not has_column_privilege('anon', 'public.requirements', 'notes', 'select'),
  'anonymous visitor cannot retrieve notes'
);
select pg_temp.assert_true(
  not has_column_privilege('anon', 'public.requirements', 'broker_id', 'select'),
  'anonymous visitor cannot retrieve broker identity'
);
select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'anonymous visitor cannot retrieve profile or contact data'
);
select pg_temp.assert_true(
  position('mobile' in pg_get_function_result('public.get_broker_live_requirements(text[],text,numeric,numeric,uuid)'::regprocedure)) = 0
  and position('email' in pg_get_function_result('public.get_broker_live_requirements(text[],text,numeric,numeric,uuid)'::regprocedure)) = 0,
  'broker feed and detail contract exclude mobile and email'
);

set local role anon;
select pg_temp.assert_true(
  (select count(*) = 2 from public.public_requirement_previews where id::text like 'd1000000%'),
  'public feed contains only effective live requirements'
);
select pg_temp.assert_true(
  not exists (select 1 from public.public_requirement_previews where id = 'd1000000-0000-4000-8000-000000000002'),
  'expired requirement does not appear in public feed'
);
select pg_temp.assert_true(
  not exists (select 1 from public.public_requirement_previews where id = 'd1000000-0000-4000-8000-000000000003'),
  'closed requirement does not appear in public feed'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.public_requirement_previews where id = 'd1000000-0000-4000-8000-000000000004'),
  'multi-locality requirement produces one public feed card'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.public_requirement_previews where locality_slugs && array['greater-kailash-i']::text[] and id::text like 'd1000000%'),
  'public location filter works'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.public_requirement_previews where property_type_key = 'commercial' and id::text like 'd1000000%'),
  'public property-type filter works'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.public_requirement_previews where budget_max >= 10 and budget_min <= 20 and id::text like 'd1000000%'),
  'public budget-overlap filter works'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true(
  (select count(*) = 2 from public.get_broker_live_requirements()),
  'approved broker can retrieve full effective-live requirements'
);
select pg_temp.assert_true(
  not exists (select 1 from public.get_broker_live_requirements() where id = 'd1000000-0000-4000-8000-000000000002'),
  'expired requirement does not appear in authenticated live feed'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.get_broker_live_requirements(array['greater-kailash-i'], null, null, null, null)),
  'authenticated multi-locality filter returns one requirement'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true(
  not exists (select 1 from public.get_broker_live_requirements()),
  'pending broker cannot retrieve broker requirements'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true(
  not exists (select 1 from public.get_broker_live_requirements()),
  'suspended broker cannot retrieve broker requirements'
);
reset role;

rollback;
