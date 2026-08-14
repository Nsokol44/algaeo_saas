-- ─── VIEW-ONLY TRIAL INVITES ───
-- Until now, guest_trial_access only ever granted INSERT on soil_samples, and
-- only for the guest's own rows — there was no way to invite someone purely
-- to look at a trial's points and data. This adds a `role` to the invite
-- itself, and broadens read access for anyone holding trial access (whatever
-- their role) to the full trial: every sample, every entry, not just their own.

alter table guest_invites add column if not exists role text not null default 'collector';
do $$ begin
  alter table guest_invites add constraint guest_invites_role_check check (role in ('collector','viewer'));
exception when duplicate_object then null;
end $$;

-- A collector should also be able to see the whole trial's picture (that's
-- the "work collectively" point of inviting someone), not just what they
-- personally dropped a pin on — so this isn't gated by role.
create policy "Trial guests can view all trial samples" on soil_samples for select using (
  exists (
    select 1 from guest_trial_access
    where guest_trial_access.trial_id = soil_samples.trial_id
      and guest_trial_access.guest_user_id = auth.uid()
  )
);

create policy "Trial guests can view trial entries" on trial_entries for select using (
  exists (
    select 1 from guest_trial_access
    where guest_trial_access.trial_id = trial_entries.trial_id
      and guest_trial_access.guest_user_id = auth.uid()
  )
);

create policy "Trial guests can view the trial itself" on field_trials for select using (
  exists (
    select 1 from guest_trial_access
    where guest_trial_access.trial_id = field_trials.id
      and guest_trial_access.guest_user_id = auth.uid()
  )
);
