-- ============================================================================
-- UNTITLED — 0021 lock the lyric RPCs down from anon (SECURITY FIX)
-- Postgres grants EXECUTE to PUBLIC by default on function creation, and anon
-- inherits it — so the `revoke ... from anon` in 0018 was ineffective (same
-- lesson as 0015). These two functions are owner-only and must require a signed-
-- in user. Revoke from PUBLIC + anon; keep authenticated. (They already fail
-- safe — get_pending_transcription returns null and confirm_lyrics raises for a
-- null auth.uid() — this closes the surface properly.)
-- ============================================================================

revoke execute on function get_pending_transcription(uuid) from public, anon;
revoke execute on function confirm_lyrics(uuid, text, jsonb) from public, anon;

grant execute on function get_pending_transcription(uuid) to authenticated;
grant execute on function confirm_lyrics(uuid, text, jsonb) to authenticated;
