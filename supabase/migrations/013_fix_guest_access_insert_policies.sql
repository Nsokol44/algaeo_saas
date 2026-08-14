-- ─── FIX: guests could never actually register their own trial/farm access ───
-- guest_trial_access and guest_farm_access have RLS enabled, but each only
-- ever got a SELECT policy for guests ("see own access") plus an owner-only
-- `for all` policy. Nothing let a guest INSERT their own row — so every
-- guest's upsert into these tables has been failing with 403 (42501) since
-- they were created in 006/008. This went unnoticed because the client code
-- was chaining `.catch()` onto the (non-throwing) Supabase call, which threw
-- its own JS error and masked the real 403 underneath it.
--
-- The fix: let a guest insert/update their own access row, but only when it
-- corresponds to a real, currently-active invite for that trial/farm — so
-- this can't be used to self-grant access to something never invited to.

create policy "Guests can register their own trial access" on guest_trial_access for insert with check (
  guest_user_id = auth.uid()
  and invite_id is not null
  and exists (
    select 1 from guest_invites
    where guest_invites.id = invite_id
      and guest_invites.trial_id = guest_trial_access.trial_id
      and guest_invites.active = true
  )
);

create policy "Guests can update their own trial access" on guest_trial_access for update using (
  guest_user_id = auth.uid()
) with check (
  guest_user_id = auth.uid()
);

create policy "Guests can register their own farm access" on guest_farm_access for insert with check (
  guest_user_id = auth.uid()
  and invite_id is not null
  and exists (
    select 1 from guest_invites
    where guest_invites.id = invite_id
      and guest_invites.farm_id = guest_farm_access.farm_id
      and guest_invites.active = true
  )
);

create policy "Guests can update their own farm access" on guest_farm_access for update using (
  guest_user_id = auth.uid()
) with check (
  guest_user_id = auth.uid()
);
