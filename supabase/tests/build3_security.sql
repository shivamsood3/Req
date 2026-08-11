begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'Build 3 security test failed: %', message; end if;
  raise notice 'ok: %', message;
end;
$$;

create or replace function pg_temp.assert_throws(statement text, message text)
returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then raise notice 'ok: %', message; return;
  end;
  raise exception 'Build 3 security test failed: %', message;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a3000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'build3-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'build3-other@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'build3-pending@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'build3-suspended@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'build3-rejected@example.com', '', now(), '{}', '{}', now(), now());

update public.profiles set full_name = 'Build 3 Owner', company_name = 'REQ Test', mobile = '+91 99999 30001', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a3000000-0000-4000-8000-000000000001';
update public.profiles set full_name = 'Build 3 Other', company_name = 'REQ Test', mobile = '+91 99999 30002', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a3000000-0000-4000-8000-000000000002';
update public.profiles set full_name = 'Build 3 Pending', company_name = 'REQ Test', mobile = '+91 99999 30003', primary_market = 'South Delhi', status = 'pending' where id = 'a3000000-0000-4000-8000-000000000003';
update public.profiles set full_name = 'Build 3 Suspended', company_name = 'REQ Test', mobile = '+91 99999 30004', primary_market = 'South Delhi', status = 'suspended' where id = 'a3000000-0000-4000-8000-000000000004';
update public.profiles set full_name = 'Build 3 Rejected', company_name = 'REQ Test', mobile = '+91 99999 30005', primary_market = 'South Delhi', status = 'rejected' where id = 'a3000000-0000-4000-8000-000000000005';

insert into public.localities (id, name, slug, is_active, sort_order) values
  ('b3000000-0000-4000-8000-000000000001', 'Build 3 Active One', 'build3-active-one', true, 9911),
  ('b3000000-0000-4000-8000-000000000002', 'Build 3 Active Two', 'build3-active-two', true, 9912),
  ('b3000000-0000-4000-8000-000000000003', 'Build 3 Inactive', 'build3-inactive', false, 9913);

insert into public.requirements (
  id, broker_id, property_type, budget_min, budget_max, size_min, size_max,
  size_unit, floor_preference, buyer_type, urgency, notes, status,
  response_count, created_at, updated_at, live_since, expires_at, closed_at, renewal_count
) values
  ('c3000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'Independent Floor', 10, 12, 300, 400, 'sq yd', 'First', 'End User', 'Active', 'Old editable', 'live', 0, now() - interval '6 days', now() - interval '5 days', now() - interval '5 days', now() + interval '2 days', null, 2),
  ('c3000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000001', 'Apartment', 14, 16, 2000, 2500, 'sq ft', null, null, null, 'Newer live', 'live', 0, now() - interval '1 day', now() - interval '1 day', now() - interval '1 day', now() + interval '4 days', null, 0),
  ('c3000000-0000-4000-8000-000000000003', 'a3000000-0000-4000-8000-000000000001', 'Commercial', 20, 25, null, null, null, null, 'Investor', 'Immediate', 'Expiring', 'live', 0, now() - interval '6 days', now() - interval '6 days', now() - interval '6 days', now() + interval '12 hours', null, 1),
  ('c3000000-0000-4000-8000-000000000004', 'a3000000-0000-4000-8000-000000000001', 'Land', 30, 35, null, null, null, null, null, null, 'Expired history', 'live', 0, now() - interval '9 days', now() - interval '9 days', now() - interval '9 days', now() - interval '2 days', null, 0),
  ('c3000000-0000-4000-8000-000000000005', 'a3000000-0000-4000-8000-000000000001', 'House / Plot', 22, 28, 400, 500, 'sq yd', 'Any', 'Developer', 'Flexible', 'Closed history', 'closed', 0, now() - interval '8 days', now() - interval '3 days', now() - interval '7 days', now() + interval '1 day', now() - interval '3 days', 1),
  ('c3000000-0000-4000-8000-000000000006', 'a3000000-0000-4000-8000-000000000002', 'Land', 40, 45, null, null, null, null, null, null, 'Other expired', 'live', 0, now() - interval '10 days', now() - interval '10 days', now() - interval '10 days', now() - interval '3 days', null, 0),
  ('c3000000-0000-4000-8000-000000000007', 'a3000000-0000-4000-8000-000000000002', 'Commercial', 50, 55, null, null, null, null, null, null, 'Other closed', 'closed', 0, now() - interval '8 days', now() - interval '2 days', now() - interval '7 days', now() + interval '1 day', now() - interval '2 days', 0),
  ('c3000000-0000-4000-8000-000000000008', 'a3000000-0000-4000-8000-000000000002', 'Apartment', 8, 9, 1500, 1700, 'sq ft', null, null, null, 'Other live', 'live', 0, now() - interval '1 hour', now() - interval '1 hour', now() - interval '1 hour', now() + interval '6 days', null, 0);

insert into public.requirement_localities (requirement_id, locality_id)
select r.id, 'b3000000-0000-4000-8000-000000000001'::uuid
from public.requirements r where r.id::text like 'c3000000%';

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.get_own_requirements(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.update_own_requirement(uuid,uuid[],text,numeric,numeric,numeric,numeric,text,text,text,text,text)', 'execute')
  and not has_function_privilege('anon', 'public.close_own_requirement(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.renew_own_requirement(uuid)', 'execute'),
  'anonymous cannot use owner lifecycle functions'
);

select set_config('request.jwt.claims', '{"sub":"a3000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select pg_temp.assert_true((select count(*) = 5 from public.get_own_requirements()), 'broker reads only all own requirements');
select pg_temp.assert_true(exists(select 1 from public.get_own_requirements() where effective_status = 'live'), 'broker reads own live REQs');
select pg_temp.assert_true(exists(select 1 from public.get_own_requirements() where effective_status = 'expired'), 'broker reads effectively expired REQs');
select pg_temp.assert_true(exists(select 1 from public.get_own_requirements() where effective_status = 'closed'), 'broker reads own closed REQs');
select pg_temp.assert_true(
  not exists(select 1 from public.requirements where id in ('c3000000-0000-4000-8000-000000000006', 'c3000000-0000-4000-8000-000000000007')),
  'broker cannot directly read another broker history'
);

select public.update_own_requirement(
  'c3000000-0000-4000-8000-000000000001',
  array['b3000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000002']::uuid[],
  'house-plot', 11, 13, 350, 450, 'sq yd', 'Any', 'Developer', 'Flexible', 'Edited safely'
);
select pg_temp.assert_true(
  exists(select 1 from public.requirements where id = 'c3000000-0000-4000-8000-000000000001' and property_type = 'House / Plot' and budget_min = 11 and notes = 'Edited safely'),
  'broker edits own live REQ'
);
select pg_temp.assert_true(
  exists(select 1 from public.requirements where id = 'c3000000-0000-4000-8000-000000000001'
    and live_since = now() - interval '5 days'
    and expires_at = now() + interval '2 days'
    and renewal_count = 2
    and updated_at > now() - interval '1 minute'),
  'edit updates updated_at but preserves live_since, expiry, and renewal count'
);
select pg_temp.assert_true(
  (select count(*) = 2 from public.requirement_localities where requirement_id = 'c3000000-0000-4000-8000-000000000001'),
  'locality replacement succeeds atomically'
);
select pg_temp.assert_true(
  (select array_position(array_agg(id order by live_since desc), 'c3000000-0000-4000-8000-000000000002'::uuid)
        < array_position(array_agg(id order by live_since desc), 'c3000000-0000-4000-8000-000000000001'::uuid)
   from public.get_broker_live_requirements()),
  'edited old REQ does not jump above a newer REQ'
);

select pg_temp.assert_throws(
  $$select public.update_own_requirement('c3000000-0000-4000-8000-000000000001', array['b3000000-0000-4000-8000-000000000003']::uuid[], 'floor', 1, 2, null, null, null, null, null, null, null)$$,
  'inactive locality is rejected on edit'
);
select pg_temp.assert_true(
  (select count(*) = 2 from public.requirement_localities where requirement_id = 'c3000000-0000-4000-8000-000000000001')
  and (select budget_min = 11 from public.requirements where id = 'c3000000-0000-4000-8000-000000000001'),
  'failed locality edit rolls back requirement and locality changes'
);
select pg_temp.assert_throws(
  $$select public.update_own_requirement('c3000000-0000-4000-8000-000000000008', array['b3000000-0000-4000-8000-000000000001']::uuid[], 'floor', 1, 2, null, null, null, null, null, null, null)$$,
  'broker cannot edit another broker REQ'
);
select pg_temp.assert_throws(
  $$select public.update_own_requirement('c3000000-0000-4000-8000-000000000004', array['b3000000-0000-4000-8000-000000000001']::uuid[], 'land', 30, 35, null, null, null, null, null, null, null)$$,
  'expired REQ cannot be edited'
);
select pg_temp.assert_throws(
  $$select public.renew_own_requirement('c3000000-0000-4000-8000-000000000001')$$,
  'non-expiring live REQ cannot Keep Live'
);

select public.close_own_requirement('c3000000-0000-4000-8000-000000000002');
select pg_temp.assert_true(
  exists(select 1 from public.get_own_requirements('c3000000-0000-4000-8000-000000000002') where effective_status = 'closed' and closed_at > now() - interval '1 minute'),
  'owner closes live REQ and it remains in history'
);
select pg_temp.assert_true(
  not exists(select 1 from public.public_requirement_previews where id = 'c3000000-0000-4000-8000-000000000002')
  and not exists(select 1 from public.get_broker_live_requirements(null,null,null,null,'c3000000-0000-4000-8000-000000000002')),
  'closed REQ leaves public and authenticated live feeds'
);
select pg_temp.assert_throws(
  $$select public.close_own_requirement('c3000000-0000-4000-8000-000000000008')$$,
  'broker cannot close another broker REQ'
);

select public.renew_own_requirement('c3000000-0000-4000-8000-000000000003');
select pg_temp.assert_true(
  exists(select 1 from public.requirements where id = 'c3000000-0000-4000-8000-000000000003'
    and status = 'live' and live_since > now() - interval '1 minute'
    and expires_at between now() + interval '6 days 23 hours 59 minutes' and now() + interval '7 days 1 minute'
    and renewal_count = 2 and closed_at is null),
  'expiring REQ Keep Live resets publication window and increments renewal count'
);

select public.renew_own_requirement('c3000000-0000-4000-8000-000000000004');
select pg_temp.assert_true(
  exists(select 1 from public.public_requirement_previews where id = 'c3000000-0000-4000-8000-000000000004')
  and exists(select 1 from public.get_broker_live_requirements(null,null,null,null,'c3000000-0000-4000-8000-000000000004')),
  'expired REQ Make Live Again returns to both live feeds'
);
select public.renew_own_requirement('c3000000-0000-4000-8000-000000000005');
select pg_temp.assert_true(
  exists(select 1 from public.get_own_requirements('c3000000-0000-4000-8000-000000000005') where effective_status = 'live' and renewal_count = 2),
  'closed REQ can Make Live Again without duplication'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"a3000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.update_own_requirement('c3000000-0000-4000-8000-000000000001', array['b3000000-0000-4000-8000-000000000001']::uuid[], 'floor', 1, 2, null, null, null, null, null, null, null)$$, 'pending broker cannot edit');
reset role;

select set_config('request.jwt.claims', '{"sub":"a3000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.update_own_requirement('c3000000-0000-4000-8000-000000000001', array['b3000000-0000-4000-8000-000000000001']::uuid[], 'floor', 1, 2, null, null, null, null, null, null, null)$$, 'suspended broker cannot edit');
reset role;

select set_config('request.jwt.claims', '{"sub":"a3000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.update_own_requirement('c3000000-0000-4000-8000-000000000001', array['b3000000-0000-4000-8000-000000000001']::uuid[], 'floor', 1, 2, null, null, null, null, null, null, null)$$, 'rejected broker cannot edit');
reset role;

rollback;
