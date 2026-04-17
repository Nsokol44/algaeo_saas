-- ─── SOIL SCANS (photo upload + manual review) ───
create table if not exists soil_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  farm_id uuid references farms on delete cascade,
  crop_type text,
  photo_url text,
  soil_type text,
  irrigation_type text,
  avg_rainfall_in numeric,
  usda_zone text,
  -- Calculated score fields
  health_score numeric,
  score_breakdown jsonb,
  -- Review fields (filled by Algaeo staff)
  reviewed boolean default false,
  reviewer_notes text,
  reviewed_at timestamptz,
  reviewed_by text,
  -- Notification
  feedback_email_sent boolean default false,
  created_at timestamptz default now()
);
alter table soil_scans enable row level security;
create policy "Users manage own scans" on soil_scans for all using (auth.uid() = user_id);

-- ─── PLANTING SCHEDULE (for growth stage reminders) ───
create table if not exists planting_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  farm_id uuid references farms on delete cascade,
  crop_type text not null,
  field_name text,
  planted_date date not null,
  acres numeric,
  variety text,
  -- Reminder tracking
  reminders_sent jsonb default '[]',
  created_at timestamptz default now()
);
alter table planting_schedule enable row level security;
create policy "Users manage own schedule" on planting_schedule for all using (auth.uid() = user_id);

-- ─── YIELD UPLOADS ───
create table if not exists yield_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  farm_id uuid references farms on delete cascade,
  platform text check (platform in ('fieldview','johndeere','generic')),
  season text,
  crop_type text,
  file_url text,
  parsed_data jsonb,
  avg_yield numeric,
  total_acres numeric,
  column_mapping jsonb,
  created_at timestamptz default now()
);
alter table yield_uploads enable row level security;
create policy "Users manage own yield uploads" on yield_uploads for all using (auth.uid() = user_id);

-- ─── Storage buckets (run these in Supabase dashboard Storage tab) ───
-- Create bucket: soil-photos (public: false)
-- Create bucket: yield-files (public: false)
-- Create bucket: logos (public: true)
