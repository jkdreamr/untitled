-- ============================================================================
-- UNTITLED — 0005 recommendations + wander + account deletion manifest
-- No engagement optimization anywhere. Neighborhoods come from embedding
-- distance (when present) + co-collection + shared tags + "after" edges.
-- ============================================================================

create table piece_neighbors (
  piece_id    uuid not null references pieces (id) on delete cascade,
  neighbor_id uuid not null references pieces (id) on delete cascade,
  score       real not null,
  primary key (piece_id, neighbor_id)
);
create index piece_neighbors_idx on piece_neighbors (piece_id, score desc);
alter table piece_neighbors enable row level security;  -- internal only (no policies)
revoke all on piece_neighbors from anon, authenticated;

-- Nightly (pg_cron) materialization. O(n^2) guarded by a shared-signal prefilter;
-- fine at v0 scale — batch by artist/tag partition when the corpus grows (see README).
create or replace function refresh_recommendations()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from piece_neighbors;
  insert into piece_neighbors (piece_id, neighbor_id, score)
  select piece_id, neighbor_id, score from (
    select p1.id as piece_id, p2.id as neighbor_id,
      ( cardinality(array(select unnest(p1.tags) intersect select unnest(p2.tags)))::real * 1.0
        + coalesce(cc.n, 0)::real * 2.0
        + case when p1.after_piece_id = p2.id or p2.after_piece_id = p1.id then 3.0 else 0 end
        + case when ps1.embedding is not null and ps2.embedding is not null
               then greatest(0, 1 - (ps1.embedding OPERATOR(extensions.<=>) ps2.embedding)) * 4.0 else 0 end
      ) as score,
      row_number() over (partition by p1.id order by
        ( cardinality(array(select unnest(p1.tags) intersect select unnest(p2.tags)))::real
          + coalesce(cc.n, 0)::real * 2.0
          + case when p1.after_piece_id = p2.id or p2.after_piece_id = p1.id then 3.0 else 0 end
        ) desc) as rn
    from pieces p1
    join pieces p2 on p2.id <> p1.id and p2.status = 'active' and p2.visibility = 'public'
    left join piece_search ps1 on ps1.piece_id = p1.id
    left join piece_search ps2 on ps2.piece_id = p2.id
    left join lateral (
      select count(*)::int n from collection_items a
      join collection_items b on a.collection_id = b.collection_id
      where a.piece_id = p1.id and b.piece_id = p2.id
    ) cc on true
    where p1.status = 'active' and p1.visibility = 'public'
      and (p1.tags && p2.tags or coalesce(cc.n, 0) > 0
           or p1.after_piece_id = p2.id or p2.after_piece_id = p1.id)
  ) ranked
  where rn <= 20 and score > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- wander pool — similarity + interest + exploration, scored.
-- Diversity rules (no >2 consecutive same medium/artist, 20% exploration,
-- interstitials) are applied by the app over this pool.
-- ---------------------------------------------------------------------------
create or replace function get_wander_pool(p_limit int default 48, p_exclude uuid[] default '{}')
returns table(card jsonb, score real, is_exploration boolean, medium medium, artist_id uuid)
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
    select p.id, p.medium, p.artist_id, p.tags, p.published_at, a.follower_count
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
    select c.id, c.medium, c.artist_id,
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
  select piece_card_json(s.id), s.score, s.is_exploration, s.medium, s.artist_id
  from scored s
  order by s.score desc, s.id
  limit least(greatest(p_limit, 1), 80);
$$;

grant execute on function get_wander_pool(int, uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- account deletion manifest — every external asset to hard-delete
-- (Storage paths + Mux asset ids). Callable by the owner or an admin; the
-- server route uses it to purge Storage + Mux before deleting the auth user.
-- ---------------------------------------------------------------------------
create or replace function account_media_manifest(p_uid uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when auth.uid() = p_uid or is_admin() then
    jsonb_build_object(
      'storage_paths', coalesce((
        select jsonb_agg(m.storage_path)
        from piece_media m join pieces p on p.id = m.piece_id
        where p.artist_id = p_uid and m.storage_path is not null), '[]'::jsonb),
      'mux_asset_ids', coalesce((
        select jsonb_agg(p.mux_asset_id)
        from pieces p where p.artist_id = p_uid and p.mux_asset_id is not null), '[]'::jsonb),
      'avatar_path', (select avatar_path from profiles where id = p_uid)
    )
  else null end;
$$;

grant execute on function account_media_manifest(uuid) to authenticated;
