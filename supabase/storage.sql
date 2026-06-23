-- supabase/storage.sql
-- HOSTED-ONLY. Run this in the Supabase SQL Editor (the storage schema only
-- exists on a real Supabase project, not on plain Postgres, so it is NOT part
-- of the numbered migrations / local test suite).
--
-- Creates the private bucket for document images (Section 5.7) and owner-scoped
-- RLS so a user can only touch files under their own  {user_id}/...  prefix.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Files are stored as  documents/{user_id}/{doc_id}.jpg  — the first path
-- segment must equal the caller's auth.uid().
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'doc_images_owner_read') then
    create policy doc_images_owner_read on storage.objects
      for select to authenticated
      using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'doc_images_owner_insert') then
    create policy doc_images_owner_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'doc_images_owner_delete') then
    create policy doc_images_owner_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end$$;
