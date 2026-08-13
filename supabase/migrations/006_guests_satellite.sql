-- ─── GUEST INVITE LINKS ───
create table if not exists guest_invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  farm_id uuid references farms on delete cascade,
  created_by uuid references auth.users on delete cascade,
  label text, -- e.g. "Field Day April 2026"
  expires_at timestamptz default (now() + interval '30 days'),
  max_uses integer default 50,
  use_count integer default 0,
  active boolean default true,
  created_at timestamptz default now()
);
alter table guest_invites enable row level security;
create policy "Owners manage invites" on guest_invites for all using (auth.uid() = created_by);

-- ─── GUEST ACCOUNTS ───
-- guests sign up via magic link and get limited access
-- we track which farms they can collect for
create table if not exists guest_farm_access (
  id uuid primary key default gen_random_uuid(),
  guest_user_id uuid references auth.users on delete cascade,
  farm_id uuid references farms on delete cascade,
  invite_id uuid references guest_invites on delete set null,
  role text default 'collector', -- collector only for now
  created_at timestamptz default now(),
  unique(guest_user_id, farm_id)
);
alter table guest_farm_access enable row level security;
create policy "Guests see own access" on guest_farm_access for select using (auth.uid() = guest_user_id);
create policy "Farm owners see access" on guest_farm_access for all using (
  exists (select 1 from farms where farms.id = farm_id and farms.user_id = auth.uid())
);

-- Allow guests to insert soil samples for farms they have access to
create policy "Guests can insert samples" on soil_samples for insert with check (
  auth.uid() = user_id and (
    -- own farm
    exists (select 1 from farms where farms.id = farm_id and farms.user_id = auth.uid())
    or
    -- guest access
    exists (select 1 from guest_farm_access where guest_farm_access.farm_id = soil_samples.farm_id and guest_farm_access.guest_user_id = auth.uid())
  )
);

-- Farm owners can see samples collected by guests on their farms
create policy "Farm owners see all farm samples" on soil_samples for select using (
  auth.uid() = user_id
  or
  exists (select 1 from farms where farms.id = farm_id and farms.user_id = auth.uid())
);

-- ─── SATELLITE CONFIG per farm ───
alter table farms add column if not exists sentinel_hub_instance_id text;
alter table farms add column if not exists sentinel_hub_client_id text;
alter table farms add column if not exists field_boundary jsonb; -- GeoJSON polygon
