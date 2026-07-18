-- ============================================================================
-- UNTITLED — 0019 talent discovery
-- Discovery points at people, not just tracks: search_artists ranks musicians by
-- name/bio/voice-note match + role/openness/genre filters, weighted toward who's
-- posting now. get_similar_tracks powers "sounds like" (neighbors, then shared
-- tags). Wander diversifies by track kind. pg_trgm lives in the extensions
-- schema, so similarity() is schema-qualified.
-- ============================================================================

-- trigram indexes for artist text search (text columns; handle stays seq-cheap)
create index if not exists profiles_name_trgm  on profiles using gin (display_name extensions.gin_trgm_ops);
create index if not exists profiles_bio_trgm   on profiles using gin (bio extensions.gin_trgm_ops);
create index if not exists profiles_vnote_trgm on profiles using gin (voice_note extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- search_artists — the talent side of discovery.
--   p_query   : free text over handle / display_name / bio / voice_note (trigram)
--   p_roles   : any-of vocalist/rapper/songwriter/… (array overlap)
--   p_open_to : any-of collabs/writing/features/sessions (array overlap)
--   p_tags    : musicians who have public tracks carrying these tags (genre etc.)
-- Ranked by text similarity + recency of their latest public track.
-- ---------------------------------------------------------------------------
create or replace function search_artists(
  p_query text default '',
  p_roles text[] default null,
  p_open_to text[] default null,
  p_tags text[] default null,
  p_limit int default 12
)
returns table(artist jsonb, score real)
language sql stable security definer set search_path = public, pg_temp as $$
  with q as (select nullif(trim(p_query), '') as term),
  base as (
    select
      pr.id, pr.handle, pr.display_name, pr.avatar_path, pr.bio, pr.voice_note,
      pr.roles, pr.open_to, pr.follower_count,
      greatest(
        extensions.similarity(pr.handle::text, coalesce((select term from q), '')),
        extensions.similarity(pr.display_name, coalesce((select term from q), '')),
        extensions.similarity(coalesce(pr.bio, ''), coalesce((select term from q), '')),
        extensions.similarity(coalesce(pr.voice_note, ''), coalesce((select term from q), ''))
      ) as sim,
      lower(coalesce((select term from q), '')) = any(pr.roles) as role_term,
      (select max(p.published_at) from pieces p
        where p.artist_id = pr.id and p.status = 'active' and p.visibility = 'public') as last_post,
      (select count(*) from pieces p
        where p.artist_id = pr.id and p.status = 'active' and p.visibility = 'public') as track_count
    from profiles pr
    where not pr.suspended
      and (p_roles is null or pr.roles && p_roles)
      and (p_open_to is null or pr.open_to && p_open_to)
      and (p_tags is null or exists (
        select 1 from pieces p
        where p.artist_id = pr.id and p.status = 'active' and p.visibility = 'public' and p.tags && p_tags))
  )
  select
    jsonb_build_object(
      'id', b.id, 'handle', b.handle, 'display_name', b.display_name, 'avatar_path', b.avatar_path,
      'bio', b.bio, 'voice_note', b.voice_note,
      'roles', to_jsonb(b.roles), 'open_to', to_jsonb(b.open_to),
      'follower_count', b.follower_count, 'track_count', b.track_count,
      'top_tags', coalesce((
        select to_jsonb(array_agg(t.tag)) from (
          select unnest(p.tags) tag, count(*) c from pieces p
          where p.artist_id = b.id and p.status = 'active' and p.visibility = 'public'
          group by 1 order by c desc, 1 limit 4) t), '[]'::jsonb)
    ) as artist,
    ( coalesce(b.sim, 0) * 3.0
      + case when b.role_term then 2.0 else 0 end
      + case when b.last_post is not null
             then greatest(0, 1 - extract(epoch from (now() - b.last_post)) / (86400.0 * 180))
             else 0 end
    )::real as score
  from base b
  where b.track_count > 0
    and (
      (select term from q) is null      -- pure filter/browse
      or b.sim > 0.1
      or b.role_term
    )
  order by score desc, b.last_post desc nulls last, b.id
  limit least(greatest(p_limit, 1), 24);
$$;

-- ---------------------------------------------------------------------------
-- get_similar_tracks — "sounds like": nightly neighbors first (embedding incl.
-- lyrics + co-collection + after edges), then shared-tag fallback to fill.
-- ---------------------------------------------------------------------------
create or replace function get_similar_tracks(p_id uuid, p_limit int default 6)
returns table(card jsonb)
language sql stable security definer set search_path = public, pg_temp as $$
  with base as (select tags from pieces where id = p_id),
  nbrs as (
    select n.neighbor_id as id, n.score, 0 as tier
    from piece_neighbors n
    join pieces p on p.id = n.neighbor_id
    where n.piece_id = p_id and p.status = 'active' and p.visibility = 'public'
    order by n.score desc
    limit p_limit
  ),
  fallback as (
    select p.id,
           cardinality(array(select unnest(p.tags) intersect select unnest((select tags from base))))::real as score,
           1 as tier
    from pieces p
    where p.id <> p_id and p.status = 'active' and p.visibility = 'public'
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

-- ---------------------------------------------------------------------------
-- get_wander_pool (recreated) — diversity is now applied over track_kind, not
-- the (nearly-constant) medium. Same scoring, exploration slots, and 180-day
-- window as before.
-- ---------------------------------------------------------------------------
drop function if exists get_wander_pool(int, uuid[]);

create or replace function get_wander_pool(p_limit int default 48, p_exclude uuid[] default '{}')
returns table(card jsonb, score real, is_exploration boolean, track_kind track_kind, artist_id uuid)
language sql stable security definer set search_path = public, pg_temp as $$
  with me as (select auth.uid() as uid),
  my_interests as (
    select coalesce((select interests from profiles where id = (select uid from me)), '{}'::text[]) as tags
  ),
  seed_tags as (
    select coalesce(array_agg(distinct t), '{}'::text[]) as tags from (
      select unnest(p.tags) t from pieces p
      where p.id in (
        select piece_id from reactions where user_id = (select uid from me)
        union
        select ci.piece_id from collection_items ci
        join collections c on c.id = ci.collection_id where c.owner_id = (select uid from me)
      )
      limit 300
    ) s
  ),
  cand as (
    select p.id, p.track_kind, p.artist_id, p.tags, p.published_at, a.follower_count
    from pieces p join profiles a on a.id = p.artist_id
    where p.status = 'active' and p.visibility = 'public'
      and (select uid from me) is distinct from p.artist_id
      and not (p.id = any(p_exclude))
      and not exists (select 1 from reactions r where r.piece_id = p.id and r.user_id = (select uid from me))
      and p.published_at > now() - interval '180 days'
    order by p.published_at desc
    limit 400
  ),
  scored as (
    select c.id, c.track_kind, c.artist_id,
      ( cardinality(array(select unnest(c.tags) intersect select unnest((select tags from my_interests))))::real * 2.0
        + cardinality(array(select unnest(c.tags) intersect select unnest((select tags from seed_tags))))::real * 1.5
        + coalesce((select max(n.score) from piece_neighbors n
             where n.neighbor_id = c.id
               and n.piece_id in (select piece_id from reactions where user_id = (select uid from me))), 0) * 3.0
        + (extract(epoch from (c.published_at - now())) / (86400.0 * 180))::real + 1.0
      )::real as score,
      (c.follower_count < 5) as is_exploration
    from cand c
  )
  select piece_card_json(s.id), s.score, s.is_exploration, s.track_kind, s.artist_id
  from scored s
  order by s.score desc, s.id
  limit least(greatest(p_limit, 1), 80);
$$;

grant execute on function search_artists(text, text[], text[], text[], int) to anon, authenticated;
grant execute on function get_similar_tracks(uuid, int) to anon, authenticated;
grant execute on function get_wander_pool(int, uuid[]) to anon, authenticated;
