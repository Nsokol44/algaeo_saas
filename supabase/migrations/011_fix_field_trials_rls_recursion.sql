-- ─── FIX: infinite recursion between field_trials <-> guest_trial_access RLS ───
-- 010_trial_viewer_invites.sql added a policy on field_trials that checks
-- guest_trial_access, but guest_trial_access already had a policy (from
-- 008_trial_samples.sql) that checks field_trials. Postgres detects that
-- cycle at plan time and refuses the query entirely (error 42P17) — which
-- broke every field_trials read, including the owner's own trial list.
--
-- Fix: route both checks through SECURITY DEFINER helper functions. A
-- function call is an opaque boundary to the planner, so it no longer
-- inlines/expands both tables' RLS into one self-referential query.
-- This is Postgres/Supabase's standard fix for this exact error class.

create or replace function public.has_trial_guest_access(check_trial_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from guest_trial_access
    where trial_id = check_trial_id and guest_user_id = auth.uid()
  );
$$;
grant execute on function public.has_trial_guest_access(uuid) to anon, authenticated;

create or replace function public.is_trial_owner(check_trial_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from field_trials
    where id = check_trial_id and user_id = auth.uid()
  );
$$;
grant execute on function public.is_trial_owner(uuid) to anon, authenticated;

-- Re-point both sides of the cycle at the helper functions instead of the raw
-- cross-table subqueries.
drop policy if exists "Trial guests can view the trial itself" on field_trials;
create policy "Trial guests can view the trial itself" on field_trials for select using (
  public.has_trial_guest_access(id)
);

drop policy if exists "Trial owners see trial access" on guest_trial_access;
create policy "Trial owners see trial access" on guest_trial_access for all using (
  public.is_trial_owner(trial_id)
);
