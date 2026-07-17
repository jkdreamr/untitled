-- ============================================================================
-- UNTITLED — 0006 storage
-- Two private buckets. Uploads are scoped per-user-folder; reads are gated by
-- piece visibility. Everything is served through short-lived signed URLs.
--   media   : audio + processed images   {artist_id}/{piece_id}/{file}
--             image originals staged at   {artist_id}/staging/{uuid}
--   avatars : profile images             {user_id}/{file}
-- Video never touches Storage (Mux end-to-end).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', false, 52428800,
  array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/x-m4a',
        'audio/aac','audio/ogg','audio/webm','image/webp','image/jpeg','image/png',
        'image/heic','image/heif','application/octet-stream']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- helper: parse the piece_id out of a media object name (segment 2), safely
create or replace function storage_media_piece_id(object_name text)
returns uuid language sql immutable set search_path = public, pg_temp as $$
  select case
    when split_part(object_name, '/', 2) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(object_name, '/', 2)::uuid
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- media policies
-- ---------------------------------------------------------------------------
create policy media_read on storage.objects for select to anon, authenticated
using (
  bucket_id = 'media' and (
    split_part(name, '/', 1) = auth.uid()::text            -- owner (incl. staging)
    or can_view_piece(storage_media_piece_id(name))        -- visible piece media
  )
);

create policy media_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'media' and split_part(name, '/', 1) = auth.uid()::text);

create policy media_update_own on storage.objects for update to authenticated
using (bucket_id = 'media' and (split_part(name, '/', 1) = auth.uid()::text or is_admin()));

create policy media_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'media' and (split_part(name, '/', 1) = auth.uid()::text or is_admin()));

-- ---------------------------------------------------------------------------
-- avatar policies (readable by all for signing; writable only in own folder)
-- ---------------------------------------------------------------------------
create policy avatars_read on storage.objects for select to anon, authenticated
using (bucket_id = 'avatars');

create policy avatars_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

create policy avatars_update_own on storage.objects for update to authenticated
using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

create policy avatars_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (split_part(name, '/', 1) = auth.uid()::text or is_admin()));
