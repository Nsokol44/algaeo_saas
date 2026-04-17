-- ─── FIELD TRIALS ───
create table if not exists field_trials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  farm_id uuid references farms on delete set null,
  planting_id uuid references planting_schedule on delete set null,
  name text not null,
  crop_type text,
  field_name text,
  acres numeric,
  started_date date,
  status text default 'active' check (status in ('active','completed','archived')),
  is_public boolean default false,
  notes text,
  created_at timestamptz default now()
);
alter table field_trials enable row level security;
create policy "Users manage own trials" on field_trials for all using (auth.uid() = user_id);
create policy "Public trials visible to all" on field_trials for select using (is_public = true);

-- ─── TRIAL ENTRIES (progress updates) ───
create table if not exists trial_entries (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid references field_trials on delete cascade,
  user_id uuid references auth.users on delete cascade,
  entry_date date not null,
  week_number integer,
  -- Photos
  photo_treated_url text,
  photo_control_url text,
  -- Plant measurements
  plant_height_in numeric,
  canopy_width_in numeric,
  leaf_color_score integer check (leaf_color_score between 1 and 10),
  vigor_score integer check (vigor_score between 1 and 10),
  stress_score integer check (stress_score between 1 and 10),
  pest_pressure integer check (pest_pressure between 1 and 10),
  estimated_yield numeric,
  yield_unit text,
  brix_reading numeric,
  stand_count integer,
  -- Conditions
  soil_temp_f numeric,
  air_temp_f numeric,
  rainfall_in numeric,
  -- Notes
  observations text,
  algaeo_applied boolean default false,
  application_method text,
  created_at timestamptz default now()
);
alter table trial_entries enable row level security;
create policy "Users manage own entries" on trial_entries
  for all using (auth.uid() = user_id);
create policy "Public trial entries visible" on trial_entries
  for select using (
    exists (
      select 1 from field_trials ft
      where ft.id = trial_entries.trial_id and ft.is_public = true
    )
  );
