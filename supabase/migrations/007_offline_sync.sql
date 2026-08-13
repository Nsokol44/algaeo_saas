-- ─── OFFLINE SYNC SUPPORT ───
-- client_id lets the browser generate an idempotency key while offline so a retried
-- sync (e.g. the tab reloads mid-sync) never creates a duplicate sample.
alter table soil_samples add column if not exists client_id text;
alter table soil_samples add column if not exists collected_offline boolean default false;
create unique index if not exists soil_samples_client_id_idx on soil_samples(client_id) where client_id is not null;

-- Instant AI photo read (Anthropic vision) + the GPS accuracy at time of capture,
-- kept alongside the sample so the field context isn't lost.
alter table soil_samples add column if not exists ai_photo_analysis text;
alter table soil_samples add column if not exists gps_accuracy_m numeric;

-- Atomic invite-use increment so guest collectors syncing offline submissions
-- don't race each other or clobber the count with a stale read.
create or replace function increment_invite_use(invite_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update guest_invites set use_count = use_count + 1 where id = invite_id;
$$;

grant execute on function increment_invite_use(uuid) to anon, authenticated;
