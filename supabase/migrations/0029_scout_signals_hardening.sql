-- ============================================================================
-- 0029 — scout/signals hardening (post-review fixes)
-- ----------------------------------------------------------------------------
-- 1. Suspended artists are absent from EVERY scout surface (scout_artist_signals
--    and send_scout_contact previously checked visible_to_scouts but not
--    suspended — search and the TS layer already check both).
-- 2. Momentum counts only IDENTIFIED (non-guest), owner-excluded listens on
--    PUBLIC pieces. Guest telemetry (listener_id null) still lands in
--    listen_events for analytics, but can no longer inflate a scout-facing
--    completion_rate, and non-public plays no longer feed momentum.
-- 3. scout_query_hits escapes '_' in the handle (handles may contain it, and it
--    is a LIKE wildcard) so demand is attributed to the right artist.
-- 4. Adds the admin-only revoke_scout() counterpart to grant_scout().
-- ============================================================================

-- --- refresh_artist_signals(): identified + public listens only --------------
create or replace function refresh_artist_signals()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  win_days  int := 30;
  w_completion numeric := 0.20;
  w_repeat     numeric := 0.15;
  w_after      numeric := 0.20;
  w_follow     numeric := 0.20;
  w_collect    numeric := 0.10;
  w_react      numeric := 0.15;
  s_after   numeric := 0.5;
  s_follow  numeric := 3.0;
  s_collect numeric := 2.0;
  s_react   numeric := 5.0;
begin
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

  -- momentum-eligible listens: identified listener (excludes guests, so
  -- unauthenticated pings can't inflate) on a PUBLIC piece only.
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
    and le.listener_id is not null
    and pp.visibility = 'public'
  group by pp.artist_id, le.created_at::date
  on conflict (artist_id, day) do update set
    listens = excluded.listens, completes = excluded.completes,
    completion_rate = excluded.completion_rate;

  with al as (
    select pp.artist_id, le.listener_id, le.created_at::date as day
    from listen_events le join pieces pp on pp.id = le.piece_id
    where le.listener_id is not null and pp.visibility = 'public'
  ),
  firsts as (select artist_id, listener_id, min(day) first_day from al group by artist_id, listener_id)
  insert into artist_signals_daily (artist_id, day, repeat_listeners)
  select al.artist_id, al.day, count(distinct al.listener_id)
  from al join firsts f on f.artist_id = al.artist_id and f.listener_id = al.listener_id
  where al.day > f.first_day and al.day >= current_date - win_days
  group by al.artist_id, al.day
  on conflict (artist_id, day) do update set repeat_listeners = excluded.repeat_listeners;

  -- '_' in a handle is a LIKE wildcard — escape it so hits attribute correctly.
  insert into artist_signals_daily (artist_id, day, scout_query_hits)
  select p.id, sq.created_at::date, count(*)
  from scout_queries sq
  join profiles p on sq.query_text ilike '%' || replace(p.handle, '_', '\_') || '%'
  where sq.created_at::date >= current_date - win_days
    and length(p.handle) >= 3
  group by p.id, sq.created_at::date
  on conflict (artist_id, day) do update set scout_query_hits = excluded.scout_query_hits;

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

-- --- scout_artist_signals(): hide suspended artists too ----------------------
create or replace function scout_artist_signals(p_artist_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  visible boolean;
  is_susp boolean;
begin
  if not is_scout() then
    raise exception 'scout access required' using errcode = '42501';
  end if;
  select visible_to_scouts, suspended into visible, is_susp from profiles where id = p_artist_id;
  if visible is not true or is_susp then return null; end if;   -- opted out or suspended ⇒ invisible

  return jsonb_build_object(
    'momentum', (select to_jsonb(m) from artist_momentum m where m.artist_id = p_artist_id),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d.day, 'followers_gained', d.followers_gained, 'listens', d.listens,
        'completes', d.completes, 'completion_rate', d.completion_rate,
        'repeat_listeners', d.repeat_listeners, 'collections_gained', d.collections_gained,
        'reactions_gained', d.reactions_gained, 'after_children_gained', d.after_children_gained,
        'scout_query_hits', d.scout_query_hits) order by d.day)
      from artist_signals_daily d
      where d.artist_id = p_artist_id and d.day >= current_date - 30
    ), '[]'::jsonb)
  );
end;
$$;

-- --- send_scout_contact(): don't contact a suspended artist ------------------
create or replace function send_scout_contact(p_target_id uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me          uuid := auth.uid();
  my_org      text;
  target_open text[];
  target_vis  boolean;
  target_susp boolean;
  used        int;
begin
  if not is_scout() then
    raise exception 'scout access required' using errcode = '42501';
  end if;
  if p_body is null or char_length(trim(p_body)) = 0 or char_length(p_body) > 500 then
    raise exception 'message must be 1-500 characters' using errcode = '22000';
  end if;

  select org_name into my_org from scout_accounts where profile_id = me and status = 'approved';

  select open_to, visible_to_scouts, suspended into target_open, target_vis, target_susp
  from profiles where id = p_target_id;
  if target_vis is not true or target_susp or target_open is null or array_length(target_open, 1) is null then
    raise exception 'this artist is not reachable' using errcode = '22000';
  end if;

  select count(*) into used from rate_limits
    where subject = me::text and action = 'scout_contact'
      and created_at > now() - interval '24 hours';
  if used >= 10 then
    raise exception 'daily contact limit reached' using errcode = '22000';
  end if;
  insert into rate_limits (subject, action) values (me::text, 'scout_contact');

  insert into notifications (recipient_id, kind, payload)
  values (p_target_id, 'scout_contact', jsonb_build_object('org', my_org, 'body', p_body));

  return jsonb_build_object('ok', true);
end;
$$;

-- --- revoke_scout(): admin-only counterpart to grant_scout() -----------------
create or replace function revoke_scout(p_profile_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_admin() then
    raise exception 'only admins can revoke scout access' using errcode = '42501';
  end if;
  update scout_accounts set status = 'revoked' where profile_id = p_profile_id;
end;
$$;

revoke execute on function revoke_scout(uuid) from public, anon;
grant execute on function revoke_scout(uuid) to authenticated;  -- body self-gates on is_admin()
