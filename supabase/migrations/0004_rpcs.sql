-- ============================================================================
-- UNTITLED — 0004 read + write RPCs
-- All read paths are SECURITY DEFINER so they can (a) enforce visibility,
-- (b) mask quiet-mode counts, (c) read the revoked denormalized counters.
-- Search is a single RPC: FTS + pgvector fused with reciprocal rank fusion.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- rate limiting — sliding window keyed on the caller
-- ---------------------------------------------------------------------------
create or replace function consume_rate_limit(p_action text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  subj text := auth.uid()::text;
  used int;
begin
  if subj is null then
    return false; -- authed-only actions
  end if;
  select count(*) into used
    from rate_limits
   where subject = subj and action = p_action
     and created_at > now() - make_interval(secs => p_window_seconds);
  if used >= p_max then
    return false;
  end if;
  insert into rate_limits (subject, action) values (subj, p_action);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- piece_card_json — the canonical card shape used by every surface
-- ---------------------------------------------------------------------------
create or replace function piece_card_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when not can_view_piece(p_id) then null else
    jsonb_build_object(
      'id', p.id,
      'medium', p.medium,
      'title', p.title,
      'caption', p.caption,
      'tags', to_jsonb(p.tags),
      'visibility', p.visibility,
      'status', p.status,
      'sequence_no', p.sequence_no,
      'created_at', p.created_at,
      'published_at', p.published_at,
      'comments_closed', p.comments_closed,
      'mux_playback_id', case when p.medium = 'video' then p.mux_playback_id else null end,
      'artist', jsonb_build_object(
        'id', a.id, 'handle', a.handle, 'display_name', a.display_name,
        'avatar_path', a.avatar_path, 'quiet_mode', a.quiet_mode
      ),
      'media', coalesce((
        select jsonb_agg(jsonb_build_object(
          'kind', m.kind, 'storage_path', m.storage_path,
          'width', m.width, 'height', m.height,
          'duration_seconds', m.duration_seconds,
          'peaks', m.peaks, 'blurhash', m.blurhash,
          'mime', m.mime, 'position', m.position
        ) order by m.position, m.created_at)
        from piece_media m where m.piece_id = p.id
      ), '[]'::jsonb),
      'after', (
        select jsonb_build_object('id', ap.id, 'sequence_no', ap.sequence_no,
               'title', ap.title, 'medium', ap.medium,
               'artist_handle', aa.handle, 'artist_name', aa.display_name)
        from pieces ap join profiles aa on aa.id = ap.artist_id
        where ap.id = p.after_piece_id and ap.status = 'active'
      ),
      'after_count', (select count(*) from pieces c where c.after_piece_id = p.id and c.status = 'active'),
      'counts', jsonb_build_object(
        'reactions', case when a.quiet_mode and (auth.uid() is distinct from a.id) and not is_admin()
                          then null else p.reaction_count end,
        'comments', p.comment_count
      ),
      'viewer', jsonb_build_object(
        'reactions', coalesce((select jsonb_agg(r.kind) from reactions r where r.piece_id = p.id and r.user_id = auth.uid()), '[]'::jsonb),
        'following', coalesce(auth.uid() is not null and is_following(a.id), false),
        'is_owner', coalesce(auth.uid() = a.id, false)
      )
    ) end
  from pieces p join profiles a on a.id = p.artist_id
  where p.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- following feed — reverse-chronological, keyset paginated
-- ---------------------------------------------------------------------------
create or replace function get_following_feed(
  p_cursor_ts timestamptz default null,
  p_cursor_id uuid default null,
  p_limit int default 20
)
returns table(card jsonb, published_at timestamptz, id uuid)
language sql stable security definer set search_path = public, pg_temp as $$
  select piece_card_json(p.id), p.published_at, p.id
  from pieces p
  where p.status = 'active'
    and (
      p.artist_id = auth.uid()
      or exists (select 1 from follows f where f.follower_id = auth.uid() and f.following_id = p.artist_id)
    )
    and p.visibility in ('public', 'followers')
    and (p_cursor_ts is null or (p.published_at, p.id) < (p_cursor_ts, p_cursor_id))
  order by p.published_at desc, p.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- profile grid — pieces by handle, optional medium, keyset paginated
-- ---------------------------------------------------------------------------
create or replace function get_profile_pieces(
  p_handle citext,
  p_medium medium default null,
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
    and (
      p.artist_id = auth.uid()
      or p.visibility = 'public'
      or (p.visibility = 'followers' and is_following(p.artist_id))
    )
    and (p_cursor_ts is null or (p.published_at, p.id) < (p_cursor_ts, p_cursor_id))
  order by p.published_at desc, p.id desc
  limit least(greatest(p_limit, 1), 48);
$$;

-- ---------------------------------------------------------------------------
-- single piece
-- ---------------------------------------------------------------------------
create or replace function get_piece(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select piece_card_json(p_id);
$$;

-- pieces made "after" this one (quiet credit graph)
create or replace function get_pieces_after(p_id uuid, p_limit int default 12)
returns table(card jsonb)
language sql stable security definer set search_path = public, pg_temp as $$
  select piece_card_json(c.id)
  from pieces c
  where c.after_piece_id = p_id and c.status = 'active' and c.visibility = 'public'
  order by c.published_at desc
  limit least(greatest(p_limit, 1), 24);
$$;

-- ---------------------------------------------------------------------------
-- comments for a piece (author-joined, visibility-checked)
-- ---------------------------------------------------------------------------
create or replace function get_piece_comments(p_id uuid, p_limit int default 100)
returns table(comment jsonb)
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', c.id,
    'body', c.body,
    'created_at', c.created_at,
    'author', jsonb_build_object('handle', a.handle, 'display_name', a.display_name, 'avatar_path', a.avatar_path),
    'is_mine', coalesce(c.user_id = auth.uid(), false),
    'can_moderate', coalesce(exists (select 1 from pieces p where p.id = c.piece_id and p.artist_id = auth.uid()) or is_admin(), false)
  )
  from comments c
  join profiles a on a.id = c.user_id
  where c.piece_id = p_id and c.status = 'active' and can_view_piece(p_id)
  order by c.created_at asc
  limit least(greatest(p_limit, 1), 200);
$$;

-- masked per-reaction breakdown
create or replace function get_piece_reactions(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when not can_view_piece(p_id) then null
    when exists (
      select 1 from pieces p join profiles a on a.id = p.artist_id
      where p.id = p_id and a.quiet_mode and (auth.uid() is distinct from a.id) and not is_admin()
    ) then null
    else coalesce((
      select jsonb_object_agg(kind, n)
      from (select kind, count(*) n from reactions where piece_id = p_id group by kind) s
    ), '{}'::jsonb)
  end;
$$;

-- ---------------------------------------------------------------------------
-- toggle a reaction; returns the viewer's kinds after the toggle
-- ---------------------------------------------------------------------------
create or replace function toggle_reaction(p_id uuid, p_kind reaction_kind)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  existed boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not can_view_piece(p_id) then raise exception 'piece not visible'; end if;
  if not consume_rate_limit('react', 300, 3600) then raise exception 'rate_limited'; end if;

  select exists (select 1 from reactions where piece_id = p_id and user_id = uid and kind = p_kind) into existed;
  if existed then
    delete from reactions where piece_id = p_id and user_id = uid and kind = p_kind;
  else
    insert into reactions (piece_id, user_id, kind) values (p_id, uid, p_kind)
    on conflict do nothing;
  end if;

  return coalesce((select jsonb_agg(kind) from reactions where piece_id = p_id and user_id = uid), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- listen / view counters (owner excluded; deduped in a short window)
-- ---------------------------------------------------------------------------
create or replace function record_engagement(p_id uuid, p_kind text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  owner uuid;
begin
  select artist_id into owner from pieces where id = p_id and status = 'active';
  if owner is null then return; end if;
  if uid is not null and uid = owner then return; end if; -- don't count your own

  -- dedup per (subject, piece, kind) within 30 minutes
  if uid is not null then
    if exists (
      select 1 from rate_limits
      where subject = uid::text and action = p_kind || ':' || p_id::text
        and created_at > now() - interval '30 minutes'
    ) then return; end if;
    insert into rate_limits (subject, action) values (uid::text, p_kind || ':' || p_id::text);
  end if;

  if p_kind = 'listen' then
    update pieces set listen_count = listen_count + 1 where id = p_id;
  elsif p_kind = 'view' then
    update pieces set view_count = view_count + 1 where id = p_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- SEARCH — one RPC. Parallel FTS + pgvector, fused with RRF (k = 60).
-- Vectors arrive as text and are cast, so PostgREST needs no vector type binding.
-- Graceful: no embedding -> FTS only; empty query + embedding -> vector only.
-- ---------------------------------------------------------------------------
create or replace function search_pieces(
  p_query text default '',
  p_query_emb text default null,       -- 1536-dim (Gemini) as '[...]'
  p_query_emb_small text default null, -- 384-dim (gte-small) as '[...]'
  p_media medium[] default null,
  p_tags text[] default null,
  p_limit int default 24
)
returns table(card jsonb, score real)
language sql stable security definer set search_path = public, pg_temp as $$
  with params as (
    select nullif(trim(p_query), '') as q,
           case when p_query_emb is not null then p_query_emb::extensions.vector(1536) end as emb,
           case when p_query_emb_small is not null then p_query_emb_small::extensions.vector(384) end as emb_s
  ),
  q_fts as (
    select ps.piece_id, row_number() over (
             order by ts_rank_cd(ps.fts, websearch_to_tsquery('english', (select q from params))) desc, p.published_at desc
           ) as r
    from piece_search ps
    join pieces p on p.id = ps.piece_id
    where (select q from params) is not null
      and ps.fts @@ websearch_to_tsquery('english', (select q from params))
      and p.status = 'active' and p.visibility = 'public'
      and (p_media is null or p.medium = any(p_media))
      and (p_tags is null or p.tags && p_tags)
    limit 120
  ),
  q_vec as (
    select s.piece_id, row_number() over (order by s.dist) as r
    from (
      select ps.piece_id, ps.embedding OPERATOR(extensions.<=>) (select emb from params) as dist
      from piece_search ps
      join pieces p on p.id = ps.piece_id
      where (select emb from params) is not null and ps.embedding is not null
        and p.status = 'active' and p.visibility = 'public'
        and (p_media is null or p.medium = any(p_media))
        and (p_tags is null or p.tags && p_tags)
      order by ps.embedding OPERATOR(extensions.<=>) (select emb from params)
      limit 120
    ) s
  ),
  q_vec_s as (
    select s.piece_id, row_number() over (order by s.dist) as r
    from (
      select ps.piece_id, ps.embedding_small OPERATOR(extensions.<=>) (select emb_s from params) as dist
      from piece_search ps
      join pieces p on p.id = ps.piece_id
      where (select emb_s from params) is not null and ps.embedding_small is not null
        and p.status = 'active' and p.visibility = 'public'
        and (p_media is null or p.medium = any(p_media))
        and (p_tags is null or p.tags && p_tags)
      order by ps.embedding_small OPERATOR(extensions.<=>) (select emb_s from params)
      limit 120
    ) s
  ),
  fused as (
    select pid,
           sum(1.0 / (60 + r))::real as score
    from (
      select piece_id as pid, r from q_fts
      union all
      select piece_id, r from q_vec
      union all
      select piece_id, r from q_vec_s
    ) u
    group by pid
  )
  select piece_card_json(pid), score
  from fused
  order by score desc, pid
  limit least(greatest(p_limit, 1), 48);
$$;

grant execute on function search_pieces(text, text, text, medium[], text[], int) to anon, authenticated;
grant execute on function get_following_feed(timestamptz, uuid, int) to authenticated;
grant execute on function get_profile_pieces(citext, medium, timestamptz, uuid, int) to anon, authenticated;
grant execute on function get_piece(uuid) to anon, authenticated;
grant execute on function get_pieces_after(uuid, int) to anon, authenticated;
grant execute on function get_piece_comments(uuid, int) to anon, authenticated;
grant execute on function get_piece_reactions(uuid) to anon, authenticated;
grant execute on function piece_card_json(uuid) to anon, authenticated;
grant execute on function toggle_reaction(uuid, reaction_kind) to authenticated;
grant execute on function record_engagement(uuid, text) to anon, authenticated;
grant execute on function consume_rate_limit(text, int, int) to authenticated;
