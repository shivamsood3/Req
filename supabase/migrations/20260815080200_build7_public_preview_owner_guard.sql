begin;

-- Build 7 needs public previews to exclude REQs posted by suspended or
-- deleted brokers, but the public view must not require anon/profile table
-- access. Keep that owner-status check behind a small security-definer helper.
create or replace function public.is_public_feed_owner_eligible(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.status = 'approved'
      and p.deleted_at is null
  );
$$;

revoke all on function public.is_public_feed_owner_eligible(uuid) from public, anon, authenticated;
grant execute on function public.is_public_feed_owner_eligible(uuid) to anon, authenticated;

create or replace function public.is_public_feed_requirement_eligible(p_requirement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.requirements r
    join public.profiles p on p.id = r.broker_id
    where r.id = p_requirement_id
      and r.status = 'live'
      and r.expires_at > now()
      and p.status = 'approved'
      and p.deleted_at is null
  );
$$;

revoke all on function public.is_public_feed_requirement_eligible(uuid) from public, anon, authenticated;
grant execute on function public.is_public_feed_requirement_eligible(uuid) to anon, authenticated;

drop policy if exists "requirements_public_preview_read" on public.requirements;
create policy "requirements_public_preview_read" on public.requirements
for select to anon
using (
  public.is_public_feed_requirement_eligible(id)
);

drop policy if exists "requirements_approved_read" on public.requirements;
create policy "requirements_approved_read" on public.requirements
for select to authenticated
using (
  public.is_approved_user((select auth.uid()))
  and (
    broker_id = (select auth.uid())
    or (
      public.is_public_feed_requirement_eligible(id)
    )
  )
);

drop policy if exists "requirement_localities_public_preview_read" on public.requirement_localities;
create policy "requirement_localities_public_preview_read" on public.requirement_localities
for select to anon
using (
  exists (
    select 1
    from public.requirements r
    where r.id = requirement_id
      and public.is_public_feed_requirement_eligible(r.id)
  )
);

drop policy if exists "requirement_localities_approved_read" on public.requirement_localities;
create policy "requirement_localities_approved_read" on public.requirement_localities
for select to authenticated
using (
  public.is_approved_user((select auth.uid()))
  and exists (
    select 1
    from public.requirements r
    where r.id = requirement_id
      and (
        r.broker_id = (select auth.uid())
        or (
          public.is_public_feed_requirement_eligible(r.id)
        )
      )
  )
);

drop view if exists public.public_requirement_previews;
create view public.public_requirement_previews
with (security_barrier = true, security_invoker = true)
as
select
  r.id,
  array_agg(l.name order by l.sort_order, l.name)::text[] as locality_names,
  array_agg(l.slug order by l.sort_order, l.name)::text[] as locality_slugs,
  case
    when lower(trim(r.property_type)) in ('independent floor', 'builder floor', 'floor') then 'floor'
    when lower(trim(r.property_type)) in ('independent house', 'house', 'plot', 'house / plot') then 'house-plot'
    when lower(trim(r.property_type)) = 'apartment' then 'apartment'
    when lower(trim(r.property_type)) = 'commercial' then 'commercial'
    when lower(trim(r.property_type)) = 'land' then 'land'
    else 'other'
  end as property_type_key,
  r.budget_min,
  r.budget_max,
  r.size_min,
  r.size_max,
  r.size_unit,
  r.floor_preference,
  public.public_active_response_count(r.id) as response_count,
  r.live_since,
  r.updated_at
from public.requirements r
join public.requirement_localities rl on rl.requirement_id = r.id
join public.localities l on l.id = rl.locality_id
where r.status = 'live'
  and r.expires_at > now()
  and public.is_public_feed_requirement_eligible(r.id)
  and l.is_active = true
group by
  r.id, r.property_type, r.budget_min, r.budget_max, r.size_min, r.size_max,
  r.size_unit, r.floor_preference, r.live_since, r.updated_at;

revoke all on public.public_requirement_previews from public;
grant select on public.public_requirement_previews to anon, authenticated;

commit;
