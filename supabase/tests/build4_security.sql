begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'Build 4 security test failed: %', message; end if;
  raise notice 'ok: %', message;
end;
$$;

create or replace function pg_temp.assert_throws(statement text, message text)
returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then raise notice 'ok: %', message; return;
  end;
  raise exception 'Build 4 security test failed: %', message;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'build4-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'build4-respondent-one@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'build4-respondent-two@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'build4-pending@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'build4-suspended@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a4000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'build4-rejected@example.com', '', now(), '{}', '{}', now(), now());

update public.profiles set full_name = 'Build 4 Owner', company_name = 'REQ Test', mobile = '+91 99999 40001', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a4000000-0000-4000-8000-000000000001';
update public.profiles set full_name = 'Build 4 Respondent One', company_name = 'One Realty', mobile = '+91 99999 40002', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a4000000-0000-4000-8000-000000000002';
update public.profiles set full_name = 'Build 4 Respondent Two', company_name = 'Two Realty', mobile = '+91 99999 40003', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a4000000-0000-4000-8000-000000000003';
update public.profiles set full_name = 'Build 4 Pending', company_name = 'REQ Test', mobile = '+91 99999 40004', primary_market = 'South Delhi', status = 'pending' where id = 'a4000000-0000-4000-8000-000000000004';
update public.profiles set full_name = 'Build 4 Suspended', company_name = 'REQ Test', mobile = '+91 99999 40005', primary_market = 'South Delhi', status = 'suspended' where id = 'a4000000-0000-4000-8000-000000000005';
update public.profiles set full_name = 'Build 4 Rejected', company_name = 'REQ Test', mobile = '+91 99999 40006', primary_market = 'South Delhi', status = 'rejected' where id = 'a4000000-0000-4000-8000-000000000006';

insert into public.localities(id, name, slug, is_active, sort_order) values
  ('b4000000-0000-4000-8000-000000000001', 'Build 4 Active One', 'build4-active-one', true, 9941),
  ('b4000000-0000-4000-8000-000000000002', 'Build 4 Active Two', 'build4-active-two', true, 9942),
  ('b4000000-0000-4000-8000-000000000003', 'Build 4 Inactive', 'build4-inactive', false, 9943);

insert into public.requirements(
  id, broker_id, property_type, budget_min, budget_max, status,
  created_at, updated_at, live_since, expires_at, closed_at
) values
  ('c4000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'Independent Floor', 12, 15, 'live', now(), now(), now(), now() + interval '6 days', null),
  ('c4000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000001', 'Apartment', 8, 10, 'live', now() - interval '9 days', now() - interval '9 days', now() - interval '9 days', now() - interval '2 days', null),
  ('c4000000-0000-4000-8000-000000000003', 'a4000000-0000-4000-8000-000000000001', 'Commercial', 20, 25, 'closed', now() - interval '5 days', now() - interval '1 day', now() - interval '5 days', now() + interval '2 days', now() - interval '1 day');

insert into public.requirement_localities(requirement_id, locality_id)
select id, 'b4000000-0000-4000-8000-000000000001'::uuid
from public.requirements where id::text like 'c4000000%';

create or replace function pg_temp.match_id_for(test_requirement uuid, test_broker uuid, active_only boolean default false)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.matches m
  join public.broker_responses br on br.id = m.broker_response_id
  where br.requirement_id = test_requirement and br.broker_id = test_broker
    and (not active_only or m.status = 'active')
  order by m.created_at limit 1;
$$;
grant execute on function pg_temp.match_id_for(uuid, uuid, boolean) to authenticated;

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.submit_match(uuid,uuid,numeric,numeric,text,text,text,text)', 'execute')
  and not has_function_privilege('anon', 'public.update_own_match(uuid,uuid,numeric,numeric,text,text,text,text)', 'execute')
  and not has_function_privilege('anon', 'public.withdraw_own_match(uuid)', 'execute')
  and not has_table_privilege('anon', 'public.broker_responses', 'select')
  and not has_table_privilege('anon', 'public.matches', 'select'),
  'anonymous cannot submit or retrieve response data'
);

select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',13,null,null,null,null,null)$$, 'pending broker cannot submit');
reset role;
select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',13,null,null,null,null,null)$$, 'suspended broker cannot submit');
reset role;
select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',13,null,null,null,null,null)$$, 'rejected broker cannot submit');
reset role;

select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',13,null,null,null,null,null)$$, 'owner cannot respond to own requirement');
reset role;

select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000001',9,null,null,null,null,null)$$, 'expired requirement rejects new response');
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000003','b4000000-0000-4000-8000-000000000001',22,null,null,null,null,null)$$, 'closed requirement rejects new response');
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000003',13,null,null,null,null,null)$$, 'inactive locality is rejected');
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',0,null,null,null,null,null)$$, 'invalid asking price is rejected');
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',13,400,'hectare',null,null,null)$$, 'invalid size unit is rejected');
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',13,null,null,'Basement',null,null)$$, 'invalid floor is rejected');
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',13,null,null,null,'Two hop',null)$$, 'invalid source is rejected');
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',13,null,null,null,null,repeat('x',501))$$, 'notes above 500 characters are rejected');

select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',13.75,400,'sq yd','First','Direct','Owner open to discussion');
reset role;
select pg_temp.assert_true(
  (select count(*) = 1 from public.broker_responses where requirement_id = 'c4000000-0000-4000-8000-000000000001' and broker_id = 'a4000000-0000-4000-8000-000000000002')
  and (select count(*) = 1 from public.matches m join public.broker_responses br on br.id = m.broker_response_id where br.requirement_id = 'c4000000-0000-4000-8000-000000000001' and br.broker_id = 'a4000000-0000-4000-8000-000000000002'),
  'first option creates one response container and one match'
);

select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000002',14.25,500,'sq yd','Ground','Through another broker',null);
select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',14.75,450,'sq yd','Second','Direct',null);
select pg_temp.assert_throws($$select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',15,500,'sq yd','Top','Direct',null)$$, 'fourth active option is rejected');
reset role;
select pg_temp.assert_true(
  (select count(*) = 1 from public.broker_responses where requirement_id = 'c4000000-0000-4000-8000-000000000001' and broker_id = 'a4000000-0000-4000-8000-000000000002')
  and (select count(*) = 3 from public.matches m join public.broker_responses br on br.id = m.broker_response_id where br.requirement_id = 'c4000000-0000-4000-8000-000000000001' and br.broker_id = 'a4000000-0000-4000-8000-000000000002'),
  'second and third options reuse one response and enforce maximum three'
);
select pg_temp.assert_true(
  (select response_count = 1 from public.public_requirement_previews where id = 'c4000000-0000-4000-8000-000000000001'),
  'three options from one broker count as one public response'
);

select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select public.submit_match('c4000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000002',13.5,null,null,null,'Prefer not to say',null);
reset role;
select pg_temp.assert_true(
  (select response_count = 2 from public.public_requirement_previews where id = 'c4000000-0000-4000-8000-000000000001'),
  'second responding broker increases derived count to two'
);

select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(distinct response_id) = 2 and count(*) = 4 from public.get_requirement_responses_for_owner('c4000000-0000-4000-8000-000000000001')), 'owner sees active options grouped under two responses');
select pg_temp.assert_true((select response_count = 2 from public.get_own_requirements('c4000000-0000-4000-8000-000000000001')), 'owner card count is derived broker count');
reset role;

select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.get_requirement_responses_for_owner('c4000000-0000-4000-8000-000000000001')), 'non-owner cannot read owner inbox');
select pg_temp.assert_true((select count(*) = 3 from public.get_own_response('c4000000-0000-4000-8000-000000000001')), 'respondent sees only own three options');
select public.update_own_match(pg_temp.match_id_for('c4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002',true),'b4000000-0000-4000-8000-000000000002',13.9,425,'sq yd','Top','Direct','Edited option');
reset role;
select pg_temp.assert_true(exists(select 1 from public.matches where asking_price = 13.9 and notes = 'Edited option'), 'respondent edits own active match without creating a new option');

select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.update_own_match(pg_temp.match_id_for('c4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002',true),'b4000000-0000-4000-8000-000000000001',14,null,null,null,null,null)$$, 'broker cannot edit another broker match');
select pg_temp.assert_throws($$select public.withdraw_own_match(pg_temp.match_id_for('c4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002',true))$$, 'broker cannot withdraw another broker match');
reset role;

-- Historical response fixtures verify read-only access after lifecycle end.
insert into public.broker_responses(id, requirement_id, broker_id) values
  ('d4000000-0000-4000-8000-000000000002','c4000000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000002'),
  ('d4000000-0000-4000-8000-000000000003','c4000000-0000-4000-8000-000000000003','a4000000-0000-4000-8000-000000000003');
insert into public.matches(id, broker_response_id, locality_id, asking_price) values
  ('e4000000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000001',9),
  ('e4000000-0000-4000-8000-000000000003','d4000000-0000-4000-8000-000000000003','b4000000-0000-4000-8000-000000000001',22);

select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.update_own_match('e4000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000001',9.5,null,null,null,null,null)$$, 'cannot edit after requirement expires');
select pg_temp.assert_throws($$select public.withdraw_own_match('e4000000-0000-4000-8000-000000000002')$$, 'cannot withdraw after requirement expires');
select pg_temp.assert_true((select count(*) = 2 from public.get_responded_requirements()), 'Responded tab lists only current broker responded requirements including history');
reset role;
select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.update_own_match('e4000000-0000-4000-8000-000000000003','b4000000-0000-4000-8000-000000000001',22.5,null,null,null,null,null)$$, 'cannot edit after requirement closes');
select pg_temp.assert_throws($$select public.withdraw_own_match('e4000000-0000-4000-8000-000000000003')$$, 'cannot withdraw after requirement closes');
reset role;

select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.withdraw_own_match(pg_temp.match_id_for('c4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002',true));
reset role;
select pg_temp.assert_true((select response_count = 2 from public.public_requirement_previews where id = 'c4000000-0000-4000-8000-000000000001'), 'withdrawing one of several options keeps broker response counted');
select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.withdraw_own_match(pg_temp.match_id_for('c4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002',true));
select public.withdraw_own_match(pg_temp.match_id_for('c4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002',true));
select pg_temp.assert_true((select count(*) = 3 from public.get_own_response('c4000000-0000-4000-8000-000000000001') where match_status = 'withdrawn'), 'withdrawn options remain visible to respondent history');
reset role;

select pg_temp.assert_true(
  (select response_count = 1 from public.public_requirement_previews where id = 'c4000000-0000-4000-8000-000000000001'),
  'withdrawing final active option removes broker from derived response count'
);
select set_config('request.jwt.claims', '{"sub":"a4000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true(
  (select count(*) = 1 from public.get_requirement_responses_for_owner('c4000000-0000-4000-8000-000000000001')),
  'withdrawn options are hidden from owner active inbox'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.get_requirement_responses_for_owner('c4000000-0000-4000-8000-000000000003')),
  'owner retains historical inbox access for closed requirement'
);
reset role;

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.broker_responses', 'select')
  and not has_table_privilege('authenticated', 'public.matches', 'select'),
  'approved brokers have no general response table access'
);

rollback;
