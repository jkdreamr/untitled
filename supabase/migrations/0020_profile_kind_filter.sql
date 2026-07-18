-- ============================================================================
-- UNTITLED — 0020 filterable discography
-- The talent page can filter a musician's discography by track kind
-- (originals / covers / freestyles / beats). Additive: p_kind defaults to null.
-- ============================================================================

drop function if exists get_profile_pieces(citext, medium, timestamptz, uuid, int);

create or replace function get_profile_pieces(
  p_handle citext,
  p_medium medium default null,
  p_kind track_kind default null,
  p_cursor_ts timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 24
)
returns table(card jsonb, published_at timestamptz, id uuid)
language sql stable security definer set search_path = public, pg_temp as $$
  select piece_card_json(p.id), p.published_at, p.id
  from pieces p
  join profiles a on a.id = p.artist_id
  where a.handle = p_handle
    and p.status = 'active'
    and (p_medium is null or p.medium = p_medium)
    and (p_kind is null or p.track_kind = p_kind)
    and (
      p.artist_id = auth.uid()
      or p.visibility = 'public'
      or (p.visibility = 'followers' and is_following(p.artist_id))
    )
    and (p_cursor_ts is null or (p.published_at, p.id) < (p_cursor_ts, p_cursor_id))
  order by p.published_at desc, p.id desc
  limit least(greatest(p_limit, 1), 48);
$$;

grant execute on function get_profile_pieces(citext, medium, track_kind, timestamptz, uuid, int) to anon, authenticated;
