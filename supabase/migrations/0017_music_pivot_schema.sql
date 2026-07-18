-- ============================================================================
-- UNTITLED — 0017 music pivot (schema)
-- The platform narrows from four media to one: music. Everything is a track —
-- an audio take or a performance video. Lyrics become a property of a track
-- (pasted, or AI-transcribed then human-confirmed), never a standalone piece.
--
-- Additive only. Postgres can't remove enum values, so the `medium` enum keeps
-- 'image'/'words' but a CHECK constraint forbids new rows using them. The tables
-- are empty at pivot time, so every constraint applies cleanly.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- new enums
-- ---------------------------------------------------------------------------
create type track_kind as enum ('original', 'cover', 'beat', 'freestyle');
create type lyrics_source as enum ('written', 'transcribed_confirmed');

-- ---------------------------------------------------------------------------
-- pieces — a track. Audio or performance video only.
-- ---------------------------------------------------------------------------
alter table pieces
  add column track_kind      track_kind not null default 'original',
  add column has_vocals       boolean not null default true,
  add column cover_of_title   text check (cover_of_title is null or char_length(cover_of_title) <= 120),
  add column cover_of_artist  text check (cover_of_artist is null or char_length(cover_of_artist) <= 120),
  add column lyrics           text check (lyrics is null or char_length(lyrics) <= 4000),
  add column lyrics_source    lyrics_source,
  add column lyric_segments   jsonb,
  add column show_lyrics      boolean not null default true;

-- music only, going forward (enum retains legacy values for historical safety)
alter table pieces add constraint pieces_music_medium check (medium in ('sound', 'video'));

-- lyrics integrity: a source/segments only make sense alongside lyric text
alter table pieces
  add constraint lyrics_source_needs_lyrics   check (lyrics_source is null or lyrics is not null),
  add constraint lyric_segments_need_lyrics   check (lyric_segments is null or lyrics is not null),
  add constraint lyric_segments_is_array      check (lyric_segments is null or jsonb_typeof(lyric_segments) = 'array');

comment on column pieces.track_kind is 'original | cover | beat | freestyle — shapes discovery, never ranking.';
comment on column pieces.has_vocals is 'False for beats/instrumentals; gates the transcription pass.';
comment on column pieces.lyrics is 'Confirmed lyric text (written by the artist, or transcription they confirmed). Public.';
comment on column pieces.lyrics_source is 'How the confirmed lyrics were produced. Null when there are no lyrics.';
comment on column pieces.lyric_segments is 'Confirmed, time-synced lyric lines [{start,end,text}]. Public, drives the synced view.';
comment on column pieces.show_lyrics is 'Artist preference: whether the lyric panel opens by default on a video track.';

-- ---------------------------------------------------------------------------
-- profiles — musicians become talent pages
-- ---------------------------------------------------------------------------
alter table profiles
  add column roles     text[] not null default '{}',
  add column open_to   text[] not null default '{}',
  add column voice_note text check (voice_note is null or char_length(voice_note) <= 80);

alter table profiles
  add constraint roles_allowed check (
    roles <@ array['vocalist','rapper','songwriter','producer','instrumentalist','engineer','composer','dj']::text[]
    and cardinality(roles) <= 8
  ),
  add constraint open_to_allowed check (
    open_to <@ array['collabs','writing','features','sessions']::text[]
    and cardinality(open_to) <= 4
  );

comment on column profiles.roles is 'What this musician does: vocalist/rapper/songwriter/producer/instrumentalist/engineer/composer/dj.';
comment on column profiles.open_to is 'What they are open to: collabs/writing/features/sessions.';
comment on column profiles.voice_note is 'One line, ≤80 chars — how they describe their sound. Space Mono on the talent page.';

-- ---------------------------------------------------------------------------
-- piece_search — lyric-aware, weighted FTS
--   lyrics_text        : confirmed lyrics, mirrored here for weight-A FTS
--   transcript_segments: raw whisper segments (unconfirmed) — never client-readable
-- The generated fts now weights lyrics (A) above the rest of the doc (B).
-- ---------------------------------------------------------------------------
alter table piece_search
  add column lyrics_text         text,
  add column transcript_segments jsonb;

drop index if exists piece_search_fts_idx;
alter table piece_search drop column fts;
alter table piece_search add column fts tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(lyrics_text, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(doc, '')), 'B')
  ) stored;
create index piece_search_fts_idx on piece_search using gin (fts);

comment on column piece_search.lyrics_text is 'Confirmed lyrics only, mirrored from pieces.lyrics for weight-A FTS. Never shown from here.';
comment on column piece_search.transcript_segments is 'Raw, unconfirmed whisper segments. Internal only — never exposed to clients.';

-- ---------------------------------------------------------------------------
-- enrichment doc — fold lyrics + cover attribution in; drop the words `body`.
-- The doc feeds the text embedding; lyrics also carry weight A via lyrics_text.
-- ---------------------------------------------------------------------------
drop function if exists build_piece_doc(text, text, text, text[], text, text);

create or replace function build_piece_doc(
  p_title text, p_caption text, p_lyrics text, p_tags text[],
  p_desc text, p_transcript text, p_cover_title text, p_cover_artist text
) returns text language sql immutable set search_path = '' as $$
  select nullif(trim(concat_ws(' ',
    coalesce(p_title, ''), coalesce(p_caption, ''), coalesce(p_lyrics, ''),
    coalesce(array_to_string(p_tags, ' '), ''), coalesce(p_desc, ''),
    coalesce(p_transcript, ''), coalesce(p_cover_title, ''), coalesce(p_cover_artist, '')
  )), '');
$$;

-- ---------------------------------------------------------------------------
-- enqueue trigger — transcribe every vocal track (sound OR video); no describe.
-- ---------------------------------------------------------------------------
create or replace function enqueue_piece_enrichment()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into piece_search (piece_id, doc, lyrics_text, status)
    values (
      new.id,
      build_piece_doc(new.title, new.caption, new.lyrics, new.tags, null, null,
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
    -- transcription is the lyric-intelligence entry point: any track that carries
    -- vocals gets a pass, audio or video. Beats/instrumentals skip it.
    if new.has_vocals then
      insert into enrichment_jobs (piece_id, stage, status) values (new.id, 'transcribe', 'pending')
        on conflict (piece_id, stage) do nothing;
    end if;
  elsif tg_op = 'UPDATE' then
    update piece_search
       set doc = build_piece_doc(new.title, new.caption, new.lyrics, new.tags,
                                 description, transcript, new.cover_of_title, new.cover_of_artist),
           lyrics_text = new.lyrics,
           updated_at = now()
     where piece_id = new.id;
  end if;
  return null;
end;
$$;

-- rebuild the doc when any FTS-bearing field changes (lyrics/cover now included)
drop trigger if exists pieces_refresh_doc on pieces;
create trigger pieces_refresh_doc
  after update of title, caption, tags, lyrics, cover_of_title, cover_of_artist on pieces
  for each row execute function enqueue_piece_enrichment();

-- ---------------------------------------------------------------------------
-- piece_card_json — the canonical card, now track-shaped.
-- Adds track_kind, has_vocals, cover attribution, confirmed lyrics + segments,
-- the show_lyrics preference, and the artist's roles. Drops the words `body`.
-- Only CONFIRMED lyrics are ever exposed here — raw transcription stays in
-- piece_search (never client-readable).
-- ---------------------------------------------------------------------------
create or replace function piece_card_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when not can_view_piece(p_id) then null else
    jsonb_build_object(
      'id', p.id, 'medium', p.medium, 'title', p.title, 'caption', p.caption,
      'track_kind', p.track_kind, 'has_vocals', p.has_vocals,
      'cover_of_title', p.cover_of_title, 'cover_of_artist', p.cover_of_artist,
      'lyrics', p.lyrics, 'lyrics_source', p.lyrics_source,
      'lyric_segments', coalesce(p.lyric_segments, '[]'::jsonb),
      'show_lyrics', p.show_lyrics,
      'tags', to_jsonb(p.tags), 'visibility', p.visibility, 'status', p.status,
      'sequence_no', p.sequence_no, 'created_at', p.created_at, 'published_at', p.published_at,
      'comments_closed', p.comments_closed,
      'mux_playback_id', case when p.medium = 'video' then p.mux_playback_id else null end,
      'artist', jsonb_build_object('id', a.id, 'handle', a.handle, 'display_name', a.display_name,
        'avatar_path', a.avatar_path, 'quiet_mode', a.quiet_mode, 'roles', to_jsonb(a.roles)),
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

-- ---------------------------------------------------------------------------
-- column-level grants for the new writable columns (see 0014 for the model:
-- table grants are revoked; only listed columns are writable by authenticated).
-- ---------------------------------------------------------------------------
grant select (track_kind, has_vocals, cover_of_title, cover_of_artist,
              lyrics, lyrics_source, lyric_segments, show_lyrics) on pieces to anon, authenticated;
grant insert (track_kind, has_vocals, cover_of_title, cover_of_artist,
              lyrics, lyrics_source, lyric_segments, show_lyrics) on pieces to authenticated;
grant update (track_kind, has_vocals, cover_of_title, cover_of_artist,
              lyrics, lyrics_source, lyric_segments, show_lyrics) on pieces to authenticated;

grant insert (roles, open_to, voice_note) on profiles to authenticated;
grant update (roles, open_to, voice_note) on profiles to authenticated;
