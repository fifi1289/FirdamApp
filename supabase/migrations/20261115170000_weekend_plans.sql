-- Weekend programs: real places from OpenStreetMap (parks, museums, beaches,
-- playgrounds, libraries...) kept per 0.2° map tile like the halal map, and the
-- programs families make from them.

create table if not exists public.outing_places (
  key text primary key,
  tile text not null,
  name text not null,
  kind text not null,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  website text,
  opening_hours text,
  -- 'no' = free entry, 'yes' = paid, null = not known (never shown as free)
  fee text,
  indoor boolean not null default false,
  for_kids boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists outing_places_tile on public.outing_places (tile);
create index if not exists outing_places_latlng on public.outing_places (latitude, longitude);
alter table public.outing_places enable row level security;
create policy outing_places_read on public.outing_places for select using (true);

create table if not exists public.outing_areas (
  tile text primary key,
  south double precision not null,
  west double precision not null,
  north double precision not null,
  east double precision not null,
  requested_at timestamptz,
  fetched_at timestamptz
);
alter table public.outing_areas enable row level security;

create table if not exists public.weekend_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  options jsonb not null,
  plan jsonb not null
);
create index if not exists weekend_plans_user on public.weekend_plans (user_id, created_at desc);
alter table public.weekend_plans enable row level security;
create policy weekend_plans_own_select on public.weekend_plans for select using ((select auth.uid()) = user_id);
create policy weekend_plans_own_delete on public.weekend_plans for delete using ((select auth.uid()) = user_id);

create policy require_2fa_when_enabled on public.weekend_plans as restrictive for all to authenticated using ((select public.mfa_satisfied()));
