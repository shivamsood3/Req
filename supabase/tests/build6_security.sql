begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'Build 6 security test failed: %', message; end if;
  raise notice 'ok: %', message;
end;
$$;

create or replace function pg_temp.assert_throws(statement text, message text)
returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then raise notice 'ok: %', message; return;
  end;
  raise exception 'Build 6 security test failed: %', message;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'build6-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'build6-respondent-one@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'build6-respondent-two@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'build6-pending@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'build6-suspended@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'build6-admin@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'build6-other@example.com', '', now(), '{}', '{}', now(), now());

update public.profiles set full_name = 'Build 6 Owner', company_name = 'Owner Realty', mobile = '+91 99999 60001', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a6000000-0000-4000-8000-000000000001';
update public.profiles set full_name = 'Build 6 Respondent One', company_name = 'One Realty', mobile = '+91 99999 60002', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a6000000-0000-4000-8000-000000000002';
update public.profiles set full_name = 'Build 6 Respondent Two', company_name = 'Two Realty', mobile = '+91 99999 60003', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a6000000-0000-4000-8000-000000000003';
update public.profiles set full_name = 'Build 6 Pending', company_name = 'Pending Realty', mobile = '+91 99999 60004', primary_market = 'South Delhi', status = 'pending' where id = 'a6000000-0000-4000-8000-000000000004';
update public.profiles set full_name = 'Build 6 Suspended', company_name = 'Suspended Realty', mobile = '+91 99999 60005', primary_market = 'South Delhi', status = 'suspended' where id = 'a6000000-0000-4000-8000-000000000005';
update public.profiles set full_name = 'Build 6 Admin', company_name = 'Admin Realty', mobile = '+91 99999 60006', primary_market = 'South Delhi', role = 'admin', status = 'approved', approved_at = now() where id = 'a6000000-0000-4000-8000-000000000006';
update public.profiles set full_name = 'Build 6 Other', company_name = 'Other Realty', mobile = '+91 99999 60007', primary_market = 'South Delhi', status = 'approved', approved_at = now() where id = 'a6000000-0000-4000-8000-000000000007';

insert into public.localities(id, name, slug, is_active, sort_order) values
  ('b6000000-0000-4000-8000-000000000001', 'Build 6 Defence Colony', 'build6-defence-colony', true, 9961),
  ('b6000000-0000-4000-8000-000000000002', 'Build 6 Greater Kailash I', 'build6-gk-i', true, 9962);

insert into public.requirements(
  id, broker_id, property_type, budget_min, budget_max, status,
  created_at, updated_at, live_since, expires_at, closed_at
) values
  ('c6000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'Independent Floor', 12, 15, 'live', now(), now(), now(), now() + interval '6 days', null),
  ('c6000000-0000-4000-8000-000000000002', 'a6000000-0000-4000-8000-000000000001', 'Apartment', 8, 10, 'live', now(), now(), now(), now() + interval '12 hours', null),
  ('c6000000-0000-4000-8000-000000000003', 'a6000000-0000-4000-8000-000000000001', 'Commercial', 20, 25, 'closed', now(), now(), now(), now() + interval '12 hours', now()),
  ('c6000000-0000-4000-8000-000000000004', 'a6000000-0000-4000-8000-000000000001', 'House / Plot', 18, 20, 'live', now(), now(), now(), now() - interval '1 hour', null);

insert into public.requirement_localities(requirement_id, locality_id) values
  ('c6000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001'),
  ('c6000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000002'),
  ('c6000000-0000-4000-8000-000000000002','b6000000-0000-4000-8000-000000000001'),
  ('c6000000-0000-4000-8000-000000000003','b6000000-0000-4000-8000-000000000001'),
  ('c6000000-0000-4000-8000-000000000004','b6000000-0000-4000-8000-000000000001');

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.notifications', 'select')
  and not has_table_privilege('anon', 'public.notifications', 'insert')
  and not has_table_privilege('authenticated', 'public.notifications', 'insert')
  and not has_function_privilege('anon', 'public.create_notification(uuid, public.notification_type, text, text, text, uuid, text)', 'execute'),
  'anonymous visitors and regular brokers cannot create or browse notification records'
);

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.push_subscriptions', 'select')
  and has_table_privilege('authenticated', 'public.push_subscriptions', 'insert')
  and has_table_privilege('authenticated', 'public.push_subscriptions', 'delete'),
  'push subscriptions are authenticated owner-scoped records'
);

select set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.submit_match('c6000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000001',13.75,400,'sq yd','First','Direct','Active option');
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.notifications where type = 'new_match' and entity_id = 'c6000000-0000-4000-8000-000000000001'), 'first active option from a broker creates one owner match notification');

select set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.submit_match('c6000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000002',14.25,425,'sq yd','Second','Direct','Second option');
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.notifications where type = 'new_match' and entity_id = 'c6000000-0000-4000-8000-000000000001'), 'second active option from the same broker does not duplicate owner notification');

select set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select public.submit_match('c6000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000002',14.5,null,null,null,'Prefer not to say',null);
reset role;
select pg_temp.assert_true((select count(*) = 2 from public.notifications where type = 'new_match' and entity_id = 'c6000000-0000-4000-8000-000000000001'), 'first active option from a second broker creates another owner notification');

select set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 2 from public.notifications), 'requirement owner can select only their own match notifications');
select pg_temp.assert_true((select public.get_unread_notification_count() = 2), 'unread count is scoped to current broker');
select pg_temp.assert_true((select count(*) = 1 from public.mark_notification_read((select id from public.notifications where type = 'new_match' order by created_at limit 1))), 'owner can mark their own notification read');
select pg_temp.assert_true((select count(*) = 1 from public.notifications where read_at is null), 'marking one notification read leaves other unread owner notifications');
select public.connect_to_response('c6000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000002');
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.notifications where type = 'connected' and user_id = 'a6000000-0000-4000-8000-000000000002'), 'new connection notifies responding broker');

select set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.connect_to_response('c6000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000002');
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.notifications where type = 'connected' and user_id = 'a6000000-0000-4000-8000-000000000002'), 'duplicate connection does not duplicate connected notification');

select set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.notifications), 'unrelated broker cannot select other brokers notifications');
select pg_temp.assert_true((select count(*) = 0 from public.mark_notification_read((select id from public.notifications where user_id = 'a6000000-0000-4000-8000-000000000001' limit 1))), 'unrelated broker cannot mark another broker notification read');
insert into public.push_subscriptions(user_id, endpoint, p256dh, auth)
values ('a6000000-0000-4000-8000-000000000007', 'https://push.example.test/build6-other', 'p256dh-other', 'auth-other');
select pg_temp.assert_true((select count(*) = 1 from public.push_subscriptions), 'broker can insert and read their own push subscription');
select pg_temp.assert_throws($$insert into public.push_subscriptions(user_id, endpoint, p256dh, auth) values ('a6000000-0000-4000-8000-000000000001', 'https://push.example.test/build6-owner-from-other', 'p256dh', 'auth')$$, 'broker cannot register a push subscription for another user');
reset role;

select set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.notifications where type = 'connected'), 'responding broker can select their own connected notification');
select public.mark_all_notifications_read();
select pg_temp.assert_true((select count(*) = 0 from public.notifications where user_id = 'a6000000-0000-4000-8000-000000000002' and read_at is null), 'mark all read only affects current broker notifications');
reset role;

select public.generate_req_expiring_notifications();
select pg_temp.assert_true((select count(*) = 1 from public.notifications where type = 'req_expiring' and entity_id = 'c6000000-0000-4000-8000-000000000002'), 'live REQ expiring within 24 hours creates owner reminder');
select pg_temp.assert_true((select count(*) = 0 from public.notifications where type = 'req_expiring' and entity_id in ('c6000000-0000-4000-8000-000000000003','c6000000-0000-4000-8000-000000000004')), 'closed and already expired REQs do not create expiry reminders');
select public.generate_req_expiring_notifications();
select pg_temp.assert_true((select count(*) = 1 from public.notifications where type = 'req_expiring' and entity_id = 'c6000000-0000-4000-8000-000000000002'), 'expiry reminder is idempotent for the same live cycle');
update public.requirements
set live_since = live_since + interval '1 minute',
    expires_at = now() + interval '10 hours'
where id = 'c6000000-0000-4000-8000-000000000002';
select public.generate_req_expiring_notifications();
select pg_temp.assert_true((select count(*) = 2 from public.notifications where type = 'req_expiring' and entity_id = 'c6000000-0000-4000-8000-000000000002'), 'renewed live cycle can produce a new expiry reminder');

select set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_throws($$select public.generate_req_expiring_notifications()$$, 'regular authenticated brokers cannot invoke cron reminder generation');
reset role;

select set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select public.review_broker('a6000000-0000-4000-8000-000000000004','approved');
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.notifications where type = 'access_approved' and user_id = 'a6000000-0000-4000-8000-000000000004'), 'admin approval creates access approved notification once');

select set_config('request.jwt.claims', '{"sub":"a6000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
set local role authenticated;
select public.review_broker('a6000000-0000-4000-8000-000000000004','approved');
select public.review_broker('a6000000-0000-4000-8000-000000000005','suspended');
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.notifications where type = 'access_approved' and user_id = 'a6000000-0000-4000-8000-000000000004'), 're-approving an already approved broker does not duplicate approval notification');
select pg_temp.assert_true((select count(*) = 0 from public.notifications where type = 'access_approved' and user_id = 'a6000000-0000-4000-8000-000000000005'), 'non-approval decisions do not create approval notifications');

rollback;
