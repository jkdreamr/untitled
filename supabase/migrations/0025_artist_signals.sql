-- ============================================================================
-- 0025 — artist signals rollup + momentum + nightly cron
-- ----------------------------------------------------------------------------
-- A first-party, pre-viral talent-signal layer. Three internal tables (locked
-- down like piece_neighbors, 0005) and a SECURITY DEFINER refresh function
-- scheduled nightly via pg_cron (the 0013 model, after refresh-recommendations).
--
-- ISOLATION: none of these tables is read by any consumer RPC (get_following_
-- feed, get_wander_pool, search_pieces, search_artists, piece_card_json,
-- refresh_recommendations). They are read only by the scout-gated RPCs in 0026.
-- Momentum never influences a consumer feed, wander, search, or recommendation.
-- ============================================================================

-- --- daily rollup -----------------------------------------------------------
create table artist_signals_daily (
  artist_id             uuid not null references profiles (id) on delete cascade,
  day                   date not null,
  followers_gained      integer not null default 0,
  listens               integer not null default 0,   -- listen_events @ 25% that day
  completes             integer not null default 0,   -- listen_events @ 100% that day
  completion_rate       numeric(5,4) not null default 0,
  repeat_listeners      integer not null default 0,
  collections_gained    integer not null default 0,
  reactions_gained      integer not null default 0,
  after_children_gained integer not null default 0,   -- others posting "after" this artist
  scout_query_hits      integer not null default 0,
  primary key (artist_id, day)
);
create index artist_signals_daily_day_idx on artist_signals_daily (day);
alter table artist_signals_daily enable row level security;  -- internal (no policies)
revoke all on artist_signals_daily from anon, authenticated;

-- --- momentum (transparent, fully explainable) ------------------------------
create table artist_momentum (
  artist_id   uuid primary key references profiles (id) on delete cascade,
  window_days integer not null,
  score       numeric(6,2) not null,   -- 0..100, higher = more momentum
  components  jsonb not null,          -- per-component {raw, normalized, weight, contribution}
  computed_at timestamptz not null default now()
);
alter table artist_momentum enable row level security;  -- internal (no policies)
revoke all on artist_momentum from anon, authenticated;

comment on table artist_momentum is
  'Momentum = 100 * SUM(normalized_component * weight). Weights (sum 1.0): '
  'completion_rate .20, repeat_ratio .15, after_velocity .20, follower_velocity '
  '.20, collection_velocity .10, reaction_velocity .15. Velocities are per-day '
  'rates over window_days, normalized by fixed scales (see refresh_artist_signals). '
  'Every component''s raw/normalized/weight/contribution is stored so any score '
  'is auditable. NEVER public, NEVER shown to artists or peers, NEVER an input '
  'to any consumer ranking.';

-- --- scout query log (demand signal + audit) --------------------------------
create table scout_queries (
  id         bigint generated always as identity primary key,
  scout_id   uuid not null references profiles (id) on delete cascade,
  query_text text not null default '',
  filters    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index scout_queries_scout_idx on scout_queries (scout_id, created_at desc);
create index scout_queries_created_idx on scout_queries (created_at);
alter table scout_queries enable row level security;  -- internal/audit (no policies)
revoke all on scout_queries from anon, authenticated;

-- --- refresh_artist_signals(): nightly rebuild (truncate/upsert, 0005 model) -
create or replace function refresh_artist_signals()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  win_days  int := 30;
  -- component weights (sum = 1.00)
  w_completion numeric := 0.20;
  w_repeat     numeric := 0.15;
  w_after      numeric := 0.20;
  w_follow     numeric := 0.20;
  w_collect    numeric := 0.10;
  w_react      numeric := 0.15;
  -- velocity normalization scales (per-day rate that maps to normalized 1.0)
  s_after   numeric := 0.5;
  s_follow  numeric := 3.0;
  s_collect numeric := 2.0;
  s_react   numeric := 5.0;
begin
  -- ---- rebuild the trailing daily window (history beyond it is retained) ----
  delete from artist_signals_daily where day >= current_date - win_days;

  insert into artist_signals_daily (artist_id, day, followers_gained)
  select following_id, created_at::date, count(*)
  from follows
  where created_at::date >= current_date - win_days
  group by following_id, created_at::date
  on conflict (artist_id, day) do update set followers_gained = excluded.followers_gained;

  insert into artist_signals_daily (artist_id, day, reactions_gained)
  select pp.artist_id, r.created_at::date, count(*)
  from reactions r join pieces pp on pp.id = r.piece_id
  where r.created_at::date >= current_date - win_days
  group by pp.artist_id, r.created_at::date
  on conflict (artist_id, day) do update set reactions_gained = excluded.reactions_gained;

  insert into artist_signals_daily (artist_id, day, collections_gained)
  select pp.artist_id, ci.added_at::date, count(*)
  from collection_items ci join pieces pp on pp.id = ci.piece_id
  where ci.added_at::date >= current_date - win_days
  group by pp.artist_id, ci.added_at::date
  on conflict (artist_id, day) do update set collections_gained = excluded.collections_gained;

  insert into artist_signals_daily (artist_id, day, after_children_gained)
  select parent.artist_id, child.published_at::date, count(*)
  from pieces child
  join pieces parent on parent.id = child.after_piece_id
  where child.after_piece_id is not null
    and child.status = 'active'
    and child.published_at is not null
    and child.published_at::date >= current_date - win_days
  group by parent.artist_id, child.published_at::date
  on conflict (artist_id, day) do update set after_children_gained = excluded.after_children_gained;

  insert into artist_signals_daily (artist_id, day, listens, completes, completion_rate)
  select pp.artist_id, le.created_at::date,
         count(*) filter (where le.quartile = 25),
         count(*) filter (where le.quartile = 100),
         case when count(*) filter (where le.quartile = 25) > 0
              then least(1.0, count(*) filter (where le.quartile = 100)::numeric
                              / count(*) filter (where le.quartile = 25))
              else 0 end
  from listen_events le join pieces pp on pp.id = le.piece_id
  where le.created_at::date >= current_date - win_days
  group by pp.artist_id, le.created_at::date
  on conflict (artist_id, day) do update set
    listens = excluded.listens, completes = excluded.completes,
    completion_rate = excluded.completion_rate;

  -- returning listeners: distinct listeners active on a day who first listened
  -- to this artist on an earlier day
  with al as (
    select pp.artist_id, le.listener_id, le.created_at::date as day
    from listen_events le join pieces pp on pp.id = le.piece_id
    where le.listener_id is not null
  ),
  firsts as (select artist_id, listener_id, min(day) first_day from al group by artist_id, listener_id)
  insert into artist_signals_daily (artist_id, day, repeat_listeners)
  select al.artist_id, al.day, count(distinct al.listener_id)
  from al join firsts f on f.artist_id = al.artist_id and f.listener_id = al.listener_id
  where al.day > f.first_day and al.day >= current_date - win_days
  group by al.artist_id, al.day
  on conflict (artist_id, day) do update set repeat_listeners = excluded.repeat_listeners;

  -- scout demand: a scout query whose text names the artist's handle (approximate
  -- proxy; per-artist impression logging is future work)
  insert into artist_signals_daily (artist_id, day, scout_query_hits)
  select p.id, sq.created_at::date, count(*)
  from scout_queries sq
  join profiles p on sq.query_text ilike '%' || p.handle || '%'
  where sq.created_at::date >= current_date - win_days
    and length(p.handle) >= 3
  group by p.id, sq.created_at::date
  on conflict (artist_id, day) do update set scout_query_hits = excluded.scout_query_hits;

  -- ---- momentum (full rebuild) ---------------------------------------------
  delete from artist_momentum;

  insert into artist_momentum (artist_id, window_days, score, components, computed_at)
  select
    agg.artist_id,
    win_days,
    round(100 * (
      w_completion * n.n_completion + w_repeat * n.n_repeat + w_after * n.n_after +
      w_follow * n.n_follow + w_collect * n.n_collect + w_react * n.n_react
    ), 2),
    jsonb_build_object(
      'completion_rate',     jsonb_build_object('raw', round(agg.raw_completion, 4), 'normalized', round(n.n_completion, 4), 'weight', w_completion, 'contribution', round(w_completion * n.n_completion, 4)),
      'repeat_ratio',        jsonb_build_object('raw', round(agg.raw_repeat, 4),     'normalized', round(n.n_repeat, 4),     'weight', w_repeat,     'contribution', round(w_repeat * n.n_repeat, 4)),
      'after_velocity',      jsonb_build_object('raw', round(agg.raw_after, 4),      'normalized', round(n.n_after, 4),      'weight', w_after,      'contribution', round(w_after * n.n_after, 4)),
      'follower_velocity',   jsonb_build_object('raw', round(agg.raw_follow, 4),     'normalized', round(n.n_follow, 4),     'weight', w_follow,     'contribution', round(w_follow * n.n_follow, 4)),
      'collection_velocity', jsonb_build_object('raw', round(agg.raw_collect, 4),    'normalized', round(n.n_collect, 4),    'weight', w_collect,    'contribution', round(w_collect * n.n_collect, 4)),
      'reaction_velocity',   jsonb_build_object('raw', round(agg.raw_react, 4),      'normalized', round(n.n_react, 4),      'weight', w_react,      'contribution', round(w_react * n.n_react, 4))
    ),
    now()
  from (
    select
      artist_id,
      case when sum(listens) > 0 then sum(completes)::numeric / sum(listens) else 0 end as raw_completion,
      case when sum(listens) > 0 then least(1.0, sum(repeat_listeners)::numeric / sum(listens)) else 0 end as raw_repeat,
      sum(after_children_gained)::numeric / win_days as raw_after,
      sum(followers_gained)::numeric / win_days as raw_follow,
      sum(collections_gained)::numeric / win_days as raw_collect,
      sum(reactions_gained)::numeric / win_days as raw_react
    from artist_signals_daily
    where day >= current_date - win_days
    group by artist_id
  ) agg
  cross join lateral (
    select
      least(1.0, agg.raw_completion)          as n_completion,
      least(1.0, agg.raw_repeat)              as n_repeat,
      least(1.0, agg.raw_after   / s_after)   as n_after,
      least(1.0, agg.raw_follow  / s_follow)  as n_follow,
      least(1.0, agg.raw_collect / s_collect) as n_collect,
      least(1.0, agg.raw_react   / s_react)   as n_react
  ) n;
end;
$$;

revoke execute on function refresh_artist_signals() from public;  -- cron/admin only

-- --- schedule nightly at 05:00 UTC (after refresh-recommendations @ 04:00) ---
create extension if not exists pg_cron;
select cron.schedule('refresh-artist-signals', '0 5 * * *', $$ select public.refresh_artist_signals(); $$);
