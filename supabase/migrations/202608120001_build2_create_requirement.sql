begin;

-- Build 2 exposes exactly one approved-broker creation path. The caller can
-- supply requirement content, but never ownership, lifecycle, or counters.
create or replace function public.create_requirement(
  p_locality_ids uuid[],
  p_property_type_key text,
  p_budget_min numeric,
  p_budget_max numeric,
  p_size_min numeric,
  p_size_max numeric,
  p_size_unit text,
  p_floor_preference text,
  p_buyer_type text,
  p_urgency text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  published_at timestamptz := now();
  new_requirement_id uuid;
  normalized_locality_ids uuid[];
  canonical_property_type text;
  canonical_size_unit text;
  canonical_floor text;
  canonical_buyer_type text;
  canonical_urgency text;
  canonical_notes text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if not public.is_approved_user(current_user_id) then
    raise exception using errcode = '42501', message = 'Approved broker access required';
  end if;

  select array_agg(locality_id order by locality_id)
  into normalized_locality_ids
  from (
    select distinct locality_id
    from unnest(coalesce(p_locality_ids, array[]::uuid[])) as locality_id
    where locality_id is not null
  ) selected_localities;

  if coalesce(cardinality(normalized_locality_ids), 0) = 0 then
    raise exception using errcode = '22023', message = 'At least one locality is required';
  end if;

  if (
    select count(*)
    from public.localities
    where id = any(normalized_locality_ids)
      and is_active = true
  ) <> cardinality(normalized_locality_ids) then
    raise exception using errcode = '22023', message = 'A selected locality is unavailable';
  end if;

  canonical_property_type := case p_property_type_key
    when 'floor' then 'Independent Floor'
    when 'house-plot' then 'House / Plot'
    when 'apartment' then 'Apartment'
    when 'commercial' then 'Commercial'
    when 'land' then 'Land'
    when 'other' then 'Other'
    else null
  end;
  if canonical_property_type is null then
    raise exception using errcode = '22023', message = 'Invalid property type';
  end if;

  if p_budget_min is null or p_budget_min <= 0 then
    raise exception using errcode = '22023', message = 'Minimum budget must be above zero';
  end if;
  if p_budget_max is null or p_budget_max <= 0 or p_budget_max < p_budget_min then
    raise exception using errcode = '22023', message = 'Invalid budget range';
  end if;

  if p_size_min is not null and p_size_min <= 0 then
    raise exception using errcode = '22023', message = 'Minimum size must be above zero';
  end if;
  if p_size_max is not null and p_size_max <= 0 then
    raise exception using errcode = '22023', message = 'Maximum size must be above zero';
  end if;
  if p_size_min is not null and p_size_max is not null and p_size_max < p_size_min then
    raise exception using errcode = '22023', message = 'Invalid size range';
  end if;

  if p_size_min is not null or p_size_max is not null then
    canonical_size_unit := case p_size_unit
      when 'sq yd' then 'sq yd'
      when 'sq ft' then 'sq ft'
      when 'acre' then 'acre'
      else null
    end;
    if canonical_size_unit is null then
      raise exception using errcode = '22023', message = 'Invalid size unit';
    end if;
  else
    canonical_size_unit := null;
  end if;

  canonical_floor := case
    when nullif(trim(coalesce(p_floor_preference, '')), '') is null then null
    when p_floor_preference = 'Ground' then 'Ground'
    when p_floor_preference = 'First' then 'First'
    when p_floor_preference = 'Second' then 'Second'
    when p_floor_preference = 'Third' then 'Third'
    when p_floor_preference = 'Top' then 'Top'
    when p_floor_preference = 'Any' then 'Any'
    else '__invalid__'
  end;
  if canonical_floor = '__invalid__' then
    raise exception using errcode = '22023', message = 'Invalid floor preference';
  end if;

  canonical_buyer_type := case
    when nullif(trim(coalesce(p_buyer_type, '')), '') is null then null
    when p_buyer_type = 'End User' then 'End User'
    when p_buyer_type = 'Developer' then 'Developer'
    when p_buyer_type = 'Investor' then 'Investor'
    when p_buyer_type = 'Corporate' then 'Corporate'
    when p_buyer_type = 'Other' then 'Other'
    else '__invalid__'
  end;
  if canonical_buyer_type = '__invalid__' then
    raise exception using errcode = '22023', message = 'Invalid buyer type';
  end if;

  canonical_urgency := case
    when nullif(trim(coalesce(p_urgency, '')), '') is null then null
    when p_urgency = 'Immediate' then 'Immediate'
    when p_urgency = 'Active' then 'Active'
    when p_urgency = 'Flexible' then 'Flexible'
    else '__invalid__'
  end;
  if canonical_urgency = '__invalid__' then
    raise exception using errcode = '22023', message = 'Invalid urgency';
  end if;

  canonical_notes := nullif(trim(coalesce(p_notes, '')), '');
  if char_length(coalesce(canonical_notes, '')) > 500 then
    raise exception using errcode = '22023', message = 'Notes exceed 500 characters';
  end if;

  insert into public.requirements (
    broker_id,
    property_type,
    budget_min,
    budget_max,
    size_min,
    size_max,
    size_unit,
    floor_preference,
    buyer_type,
    urgency,
    notes,
    status,
    response_count,
    created_at,
    updated_at,
    live_since,
    expires_at,
    closed_at,
    renewal_count
  ) values (
    current_user_id,
    canonical_property_type,
    p_budget_min,
    p_budget_max,
    p_size_min,
    p_size_max,
    canonical_size_unit,
    canonical_floor,
    canonical_buyer_type,
    canonical_urgency,
    canonical_notes,
    'live',
    0,
    published_at,
    published_at,
    published_at,
    published_at + interval '7 days',
    null,
    0
  )
  returning id into new_requirement_id;

  insert into public.requirement_localities (requirement_id, locality_id)
  select new_requirement_id, locality_id
  from unnest(normalized_locality_ids) as locality_id;

  return new_requirement_id;
end;
$$;

revoke all on function public.create_requirement(
  uuid[], text, numeric, numeric, numeric, numeric, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_requirement(
  uuid[], text, numeric, numeric, numeric, numeric, text, text, text, text, text
) to authenticated;

commit;
