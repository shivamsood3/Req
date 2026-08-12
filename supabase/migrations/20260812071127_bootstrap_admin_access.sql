begin;

update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where lower(email) = 'shivam@theantialias.com';

insert into public.profiles (
  id,
  email,
  role,
  status,
  approved_at,
  suspended_at
)
select
  id,
  coalesce(email, ''),
  'admin'::public.broker_role,
  'approved'::public.broker_status,
  now(),
  null
from auth.users
where lower(email) = 'shivam@theantialias.com'
on conflict (id) do update set
  email = excluded.email,
  role = 'admin',
  status = 'approved',
  approved_at = coalesce(public.profiles.approved_at, now()),
  suspended_at = null,
  updated_at = now();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(coalesce(new.email, ''));
begin
  insert into public.profiles (id, email, role, status, approved_at)
  values (
    new.id,
    coalesce(new.email, ''),
    case
      when normalized_email = 'shivam@theantialias.com' then 'admin'::public.broker_role
      else 'broker'::public.broker_role
    end,
    case
      when normalized_email = 'shivam@theantialias.com' then 'approved'::public.broker_status
      else 'pending'::public.broker_status
    end,
    case when normalized_email = 'shivam@theantialias.com' then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.review_broker(p_profile_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  if p_decision not in ('pending', 'approved', 'suspended', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  update public.profiles
  set status = p_decision::public.broker_status,
      approved_at = case when p_decision = 'approved' then coalesce(approved_at, now()) else null end,
      suspended_at = case when p_decision = 'suspended' then now() else null end,
      updated_at = now()
  where id = p_profile_id
    and id <> auth.uid()
    and role = 'broker';

  if not found then raise exception 'Broker not found'; end if;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.review_broker(uuid, text) from public, anon, authenticated;
grant execute on function public.review_broker(uuid, text) to authenticated;

commit;
