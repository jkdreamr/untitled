-- ============================================================================
-- UNTITLED — 0015 function EXECUTE lockdown (SECURITY FIX)
-- Supabase grants EXECUTE on new functions to anon/authenticated explicitly (via
-- ALTER DEFAULT PRIVILEGES), so the earlier `revoke ... from public` did NOT
-- remove those grants. Revoke from anon/authenticated explicitly:
--   * refresh_recommendations / enqueue_piece_enrichment: nobody but owner/cron
--     (refresh is an expensive O(n^2) job — anon-callable = DoS)
--   * resolve_report / suspend_user / account_media_manifest / get_my_dashboard:
--     signed-in only (they self-check inside, but drop the anon attack surface)
-- The read RPCs and RLS-helper functions (is_admin, can_view_piece, …) stay
-- anon/authenticated-executable by design — that is the public API + policy layer.
-- ============================================================================

revoke execute on function refresh_recommendations()    from anon, authenticated, public;
revoke execute on function enqueue_piece_enrichment()    from anon, authenticated, public;

revoke execute on function resolve_report(uuid, report_status)     from anon;
revoke execute on function suspend_user(uuid, boolean)             from anon;
revoke execute on function account_media_manifest(uuid)           from anon;
revoke execute on function get_my_dashboard()                     from anon;
