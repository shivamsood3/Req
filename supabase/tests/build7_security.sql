begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'Build 7 security test failed: %', message; end if;
  raise notice 'ok: %', message;
end;
$$;

create or replace function pg_temp.assert_throws(statement text, message text)
returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then raise notice 'ok: %', message; return;
  end;
  raise exception 'Build 7 security test failed: %', message;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'build7-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'build7-reporter@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'build7-respondent@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'build7-pending@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'build7-admin@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a7000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'build7-delete@example.com', '', now(), '{}', '{}', now(), now());

update public.profiles set full_name = 'Build 7 Owner', company_name = 'Owner Realty', mobile = '+91 99999 70001', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a7000000-0000-4000-8000-000000000001';
update public.profiles set full_name = 'Build 7 Reporter', company_name = 'Reporter Realty', mobile = '+91 99999 70002', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a7000000-0000-4000-8000-000000000002';
update public.profiles set full_name = 'Build 7 Respondent', company_name = 'Respondent Realty', mobile = '+91 99999 70003', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a7000000-0000-4000-8000-000000000003';
update public.profiles set full_name = 'Build 7 Pending', company_name = 'Pending Realty', mobile = '+91 99999 70004', primary_market = 'South Delhi', status = 'pending' where id = 'a7000000-0000-4000-8000-000000000004';
update public.profiles set full_name = 'Build 7 Admin', company_name = 'Admin Realty', mobile = '+91 99999 70005', primary_market = 'South Delhi', role = 'admin', status = 'approved', approved_at = now() where id = 'a7000000-0000-4000-8000-000000000005';
update public.profiles set full_name = 'Build 7 Delete', company_name = 'Delete Realty', mobile = '+91 99999 70006', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a7000000-0000-4000-8000-000000000006';

insert into public.localities(id, name, slug, is_active, sort_order) values
  ('b7000000-0000-4000-8000-000000000001', 'Build 7 Defence Colony', 'build7-defence-colony', true, 9971),
  ('b7000000-0000-4000-8000-000000000002', 'Build 7 GK I', 'build7-gk-i', true, 9972);

insert into public.requirements(
  id, broker_id, property_type, budget_min, budget_max, status,
  created_at, updated_at, live_since, expires_at, closed_at, renewal_count
) values
  ('c7000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 'Independent Floor', 12, 15, 'live', now() - interval '2 days', now() - interval '2 days', now() - interval '2 days', now() + interval '5 days', null, 0),
  ('c7000000-0000-4000-8000-000000000002', 'a7000000-0000-4000-8000-000000000006', 'Apartment', 8, 10, 'live', now() - interval '1 day', now() - interval '1 day', now() - interval '1 day', now() + interval '6 days', null, 1),
  ('c7000000-0000-4000-8000-000000000003', 'a7000000-0000-4000-8000-000000000002', 'Commercial', 20, 25, 'live', now(), now(), now(), now() + interval '7 days', null, 0);

insert into public.requirement_localities(requirement_id, locality_id) values
  ('c7000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001'),
  ('c7000000-0000-4000-8000-000000000002','b7000000-0000-4000-8000-000000000002'),
  ('c7000000-0000-4000-8000-000000000003','b7000000-0000-4000-8000-000000000001');

insert into public.broker_responses(id, requirement_id, broker_id, created_at, updated_at) values
  ('d7000000-0000-4000-8000-000000000001','c7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000003', now() - interval '47 hours', now() - interval '47 hours'),
  ('d7000000-0000-4000-8000-000000000002','c7000000-0000-4000-8000-000000000002','a7000000-0000-4000-8000-000000000003', now() - interval '20 hours', now() - interval '20 hours');
insert into public.matches(id, broker_response_id, locality_id, asking_price, status, withdrawn_at) values
  ('e7000000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000001',13,'active',null),
  ('e7000000-0000-4000-8000-000000000002','d7000000-0000-4000-8000-000000000001','b7000000-0000-4000-8000-000000000002',14,'active',null),
  ('e7000000-0000-4000-8000-000000000003','d7000000-0000-4000-8000-000000000002','b7000000-0000-4000-8000-000000000002',9,'active',null);
insert into public.connections(id, requirement_id, request_owner_id, responding_broker_id, created_at) values
  ('f7000000-0000-4000-8000-000000000001','c7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000003', now() - interval '45 hours');

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.reports', 'select')
  and not has_table_privilege('authenticated', 'public.reports', 'insert'),
  'report rows are not publicly browsable or directly insertable'
);

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select public.submit_report('c7000000-0000-4000-8000-000000000001','spam','Looks fake') is not null), 'approved broker can report another broker requirement');
select pg_temp.assert_true((select count(*) = 1 from public.reports), 'reporter can see exactly their own report through RLS');
select pg_temp.assert_true((select public.submit_report('c7000000-0000-4000-8000-000000000001','spam','Second submit') = (select id from public.reports where requirement_id = 'c7000000-0000-4000-8000-000000000001')), 'duplicate open report returns existing submitted state');
select pg_temp.assert_true((select count(*) = 1 from public.reports), 'duplicate open report is not duplicated');
select pg_temp.assert_throws($$select public.submit_report('c7000000-0000-4000-8000-000000000003','spam',null)$$, 'broker cannot report their own REQ');
select pg_temp.assert_true((select count(*) = 0 from public.get_admin_reports()), 'non-admin cannot read report queue');
select pg_temp.assert_true((select count(*) = 0 from public.get_admin_analytics()), 'non-admin cannot read analytics');
reset role;

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.submit_report('c7000000-0000-4000-8000-000000000001','spam',null)$$, 'pending broker cannot report');
reset role;

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.get_admin_reports()), 'admin can read report queue');
select public.moderate_report((select id from public.get_admin_reports() limit 1), 'dismiss');
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.reports where status = 'dismissed' and admin_action = 'dismissed'), 'admin can dismiss report');

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select public.submit_report('c7000000-0000-4000-8000-000000000001','misleading_information',null);
reset role;

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select public.moderate_report((select id from public.get_admin_reports() where status = 'open' limit 1), 'suspend_broker');
reset role;
select pg_temp.assert_true((select status = 'suspended' from public.profiles where id = 'a7000000-0000-4000-8000-000000000001'), 'admin can suspend broker from moderation');
select pg_temp.assert_true((select count(*) = 0 from public.public_requirement_previews where id = 'c7000000-0000-4000-8000-000000000001'), 'suspended broker live REQ leaves public feed');

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.submit_match('c7000000-0000-4000-8000-000000000003','b7000000-0000-4000-8000-000000000001',21,null,null,null,null,null)$$, 'suspended broker cannot match');
select pg_temp.assert_throws($$select public.connect_to_response('c7000000-0000-4000-8000-000000000001','a7000000-0000-4000-8000-000000000003')$$, 'suspended broker cannot connect');
reset role;

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select public.review_broker('a7000000-0000-4000-8000-000000000001','approved');
reset role;
select pg_temp.assert_true((select status = 'approved' from public.profiles where id = 'a7000000-0000-4000-8000-000000000001'), 'admin can reactivate suspended broker');
select pg_temp.assert_true((select count(*) = 1 from public.public_requirement_previews where id = 'c7000000-0000-4000-8000-000000000001'), 'reactivated broker live REQ returns to public feed');

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select public.update_admin_locality('b7000000-0000-4000-8000-000000000002','Build 7 GK I','build7-gk-i',false,9972);
reset role;

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.create_requirement(array['b7000000-0000-4000-8000-000000000002']::uuid[],'apartment',9,10,null,null,null,null,null,null,null)$$, 'disabled locality cannot be selected for new REQs');
select pg_temp.assert_true((select count(*) = 1 from public.get_own_requirements('c7000000-0000-4000-8000-000000000002') where 'Build 7 GK I' = any(locality_names)), 'historical disabled locality still displays');
select public.request_account_deletion();
reset role;

select pg_temp.assert_true((select deleted_at is not null and status = 'rejected' and full_name = 'Deleted broker' and mobile is null from public.profiles where id = 'a7000000-0000-4000-8000-000000000006'), 'own deletion anonymizes profile and revokes access');
select pg_temp.assert_true((select status = 'closed' from public.requirements where id = 'c7000000-0000-4000-8000-000000000002'), 'own deletion closes live REQs');
select pg_temp.assert_true((select count(*) = 1 from public.broker_responses where requirement_id = 'c7000000-0000-4000-8000-000000000002'), 'own deletion preserves historical response records');

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.create_requirement(array['b7000000-0000-4000-8000-000000000001']::uuid[],'floor',12,13,null,null,null,null,null,null,null)$$, 'deleted account cannot create new REQs');
reset role;

select set_config('request.jwt.claims', '{"sub":"a7000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select weekly_active_brokers >= 2 and reqs_with_response >= 2 and match_rate is not null and connection_rate is not null and median_minutes_to_first_response > 0 from public.get_admin_analytics()), 'admin analytics calculates weekly active, match rate, connection rate, and median first response');
select pg_temp.assert_true((select match_options_submitted >= 3 and responding_brokers >= 1 from public.get_admin_analytics()), 'multiple options do not distort distinct responding broker metric');
reset role;

rollback;
