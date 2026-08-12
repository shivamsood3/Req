begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'Build 5 security test failed: %', message; end if;
  raise notice 'ok: %', message;
end;
$$;

create or replace function pg_temp.assert_throws(statement text, message text)
returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then raise notice 'ok: %', message; return;
  end;
  raise exception 'Build 5 security test failed: %', message;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a5000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'build5-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a5000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'build5-respondent-one@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a5000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'build5-respondent-two@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a5000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'build5-pending@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a5000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'build5-suspended@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a5000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'build5-unrelated@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a5000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'build5-noresponse@example.com', '', now(), '{}', '{}', now(), now());

update public.profiles set full_name = 'Build 5 Owner', company_name = 'Owner Realty', mobile = '+91 99999 50001', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a5000000-0000-4000-8000-000000000001';
update public.profiles set full_name = 'Build 5 Respondent One', company_name = 'One Realty', mobile = '9999950002', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a5000000-0000-4000-8000-000000000002';
update public.profiles set full_name = 'Build 5 Respondent Two', company_name = 'Two Realty', mobile = '91 99999 50003', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a5000000-0000-4000-8000-000000000003';
update public.profiles set full_name = 'Build 5 Pending', company_name = 'Pending Realty', mobile = '+91 99999 50004', primary_market = 'South Delhi', status = 'pending' where id = 'a5000000-0000-4000-8000-000000000004';
update public.profiles set full_name = 'Build 5 Suspended', company_name = 'Suspended Realty', mobile = '+91 99999 50005', primary_market = 'South Delhi', status = 'suspended' where id = 'a5000000-0000-4000-8000-000000000005';
update public.profiles set full_name = 'Build 5 Unrelated', company_name = 'Other Realty', mobile = '+91 99999 50006', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a5000000-0000-4000-8000-000000000006';
update public.profiles set full_name = 'Build 5 No Response', company_name = 'No Response Realty', mobile = '+91 99999 50007', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a5000000-0000-4000-8000-000000000007';

insert into public.localities(id, name, slug, is_active, sort_order) values
  ('b5000000-0000-4000-8000-000000000001', 'Build 5 Defence Colony', 'build5-defence-colony', true, 9951),
  ('b5000000-0000-4000-8000-000000000002', 'Build 5 GK I', 'build5-gk-i', true, 9952);

insert into public.requirements(
  id, broker_id, property_type, budget_min, budget_max, status,
  created_at, updated_at, live_since, expires_at, closed_at
) values
  ('c5000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'Independent Floor', 12, 15, 'live', now(), now(), now(), now() + interval '6 days', null),
  ('c5000000-0000-4000-8000-000000000002', 'a5000000-0000-4000-8000-000000000001', 'Apartment', 8, 10, 'live', now() - interval '9 days', now() - interval '9 days', now() - interval '9 days', now() - interval '2 days', null),
  ('c5000000-0000-4000-8000-000000000003', 'a5000000-0000-4000-8000-000000000001', 'Commercial', 20, 25, 'closed', now() - interval '5 days', now() - interval '1 day', now() - interval '5 days', now() + interval '2 days', now() - interval '1 day'),
  ('c5000000-0000-4000-8000-000000000004', 'a5000000-0000-4000-8000-000000000001', 'Independent Floor', 18, 20, 'live', now(), now(), now(), now() + interval '5 days', null);

insert into public.requirement_localities(requirement_id, locality_id) values
  ('c5000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001'),
  ('c5000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000002'),
  ('c5000000-0000-4000-8000-000000000002','b5000000-0000-4000-8000-000000000001'),
  ('c5000000-0000-4000-8000-000000000003','b5000000-0000-4000-8000-000000000001'),
  ('c5000000-0000-4000-8000-000000000004','b5000000-0000-4000-8000-000000000002');

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.connections', 'select')
  and not has_table_privilege('anon', 'public.connections', 'insert')
  and not has_function_privilege('anon', 'public.connect_to_response(uuid,uuid)', 'execute'),
  'anonymous cannot connect or retrieve connection data'
);

select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.submit_match('c5000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000001',13.75,400,'sq yd','First','Direct','Active option');
select public.submit_match('c5000000-0000-4000-8000-000000000004','b5000000-0000-4000-8000-000000000002',18.5,null,null,null,'Direct',null);
reset role;

select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select public.submit_match('c5000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000002',14.25,null,null,null,'Prefer not to say',null);
reset role;

insert into public.broker_responses(id, requirement_id, broker_id) values
  ('d5000000-0000-4000-8000-000000000004','c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000004'),
  ('d5000000-0000-4000-8000-000000000005','c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000005'),
  ('d5000000-0000-4000-8000-000000000006','c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000006');
insert into public.matches(id, broker_response_id, locality_id, asking_price, status, withdrawn_at) values
  ('e5000000-0000-4000-8000-000000000004','d5000000-0000-4000-8000-000000000004','b5000000-0000-4000-8000-000000000001',13,'active',null),
  ('e5000000-0000-4000-8000-000000000005','d5000000-0000-4000-8000-000000000005','b5000000-0000-4000-8000-000000000001',13,'active',null),
  ('e5000000-0000-4000-8000-000000000006','d5000000-0000-4000-8000-000000000006','b5000000-0000-4000-8000-000000000001',13,'withdrawn',now());

select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000002')$$, 'pending broker cannot connect');
reset role;

select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000002')$$, 'suspended broker cannot connect');
reset role;

select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000002')$$, 'responding broker cannot initiate connect');
select pg_temp.assert_true((select count(*) = 1 from public.get_own_response('c5000000-0000-4000-8000-000000000001') where requirement_owner_mobile is null), 'respondent cannot see owner phone before connect');
reset role;

select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000002')$$, 'non-owner cannot initiate connection');
select pg_temp.assert_true((select count(*) = 0 from public.get_requirement_responses_for_owner('c5000000-0000-4000-8000-000000000001')), 'unrelated broker cannot retrieve owner inbox or contact data');
reset role;

select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) > 0 from public.get_requirement_responses_for_owner('c5000000-0000-4000-8000-000000000001') where respondent_id = 'a5000000-0000-4000-8000-000000000002' and respondent_mobile is null), 'owner cannot see respondent phone before connect');
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000001')$$, 'owner cannot connect to themselves');
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000007')$$, 'cannot connect to broker with no response');
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000006')$$, 'cannot connect if respondent has zero active options');
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000004')$$, 'cannot connect to pending respondent even with active response');
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000005')$$, 'cannot connect to suspended respondent before connection');
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000002','a5000000-0000-4000-8000-000000000002')$$, 'cannot connect on expired requirement');
select pg_temp.assert_throws($$select public.connect_to_response('c5000000-0000-4000-8000-000000000003','a5000000-0000-4000-8000-000000000002')$$, 'cannot connect on closed requirement');

select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000002');
select pg_temp.assert_true((select count(*) = 1 from public.connections where requirement_id = 'c5000000-0000-4000-8000-000000000001' and responding_broker_id = 'a5000000-0000-4000-8000-000000000002' and request_owner_id = 'a5000000-0000-4000-8000-000000000001'), 'owner can connect to broker with active response');
select pg_temp.assert_true((select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000002') = (select id from public.connections where requirement_id = 'c5000000-0000-4000-8000-000000000001' and responding_broker_id = 'a5000000-0000-4000-8000-000000000002')), 'duplicate connect returns existing connection');
select pg_temp.assert_true((select count(*) = 1 from public.connections where requirement_id = 'c5000000-0000-4000-8000-000000000001' and responding_broker_id = 'a5000000-0000-4000-8000-000000000002'), 'duplicate connect preserves one connection');
select public.connect_to_response('c5000000-0000-4000-8000-000000000001','a5000000-0000-4000-8000-000000000003');
select pg_temp.assert_true((select count(*) = 2 from public.connections where requirement_id = 'c5000000-0000-4000-8000-000000000001'), 'owner can connect to multiple distinct responding brokers');
select pg_temp.assert_true((select bool_and(respondent_mobile is not null) from public.get_requirement_responses_for_owner('c5000000-0000-4000-8000-000000000001') where connection_id is not null), 'owner sees respondent phone after connect');
reset role;

select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.get_own_response('c5000000-0000-4000-8000-000000000001') where connection_id is not null and requirement_owner_mobile = '+91 99999 50001'), 'owner phone visible to respondent after connect');
select pg_temp.assert_true((select count(*) = 1 from public.get_responded_requirements() where requirement_id = 'c5000000-0000-4000-8000-000000000001' and connection_id is not null), 'Responded tab shows connected state');
select public.withdraw_own_match((select m.id from public.matches m join public.broker_responses br on br.id = m.broker_response_id where br.requirement_id = 'c5000000-0000-4000-8000-000000000001' and br.broker_id = 'a5000000-0000-4000-8000-000000000002' and m.status = 'active' limit 1));
reset role;

select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.get_requirement_responses_for_owner('c5000000-0000-4000-8000-000000000001') where respondent_id = 'a5000000-0000-4000-8000-000000000002' and connection_id is not null), 'withdrawing matched option after connection does not delete connection');
select public.connect_to_response('c5000000-0000-4000-8000-000000000004','a5000000-0000-4000-8000-000000000002');
reset role;
update public.requirements set status = 'closed', closed_at = now() where id = 'c5000000-0000-4000-8000-000000000001';
update public.requirements set expires_at = now() - interval '1 minute' where id = 'c5000000-0000-4000-8000-000000000004';
select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) >= 1 from public.get_requirement_responses_for_owner('c5000000-0000-4000-8000-000000000001') where connection_id is not null and respondent_mobile is not null), 'connection remains after REQ closes');
select pg_temp.assert_true((select count(*) >= 1 from public.get_requirement_responses_for_owner('c5000000-0000-4000-8000-000000000004') where connection_id is not null and respondent_mobile is not null), 'connection remains after REQ expires');
reset role;

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.connections', 'select')
  and not has_table_privilege('authenticated', 'public.connections', 'insert'),
  'approved brokers have no general connection table access'
);

rollback;
