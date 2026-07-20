-- ============================================================================
-- 0026 — scout tools: search, saved searches, lists, contact, notifications
-- ----------------------------------------------------------------------------
-- Scout-gated SECURITY DEFINER RPCs (every one re-checks is_scout()) plus the
-- scout's own private workspace tables (RLS: owner + approved-scout only) and
-- the one consumer-visible addition: a notifications inbox (recipient-only).
--
-- scout_search_artists is the ONLY place momentum sorts search results, and it
-- is scout-gated — momentum never enters a consumer RPC. Artist emails are
-- never exposed; contact arrives as an in-app notification the artist can
-- ignore, and only when the artist has at least one open_to flag set.
-- ============================================================================

-- --- notifications (recipient-only) -----------------------------------------
create table notifications (
  id           bigint generated always as identity primary key,
  recipient_id uuid not null references profiles (id) on delete cascade,
  kind         text not null,                       -- 'scout_contact' (extensible)
  payload      jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_recipient_idx on notifications (recipient_id, created_at desc);
alter table notifications enable row level security;
revoke all on notifications from anon, authenticated;
grant select on notifications to authenticated;
grant update (read_at) on notifications to authenticated;   -- mark-read only
create policy notifications_select_own on notifications for select using (recipient_id = auth.uid());
create policy notifications_update_own on notifications for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
-- inserts happen only via send_scout_contact() (SECURITY DEFINER)

-- --- scout workspace: saved searches ----------------------------------------
create table scout_saved_searches (
  id         bigint generated always as identity primary key,
  scout_id   uuid not null references profiles (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  params     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index scout_saved_searches_scout_idx on scout_saved_searches (scout_id, created_at desc);
alter table scout_saved_searches enable row level security;
revoke all on scout_saved_searches from anon, authenticated;
grant select, insert, delete on scout_saved_searches to authenticated;
create policy scout_saved_own on scout_saved_searches for all
  using (scout_id = auth.uid() and is_scout())
  with check (scout_id = auth.uid() and is_scout());

-- --- scout workspace: lists + items (private notes) -------------------------
create table scout_lists (
  id         bigint generated always as identity primary key,
  scout_id   uuid not null references profiles (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);
create index scout_lists_scout_idx on scout_lists (scout_id, created_at desc);
alter table scout_lists enable row level security;
revoke all on scout_lists from anon, authenticated;
grant select, insert, update, delete on scout_lists to authenticated;
create policy scout_lists_own on scout_lists for all
  using (scout_id = auth.uid() and is_scout())
  with check (scout_id = auth.uid() and is_scout());

create table scout_list_items (
  list_id   bigint not null references scout_lists (id) on delete cascade,
  artist_id uuid not null references profiles (id) on delete cascade,
  note      text check (note is null or char_length(note) <= 500),  -- private to the scout
  added_at  timestamptz not null default now(),
  primary key (list_id, artist_id)
);
alter table scout_list_items enable row level security;
revoke all on scout_list_items from anon, authenticated;
grant select, insert, update, delete on scout_list_items to authenticated;
create policy scout_list_items_own on scout_list_items for all
  using (is_scout() and exists (select 1 from scout_lists l where l.id = list_id and l.scout_id = auth.uid()))
  with check (is_scout() and exists (select 1 from scout_lists l where l.id = list_id and l.scout_id = auth.uid()));

-- --- scout_search_artists(): momentum-sortable, consent-filtered ------------
-- VOLATILE (logs to scout_queries). Filters visible_to_scouts and can sort by
-- momentum — momentum sorting exists ONLY here, never in a consumer RPC.
create or replace function scout_search_artists(
  p_query      text default '',
  p_roles      text[] default null,
  p_open_to    text[] default null,
  p_tags       text[] default null,
  p_kinds      track_kind[] default null,
  p_has_vocals boolean default null,
  p_sort       text default 'momentum',   -- 'momentum' | 'recent' | 'relevance'
  p_limit      int default 24
)
returns table(artist jsonb, momentum numeric, score real)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_scout() then
    raise exception 'scout access required' using errcode = '42501';
  end if;

  if coalesce(p_query,'') <> '' or p_roles is not null or p_open_to is not null
     or p_tags is not null or p_kinds is not null or p_has_vocals is not null then
    insert into scout_queries (scout_id, query_text, filters)
    values (auth.uid(), coalesce(p_query,''),
      jsonb_build_object('roles', p_roles, 'open_to', p_open_to, 'tags', p_tags,
                         'kinds', p_kinds, 'has_vocals', p_has_vocals, 'sort', p_sort));
  end if;

  return query
  with base as (
    select p.id, p.handle, p.display_name, p.bio, p.avatar_path, p.roles, p.open_to, p.voice_note,
           coalesce(m.score, 0) as momentum,
           max(pc.published_at) as last_post,
           (case when coalesce(p_query,'') <> ''
                 and (p.display_name ilike '%'||p_query||'%' or p.handle ilike '%'||p_query||'%')
                 then 1.0 else 0.0 end)::real as rel
    from profiles p
    join pieces pc on pc.artist_id = p.id and pc.status = 'active' and pc.visibility = 'public'
    left join artist_momentum m on m.artist_id = p.id
    where p.visible_to_scouts = true
      and p.suspended = false
      and (p_roles   is null or p.roles   && p_roles)
      and (p_open_to is null or p.open_to && p_open_to)
      and (coalesce(p_query,'') = '' or p.display_name ilike '%'||p_query||'%'
           or p.handle ilike '%'||p_query||'%' or coalesce(p.bio,'') ilike '%'||p_query||'%')
      and (p_kinds is null or exists (
            select 1 from pieces pk where pk.artist_id = p.id and pk.status='active'
              and pk.visibility='public' and pk.track_kind = any(p_kinds)))
      and (p_has_vocals is null or exists (
            select 1 from pieces pv where pv.artist_id = p.id and pv.status='active'
              and pv.visibility='public' and pv.has_vocals = p_has_vocals))
      and (p_tags is null or exists (
            select 1 from pieces pt where pt.artist_id = p.id and pt.status='active'
              and pt.visibility='public' and pt.tags && p_tags))
    group by p.id, p.handle, p.display_name, p.bio, p.avatar_path, p.roles, p.open_to, p.voice_note, m.score
  )
  select
    jsonb_build_object(
      'id', b.id, 'handle', b.handle, 'display_name', b.display_name, 'bio', b.bio,
      'avatar_path', b.avatar_path, 'roles', b.roles, 'open_to', b.open_to,
      'voice_note', b.voice_note, 'momentum', b.momentum, 'last_post', b.last_post
    ),
    b.momentum, b.rel
  from base b
  order by
    case when p_sort = 'momentum'  then b.momentum end desc nulls last,
    case when p_sort = 'recent'    then b.last_post end desc nulls last,
    case when p_sort = 'relevance' then b.rel end desc nulls last,
    b.momentum desc
  limit least(p_limit, 60);
end;
$$;

revoke execute on function scout_search_artists(text, text[], text[], text[], track_kind[], boolean, text, int) from public;
grant execute on function scout_search_artists(text, text[], text[], text[], track_kind[], boolean, text, int) to authenticated;

-- --- scout_artist_signals(): momentum + daily series for the detail view -----
create or replace function scout_artist_signals(p_artist_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  visible boolean;
begin
  if not is_scout() then
    raise exception 'scout access required' using errcode = '42501';
  end if;
  select visible_to_scouts into visible from profiles where id = p_artist_id;
  if visible is not true then return null; end if;   -- opted out ⇒ invisible

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

revoke execute on function scout_artist_signals(uuid) from public;
grant execute on function scout_artist_signals(uuid) to authenticated;

-- --- send_scout_contact(): open_to-gated, rate-limited, no email exposure ----
create or replace function send_scout_contact(p_target_id uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me          uuid := auth.uid();
  my_org      text;
  target_open text[];
  target_vis  boolean;
  used        int;
begin
  if not is_scout() then
    raise exception 'scout access required' using errcode = '42501';
  end if;
  if p_body is null or char_length(trim(p_body)) = 0 or char_length(p_body) > 500 then
    raise exception 'message must be 1-500 characters' using errcode = '22000';
  end if;

  select org_name into my_org from scout_accounts where profile_id = me and status = 'approved';

  select open_to, visible_to_scouts into target_open, target_vis from profiles where id = p_target_id;
  if target_vis is not true or target_open is null or array_length(target_open, 1) is null then
    raise exception 'this artist is not reachable' using errcode = '22000';
  end if;

  -- rate limit: 10 contacts / 24h / scout (rate_limits ledger)
  select count(*) into used from rate_limits
    where subject = me::text and action = 'scout_contact'
      and created_at > now() - interval '24 hours';
  if used >= 10 then
    raise exception 'daily contact limit reached' using errcode = '22000';
  end if;
  insert into rate_limits (subject, action) values (me::text, 'scout_contact');

  -- artist sees org name + message only; no scout identity, no reply flow
  insert into notifications (recipient_id, kind, payload)
  values (p_target_id, 'scout_contact', jsonb_build_object('org', my_org, 'body', p_body));

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function send_scout_contact(uuid, text) from public;
grant execute on function send_scout_contact(uuid, text) to authenticated;
