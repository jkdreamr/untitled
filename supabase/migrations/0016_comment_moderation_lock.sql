-- ============================================================================
-- UNTITLED — 0016 comment moderation lock (from security review)
-- A comment author could revert a moderator's hide (comments_update_own had no
-- status guard). Now owners may only update their own comment while it is still
-- 'active'; once the artist/admin hides it, only the moderation policies apply.
-- ============================================================================

drop policy if exists comments_update_own on comments;
create policy comments_update_own on comments for update
  using (user_id = auth.uid() and status = 'active')
  with check (user_id = auth.uid());
