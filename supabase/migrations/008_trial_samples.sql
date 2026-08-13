-- ─── SAMPLES <-> FIELD TRIALS ───
-- A collector on the Field Trials page should be able to invite people and see
-- soil samples scoped to that specific trial/field — without a "Farm" record
-- having to exist first. farm_id stays as a secondary/legacy link.
alter table guest_invites add column if not exists trial_id uuid references field_trials on delete cascade;
alter table soil_samples add column if not exists trial_id uuid references field_trials on delete set null;
create index if not exists guest_invites_trial_idx on guest_invites(trial_id);
create index if not exists soil_samples_trial_idx on soil_samples(trial_id);

-- ─── GUEST ACCESS SCOPED TO A TRIAL (parallel to guest_farm_access) ───
create table if not exists guest_trial_access (
  id uuid primary key default gen_random_uuid(),
  guest_user_id uuid references auth.users on delete cascade,
  trial_id uuid references field_trials on delete cascade,
  invite_id uuid references guest_invites on delete set null,
  role text default 'collector',
  created_at timestamptz default now(),
  unique(guest_user_id, trial_id)
);
alter table guest_trial_access enable row level security;
create policy "Guests see own trial access" on guest_trial_access for select using (auth.uid() = guest_user_id);
create policy "Trial owners see trial access" on guest_trial_access for all using (
  exists (select 1 from field_trials where field_trials.id = trial_id and field_trials.user_id = auth.uid())
);

-- Let trial-scoped guests insert samples against that trial, same shape as the
-- existing farm-scoped policy.
create policy "Trial guests can insert samples" on soil_samples for insert with check (
  auth.uid() = user_id and (
    exists (select 1 from field_trials where field_trials.id = trial_id and field_trials.user_id = auth.uid())
    or
    exists (select 1 from guest_trial_access where guest_trial_access.trial_id = soil_samples.trial_id and guest_trial_access.guest_user_id = auth.uid())
  )
);

-- Trial owners can see every sample logged against their trial, guest or not.
create policy "Trial owners see all trial samples" on soil_samples for select using (
  auth.uid() = user_id
  or
  exists (select 1 from field_trials where field_trials.id = trial_id and field_trials.user_id = auth.uid())
);

-- Same atomic-increment safety as farm invites.
grant execute on function increment_invite_use(uuid) to anon, authenticated;
