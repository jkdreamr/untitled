-- ============================================================================
-- UNTITLED — 0014 column-level privilege hardening (SECURITY FIX)
-- A table-level GRANT overrides column-level REVOKEs, so the revokes in 0003/
-- 0011 were ineffective: authenticated could UPDATE profiles.role/suspended
-- (privilege escalation) and read the quiet-mode count columns. Fix: drop the
-- table-level SELECT/INSERT/UPDATE grants and grant only the allowed columns.
-- SECURITY DEFINER RPCs, triggers, and service_role are unaffected (owner/full).
-- ============================================================================

-- ---- pieces: hide count columns; block writes to counters/sequence/artist ----
revoke select, insert, update on pieces from anon, authenticated;

grant select (
  id, artist_id, medium, title, caption, body, tags, visibility, after_piece_id,
  sequence_no, status, attested, comments_closed, mux_asset_id, mux_playback_id,
  published_at, created_at, updated_at
) on pieces to anon, authenticated;

grant insert (
  id, artist_id, medium, title, caption, body, tags, visibility, after_piece_id,
  attested, status, comments_closed, mux_asset_id, mux_playback_id, published_at
) on pieces to authenticated;

grant update (
  title, caption, body, tags, visibility, after_piece_id, comments_closed,
  status, mux_asset_id, mux_playback_id, updated_at
) on pieces to authenticated;

-- delete stays table-level (RLS gates the rows)
grant delete on pieces to authenticated;

-- ---- profiles: block role / suspended / counters / piece_seq writes ----------
revoke insert, update on profiles from authenticated;

grant insert (
  id, handle, display_name, bio, links, interests, avatar_path, quiet_mode,
  onboarded, pinned_piece_id
) on profiles to authenticated;

grant update (
  handle, display_name, bio, links, interests, avatar_path, quiet_mode,
  onboarded, pinned_piece_id, updated_at
) on profiles to authenticated;

-- SELECT on profiles stays table-level (profiles are public; role/suspended are
-- not sensitive to read). DELETE stays table-level (RLS restricts to self/admin).
