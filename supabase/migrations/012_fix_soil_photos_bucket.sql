-- ─── FIX: photos were never actually saving ───
-- Every photo upload silently failed because the app has been uploading to a
-- 'soil-photos' storage bucket that was never created — the client code only
-- ever checked `if (upload)` and swallowed the error, so samples saved fine
-- with health scores and GPS, just with no photo_url. This creates the
-- bucket and the policies it needs, idempotently.

insert into storage.buckets (id, name, public)
values ('soil-photos', 'soil-photos', true)
on conflict (id) do update set public = true;

-- Public bucket: anyone can view a photo via its URL (needed since sample
-- detail views, including guest viewer invites, hotlink photo_url directly).
do $$ begin
  create policy "Anyone can view soil photos" on storage.objects for select using (bucket_id = 'soil-photos');
exception when duplicate_object then null;
end $$;

-- Both real accounts and anonymous guest sessions carry role 'authenticated'
-- in Supabase auth, so this covers collectors invited via a guest link too.
do $$ begin
  create policy "Authenticated users can upload soil photos" on storage.objects for insert with check (
    bucket_id = 'soil-photos' and auth.role() = 'authenticated'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update their own soil photos" on storage.objects for update using (
    bucket_id = 'soil-photos' and owner = auth.uid()
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete their own soil photos" on storage.objects for delete using (
    bucket_id = 'soil-photos' and owner = auth.uid()
  );
exception when duplicate_object then null;
end $$;
