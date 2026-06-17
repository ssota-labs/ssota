-- Studio build artifacts bucket (private; server-side access only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-builds',
  'studio-builds',
  false,
  52428800,
  array['text/javascript', 'application/javascript', 'text/css', 'application/json']
)
on conflict (id) do nothing;

-- storage.objects already has RLS in Supabase; scope deny policies to this bucket only.
drop policy if exists "studio_builds_deny_all_select" on storage.objects;
create policy "studio_builds_deny_all_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id <> 'studio-builds');

drop policy if exists "studio_builds_deny_all_insert" on storage.objects;
create policy "studio_builds_deny_all_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id <> 'studio-builds');

drop policy if exists "studio_builds_deny_all_update" on storage.objects;
create policy "studio_builds_deny_all_update"
  on storage.objects
  for update
  to anon, authenticated
  using (bucket_id <> 'studio-builds');

drop policy if exists "studio_builds_deny_all_delete" on storage.objects;
create policy "studio_builds_deny_all_delete"
  on storage.objects
  for delete
  to anon, authenticated
  using (bucket_id <> 'studio-builds');
