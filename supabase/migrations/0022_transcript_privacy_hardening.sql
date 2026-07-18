-- ============================================================================
-- UNTITLED — 0022 transcript privacy + discovery hardening (SECURITY)
-- 1. Raw, unconfirmed transcription must never influence public discovery. It
--    was being folded into `doc`, which feeds the client-queryable `fts` — a
--    match oracle over words the artist never confirmed (including lines they
--    edited OUT at confirmation). Fix: build the doc from CONFIRMED content only
--    (title/caption/lyrics/tags/cover). The raw transcript stays in piece_search
--    for owner review (get_pending_transcription) and never touches fts again.
--    Confirmed lyrics still rank weight A via lyrics_text; audio semantics still
--    come from the audio embedding (the audio is public anyway).
-- 2. get_similar_tracks now gates the subject piece on can_view_piece, so a
--    private/followers-only id can't be used to infer its neighbors.
-- 3. lyric_segments is bounded at the DB layer (count + size), closing a
--    bandwidth-amplification path that bypassed the server action.
-- Tables are empty at pivot time, so the new CHECK applies cleanly.
-- ============================================================================

-- ---- 1. doc from confirmed content only -----------------------------------
drop function if exists build_piece_doc(text, text, text, text[], text, text, text, text);

create or replace function build_piece_doc(
  p_title text, p_caption text, p_lyrics text, p_tags text[],
  p_cover_title text, p_cover_artist text
) returns text language sql immutable set search_path = '' as $$
  select nullif(trim(concat_ws(' ',
    coalesce(p_title, ''), coalesce(p_caption, ''), coalesce(p_lyrics, ''),
    coalesce(array_to_string(p_tags, ' '), ''),
    coalesce(p_cover_title, ''), coalesce(p_cover_artist, '')
  )), '');
$$;

create or replace function enqueue_piece_enrichment()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into piece_search (piece_id, doc, lyrics_text, status)
    values (
      new.id,
      build_piece_doc(new.title, new.caption, new.lyrics, new.tags,
                      new.cover_of_title, new.cover_of_artist),
      new.lyrics,
      'pending'
    )
    on conflict (piece_id) do update
      set doc = excluded.doc, lyrics_text = excluded.lyrics_text;

    insert into enrichment_jobs (piece_id, stage, status) values (new.id, 'embed', 'pending')
      on conflict (piece_id, stage) do nothing;
    insert into enrichment_jobs (piece_id, stage, status) values (new.id, 'index', 'pending')
      on conflict (piece_id, stage) do nothing;
    if new.has_vocals then
      insert into enrichment_jobs (piece_id, stage, status) values (new.id, 'transcribe', 'pending')
        on conflict (piece_id, stage) do nothing;
    end if;
  elsif tg_op = 'UPDATE' then
    update piece_search
       set doc = build_piece_doc(new.title, new.caption, new.lyrics, new.tags,
                                 new.cover_of_title, new.cover_of_artist),
           lyrics_text = new.lyrics,
           updated_at = now()
     where piece_id = new.id;
  end if;
  return null;
end;
$$;

-- ---- 2. gate get_similar_tracks on the subject's visibility ----------------
create or replace function get_similar_tracks(p_id uuid, p_limit int default 6)
returns table(card jsonb)
language sql stable security definer set search_path = public, pg_temp as $$
  with base as (select tags from pieces where id = p_id),
  nbrs as (
    select n.neighbor_id as id, n.score, 0 as tier
    from piece_neighbors n
    join pieces p on p.id = n.neighbor_id
    where n.piece_id = p_id and can_view_piece(p_id)
      and p.status = 'active' and p.visibility = 'public'
    order by n.score desc
    limit p_limit
  ),
  fallback as (
    select p.id,
           cardinality(array(select unnest(p.tags) intersect select unnest((select tags from base))))::real as score,
           1 as tier
    from pieces p
    where can_view_piece(p_id)
      and p.id <> p_id and p.status = 'active' and p.visibility = 'public'
      and p.tags && (select tags from base)
      and not exists (select 1 from nbrs where nbrs.id = p.id)
    order by score desc, p.published_at desc
    limit p_limit
  )
  select piece_card_json(u.id)
  from (
    select id, score, tier from nbrs
    union all
    select id, score, tier from fallback
  ) u
  order by u.tier, u.score desc
  limit least(greatest(p_limit, 1), 12);
$$;

-- ---- 3. bound lyric_segments at the DB layer -------------------------------
alter table pieces add constraint lyric_segments_bounded check (
  lyric_segments is null
  or (jsonb_array_length(lyric_segments) <= 400 and char_length(lyric_segments::text) <= 60000)
);
