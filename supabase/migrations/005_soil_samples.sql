-- ─── SOIL SAMPLES ───
create table if not exists soil_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  farm_id uuid references farms on delete set null,
  field_name text,
  sample_date date not null default current_date,
  -- GPS
  lat numeric not null,
  lng numeric not null,
  location geometry(Point, 4326) generated always as (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) stored,
  -- Sample details
  depth_top_in numeric default 0,
  depth_bottom_in numeric default 6,
  crop_type text,
  -- Photo
  photo_url text,
  -- Calculated score
  health_score numeric,
  score_label text,
  -- Lab results (manual entry)
  lab_ph numeric,
  lab_om_pct numeric,
  lab_cec numeric,
  lab_nitrogen_ppm numeric,
  lab_phosphorus_ppm numeric,
  lab_potassium_ppm numeric,
  lab_calcium_ppm numeric,
  lab_magnesium_ppm numeric,
  lab_notes text,
  -- Algaeo review
  reviewed boolean default false,
  reviewer_notes text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create index if not exists soil_samples_location_idx on soil_samples using gist(location);
create index if not exists soil_samples_user_idx on soil_samples(user_id);
create index if not exists soil_samples_farm_idx on soil_samples(farm_id);

alter table soil_samples enable row level security;
create policy "Users manage own samples" on soil_samples for all using (auth.uid() = user_id);
