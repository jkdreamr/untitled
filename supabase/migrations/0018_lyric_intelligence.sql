-- ============================================================================
-- UNTITLED — 0018 lyric intelligence + lyric-aware search
-- Two owner-only RPCs power the transcribe → confirm loop (raw transcription is
-- never exposed publicly — only the artist who owns the track can review it),
-- and search_pieces is recreated to (a) return a lyric-match indicator and which
-- retrieval arm won, and (b) filter by track kind / vocals for talent discovery.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- get_pending_transcription — owner-only view of the raw whisper output so the
-- artist can review and confirm it. Returns null to everyone else. This is the
-- ONLY path that surfaces piece_search.transcript(_segments), and it is gated on
-- ownership, so unconfirmed transcription never reaches the public.
-- ---------------------------------------------------------------------------
create or replace function get_pending_transcription(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when exists (
    select 1 from pieces p where p.id = p_id and p.artist_id = auth.uid()
  ) then (
    select jsonb_build_object(
      'transcript', ps.transcript,
      'segments', coalesce(ps.transcript_segments, '[]'::jsonb),
      'already_confirmed', coalesce(pp.lyrics_source = 'transcribed_confirmed', false),
      'has_lyrics', pp.lyrics is not null
    )
    from piece_search ps join pieces pp on pp.id = ps.piece_id
    where ps.piece_id = p_id
  ) else null end;
$$;

-- ---------------------------------------------------------------------------
-- confirm_lyrics — the artist confirms (optionally edited) lyrics + the synced
-- segments they trust. Sets lyrics_source = 'transcribed_confirmed', which is
-- what makes the lyrics public. Re-enqueues embed + index so the confirmed words
-- fold into the vector + FTS. Owner-only.
-- ---------------------------------------------------------------------------
create or replace function confirm_lyrics(p_id uuid, p_lyrics text, p_segments jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from pieces where id = p_id and artist_id = uid) then
    raise exception 'not your track';
  end if;
  if p_lyrics is null or length(trim(p_lyrics)) = 0 then
    raise exception 'empty lyrics';
  end if;

  update pieces set
    lyrics = left(p_lyrics, 4000),
    lyric_segments = case
      when jsonb_typeof(p_segments) = 'array' and jsonb_array_length(p_segments) > 0 then p_segments
      else null end,
    lyrics_source = 'transcribed_confirmed'
  where id = p_id;
  -- the pieces_refresh_doc trigger rebuilds doc + lyrics_text on this update.

  -- re-embed + re-index now that the confirmed words exist
  insert into enrichment_jobs (piece_id, stage, status)
  values (p_id, 'embed', 'pending'), (p_id, 'index', 'pending')
  on conflict (piece_id, stage) do update
    set status = 'pending', run_after = now(), attempts = 0, last_error = null;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- search_pieces (recreated) — FTS + pgvector fused with RRF (k = 60), now with:
--   • track-kind and has_vocals filters (talent discovery)
--   • lyric_hit  — did the query match this track's confirmed lyrics?
--   • semantic   — did a vector arm surface it? (so the UI can say WHY)
-- Lyrics already carry weight A in the generated fts (migration 0017).
-- ---------------------------------------------------------------------------
drop function if exists search_pieces(text, text, text, medium[], text[], int);

create or replace function search_pieces(
  p_query text default '',
  p_query_emb text default null,       -- 1536-dim (Gemini) as '[...]'
  p_query_emb_small text default null, -- 384-dim (gte-small) as '[...]'
  p_media medium[] default null,
  p_kinds track_kind[] default null,
  p_has_vocals boolean default null,
  p_tags text[] default null,
  p_limit int default 24
)
returns table(card jsonb, score real, lyric_hit boolean, semantic boolean)
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
      and (p_kinds is null or p.track_kind = any(p_kinds))
      and (p_has_vocals is null or p.has_vocals = p_has_vocals)
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
        and (p_kinds is null or p.track_kind = any(p_kinds))
        and (p_has_vocals is null or p.has_vocals = p_has_vocals)
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
        and (p_kinds is null or p.track_kind = any(p_kinds))
        and (p_has_vocals is null or p.has_vocals = p_has_vocals)
        and (p_tags is null or p.tags && p_tags)
      order by ps.embedding_small OPERATOR(extensions.<=>) (select emb_s from params)
      limit 120
    ) s
  ),
  fused as (
    select pid,
           sum(1.0 / (60 + r))::real as score,
           bool_or(src <> 'fts') as via_vec
    from (
      select piece_id as pid, r, 'fts' as src from q_fts
      union all
      select piece_id, r, 'vec' from q_vec
      union all
      select piece_id, r, 'vec_s' from q_vec_s
    ) u
    group by pid
  )
  select
    piece_card_json(f.pid),
    f.score,
    ((select q from params) is not null
      and p.lyrics is not null
      and to_tsvector('english', p.lyrics) @@ websearch_to_tsquery('english', (select q from params))) as lyric_hit,
    f.via_vec as semantic
  from fused f
  join pieces p on p.id = f.pid
  order by f.score desc, f.pid
  limit least(greatest(p_limit, 1), 48);
$$;

grant execute on function search_pieces(text, text, text, medium[], track_kind[], boolean, text[], int) to anon, authenticated;
grant execute on function get_pending_transcription(uuid) to authenticated;
grant execute on function confirm_lyrics(uuid, text, jsonb) to authenticated;

revoke execute on function get_pending_transcription(uuid) from anon;
revoke execute on function confirm_lyrics(uuid, text, jsonb) from anon;
