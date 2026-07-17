-- ============================================================================
-- UNTITLED — 0009 enrichment enqueue + immediate FTS
-- On post: create the piece_search row with an initial doc (title+caption+body
-- +tags) so the piece is searchable by FTS immediately, and enqueue async
-- enrichment jobs (embed / describe|transcribe / index). Posting never waits.
-- ============================================================================

create or replace function build_piece_doc(
  p_title text, p_caption text, p_body text, p_tags text[], p_desc text, p_transcript text
) returns text language sql immutable set search_path = '' as $$
  select nullif(trim(concat_ws(' ',
    coalesce(p_title, ''), coalesce(p_caption, ''), coalesce(p_body, ''),
    coalesce(array_to_string(p_tags, ' '), ''), coalesce(p_desc, ''), coalesce(p_transcript, '')
  )), '');
$$;

create or replace function enqueue_piece_enrichment()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into piece_search (piece_id, doc, status)
    values (new.id, build_piece_doc(new.title, new.caption, new.body, new.tags, null, null), 'pending')
    on conflict (piece_id) do update set doc = excluded.doc;

    insert into enrichment_jobs (piece_id, stage, status) values (new.id, 'embed', 'pending')
      on conflict (piece_id, stage) do nothing;
    insert into enrichment_jobs (piece_id, stage, status) values (new.id, 'index', 'pending')
      on conflict (piece_id, stage) do nothing;
    if new.medium in ('sound', 'video') then
      insert into enrichment_jobs (piece_id, stage, status) values (new.id, 'transcribe', 'pending')
        on conflict (piece_id, stage) do nothing;
    elsif new.medium = 'image' then
      insert into enrichment_jobs (piece_id, stage, status) values (new.id, 'describe', 'pending')
        on conflict (piece_id, stage) do nothing;
    end if;
  elsif tg_op = 'UPDATE' then
    update piece_search
       set doc = build_piece_doc(new.title, new.caption, new.body, new.tags, description, transcript),
           updated_at = now()
     where piece_id = new.id;
  end if;
  return null;
end;
$$;

create trigger pieces_enqueue_enrichment
  after insert on pieces
  for each row execute function enqueue_piece_enrichment();

create trigger pieces_refresh_doc
  after update of title, caption, tags, body on pieces
  for each row execute function enqueue_piece_enrichment();
