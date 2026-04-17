-- Enable PostGIS
create extension if not exists postgis;

-- Profiles (extended user data)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  first_name text,
  last_name text,
  farm_name text,
  state text,
  primary_crop text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Fields (with PostGIS geometry)
create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text,
  crop_type text,
  boundary geometry(Polygon, 4326),
  created_at timestamptz default now()
);

alter table fields enable row level security;
create policy "Users can manage own fields" on fields for all using (auth.uid() = user_id);

-- Crop Projections
create table if not exists crop_projections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  field_id uuid references fields on delete set null,
  crop_type text not null,
  inputs jsonb,
  outputs jsonb,
  created_at timestamptz default now()
);

alter table crop_projections enable row level security;
create policy "Users can manage own projections" on crop_projections for all using (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, farm_name, state, primary_crop)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'farm_name',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'primary_crop'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
