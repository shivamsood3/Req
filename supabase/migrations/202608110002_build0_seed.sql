begin;

insert into public.localities (name, slug, sort_order) values
  ('Defence Colony', 'defence-colony', 10),
  ('Greater Kailash I', 'greater-kailash-i', 20),
  ('Greater Kailash II', 'greater-kailash-ii', 30),
  ('New Friends Colony', 'new-friends-colony', 40),
  ('Friends Colony East', 'friends-colony-east', 50),
  ('Friends Colony West', 'friends-colony-west', 60),
  ('Panchsheel Park', 'panchsheel-park', 70),
  ('Hauz Khas', 'hauz-khas', 80),
  ('Green Park', 'green-park', 90),
  ('Safdarjung Enclave', 'safdarjung-enclave', 100),
  ('South Extension I', 'south-extension-i', 110),
  ('South Extension II', 'south-extension-ii', 120)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.requirements (
  id, broker_id, property_type, budget_min, budget_max, size_min, size_max,
  size_unit, floor_preference, buyer_type, urgency, notes, status,
  response_count, live_since, expires_at
) values
  ('b1000000-0000-4000-8000-000000000001', null, 'Independent Floor', 12, 15, 325, 500, 'sq yd', 'First floor preferred', null, 'active', null, 'live', 4, now() - interval '12 minutes', now() + interval '24 hours'),
  ('b1000000-0000-4000-8000-000000000002', null, 'Builder Floor', 7.5, 9, 250, 350, 'sq yd', 'Upper ground or first floor', null, 'active', null, 'live', 7, now() - interval '34 minutes', now() + interval '24 hours'),
  ('b1000000-0000-4000-8000-000000000003', null, 'Independent House', 24, 30, 400, 600, 'sq yd', 'Full building', null, 'active', null, 'live', 2, now() - interval '58 minutes', now() + interval '24 hours'),
  ('b1000000-0000-4000-8000-000000000004', null, 'Independent Floor', 10, 13, 350, 500, 'sq yd', 'Second floor with terrace', null, 'active', null, 'live', 5, now() - interval '87 minutes', now() + interval '24 hours')
on conflict (id) do update set
  property_type = excluded.property_type,
  budget_min = excluded.budget_min,
  budget_max = excluded.budget_max,
  size_min = excluded.size_min,
  size_max = excluded.size_max,
  size_unit = excluded.size_unit,
  floor_preference = excluded.floor_preference,
  response_count = excluded.response_count,
  live_since = excluded.live_since,
  expires_at = excluded.expires_at,
  status = 'live';

insert into public.requirement_localities (requirement_id, locality_id)
select fixture.requirement_id::uuid, l.id
from (values
  ('b1000000-0000-4000-8000-000000000001', 'defence-colony'),
  ('b1000000-0000-4000-8000-000000000002', 'greater-kailash-i'),
  ('b1000000-0000-4000-8000-000000000003', 'new-friends-colony'),
  ('b1000000-0000-4000-8000-000000000004', 'panchsheel-park')
) as fixture(requirement_id, locality_slug)
join public.localities l on l.slug = fixture.locality_slug
on conflict do nothing;

commit;
