-- ============================================================================
-- UNTITLED — 0008 words body
-- The text OF a words-piece (lyrics, poem, fragment, prose), also used for the
-- words+sound / words+image pairings. Separate from the optional <=280 caption.
-- ============================================================================

alter table pieces
  add column body text check (body is null or char_length(body) <= 2000);

-- surface `body` on the canonical card and include it in the quiet-mode/visibility logic
create or replace function piece_card_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when not can_view_piece(p_id) then null else
    jsonb_build_object(
      'id', p.id, 'medium', p.medium, 'title', p.title, 'caption', p.caption, 'body', p.body,
      'tags', to_jsonb(p.tags), 'visibility', p.visibility, 'status', p.status,
      'sequence_no', p.sequence_no, 'created_at', p.created_at, 'published_at', p.published_at,
      'comments_closed', p.comments_closed,
      'mux_playback_id', case when p.medium = 'video' then p.mux_playback_id else null end,
      'artist', jsonb_build_object('id', a.id, 'handle', a.handle, 'display_name', a.display_name,
        'avatar_path', a.avatar_path, 'quiet_mode', a.quiet_mode),
      'media', coalesce((
        select jsonb_agg(jsonb_build_object('kind', m.kind, 'storage_path', m.storage_path,
          'width', m.width, 'height', m.height, 'duration_seconds', m.duration_seconds,
          'peaks', m.peaks, 'blurhash', m.blurhash, 'mime', m.mime, 'position', m.position)
          order by m.position, m.created_at)
        from piece_media m where m.piece_id = p.id), '[]'::jsonb),
      'after', (
        select jsonb_build_object('id', ap.id, 'sequence_no', ap.sequence_no, 'title', ap.title,
               'medium', ap.medium, 'artist_handle', aa.handle, 'artist_name', aa.display_name)
        from pieces ap join profiles aa on aa.id = ap.artist_id
        where ap.id = p.after_piece_id and ap.status = 'active'),
      'after_count', (select count(*) from pieces c where c.after_piece_id = p.id and c.status = 'active'),
      'counts', jsonb_build_object(
        'reactions', case when a.quiet_mode and (auth.uid() is distinct from a.id) and not is_admin()
                          then null else p.reaction_count end,
        'comments', p.comment_count),
      'viewer', jsonb_build_object(
        'reactions', coalesce((select jsonb_agg(r.kind) from reactions r where r.piece_id = p.id and r.user_id = auth.uid()), '[]'::jsonb),
        'following', coalesce(auth.uid() is not null and is_following(a.id), false),
        'is_owner', coalesce(auth.uid() = a.id, false))
    ) end
  from pieces p join profiles a on a.id = p.artist_id
  where p.id = p_id;
$$;
