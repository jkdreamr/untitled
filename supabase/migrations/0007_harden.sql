-- ============================================================================
-- UNTITLED — 0007 hardening (from Supabase security advisors)
--   * pin search_path on trigger/helper functions
--   * remove the always-true scout INSERT policy (add a minimal guard)
--   * lock down refresh_recommendations (cron/service only)
--   * account_media_manifest: signed-in callers only
-- NOTE: the remaining "SECURITY DEFINER executable by anon" advisories are by
-- design — the read RPCs ARE the public API and enforce visibility internally,
-- and is_admin/is_following/can_view_piece/storage_media_piece_id are evaluated
-- inside RLS policies as the calling role, so they must stay executable.
-- ============================================================================

create or replace function set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function is_reserved_handle(h text)
returns boolean language sql immutable set search_path = '' as $$
  select lower(h) = any (array[
    'admin','administrator','api','app','auth','about','account','settings','support',
    'scout','untitled','novum','help','home','feed','wander','explore','discover',
    'search','collections','collection','piece','pieces','profile','profiles','post',
    'posts','upload','compose','new','edit','delete','onboarding','dashboard','notifications',
    'login','logout','signin','signup','register','verify','callback','reset','me','you',
    'user','users','u','artist','artists','terms','privacy','dmca','legal','report','reports',
    'null','undefined','root','system','staff','team','mod','moderator','www','mail','ftp',
    'static','public','assets','_next','favicon'
  ]);
$$;

create or replace function assign_piece_sequence()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare next_seq integer;
begin
  update profiles set piece_seq = piece_seq + 1 where id = new.artist_id returning piece_seq into next_seq;
  if next_seq is null then raise exception 'artist profile % does not exist', new.artist_id; end if;
  new.sequence_no := next_seq;
  return new;
end;
$$;

create or replace function bump_reaction_count()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    update pieces set reaction_count = reaction_count + 1 where id = new.piece_id;
  elsif tg_op = 'DELETE' then
    update pieces set reaction_count = greatest(0, reaction_count - 1) where id = old.piece_id;
  end if;
  return null;
end;
$$;

create or replace function bump_comment_count()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' and new.status = 'active' then
    update pieces set comment_count = comment_count + 1 where id = new.piece_id;
  elsif tg_op = 'DELETE' and old.status = 'active' then
    update pieces set comment_count = greatest(0, comment_count - 1) where id = old.piece_id;
  elsif tg_op = 'UPDATE' and old.status <> new.status then
    if new.status = 'active' then
      update pieces set comment_count = comment_count + 1 where id = new.piece_id;
    elsif old.status = 'active' then
      update pieces set comment_count = greatest(0, comment_count - 1) where id = new.piece_id;
    end if;
  end if;
  return null;
end;
$$;

create or replace function bump_follow_counts()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    update profiles set following_count = following_count + 1 where id = new.follower_id;
    update profiles set follower_count = follower_count + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' then
    update profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update profiles set follower_count = greatest(0, follower_count - 1) where id = old.following_id;
  end if;
  return null;
end;
$$;

create or replace function bump_collection_item_count()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    update collections set item_count = item_count + 1, updated_at = now() where id = new.collection_id;
  elsif tg_op = 'DELETE' then
    update collections set item_count = greatest(0, item_count - 1), updated_at = now() where id = old.collection_id;
  end if;
  return null;
end;
$$;

create or replace function bump_collection_follow_count()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    update collections set follower_count = follower_count + 1 where id = new.collection_id;
  elsif tg_op = 'DELETE' then
    update collections set follower_count = greatest(0, follower_count - 1) where id = old.collection_id;
  end if;
  return null;
end;
$$;

-- scout INSERT: replace always-true with a minimal shape guard (real defense is
-- server-side zod + rate limiting; unique(email) prevents duplicates)
drop policy if exists scout_insert_any on scout_waitlist;
create policy scout_insert_guarded on scout_waitlist for insert to anon, authenticated
with check (char_length(email) between 3 and 320);

-- refresh_recommendations is a heavy mutation: cron / service_role only
revoke execute on function refresh_recommendations() from public;

-- account media manifest: signed-in callers only (still self-checks inside)
revoke execute on function account_media_manifest(uuid) from public;
grant execute on function account_media_manifest(uuid) to authenticated;
