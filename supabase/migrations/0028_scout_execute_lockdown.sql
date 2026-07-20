-- ============================================================================
-- 0028 — execute lockdown for the scout/signals functions (mirrors 0015)
-- ----------------------------------------------------------------------------
-- Supabase grants EXECUTE on every new public function to anon + authenticated
-- *directly* (not only via PUBLIC), so the `revoke ... from public` lines in
-- 0023/0025/0026 did not remove those role grants. Complete the lockdown here,
-- exactly as 0015 did for the original function set: each definer function is
-- pinned to the roles that should actually reach it.
-- ============================================================================

-- refresh_artist_signals: cron / service_role only — no API role may trigger
-- this expensive nightly rebuild.
revoke execute on function refresh_artist_signals() from anon, authenticated;

-- grant_scout: authenticated only (body self-gates on is_admin()); never anon.
revoke execute on function grant_scout(uuid, text) from anon;

-- scout RPCs: authenticated only (each body self-gates on is_scout()); guests
-- have no scout access, so anon must not even reach them.
revoke execute on function scout_search_artists(text, text[], text[], text[], track_kind[], boolean, text, int) from anon;
revoke execute on function scout_artist_signals(uuid) from anon;
revoke execute on function send_scout_contact(uuid, text) from anon;

-- Intentionally left broad:
--   record_listen_progress(uuid,int) — anon + authenticated (guest telemetry).
--   is_scout() — anon + authenticated (returns false for anon), mirroring is_admin().
