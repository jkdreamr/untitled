-- ============================================================================
-- UNTITLED — 0003 Row Level Security
-- RLS on every table. Two-layer safety: coarse GRANTs, then row/column policies.
--   public read only where visibility='public'/'unlisted' AND status='active'
--   artist full CRUD on own rows; social writes only as auth.uid()
--   piece_search / enrichment_jobs / rate_limits never client-readable
--   quiet-mode counts hidden by revoking count columns (reads go through RPCs)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- security helper functions (SECURITY DEFINER -> bypass RLS internally, no recursion)
-- ---------------------------------------------------------------------------
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function is_following(target uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from follows where follower_id = auth.uid() and following_id = target);
$$;

create or replace function can_view_piece(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from pieces p
    where p.id = p_id and (
      (p.artist_id = auth.uid() and p.status <> 'deleted')
      or is_admin()
      or (p.status = 'active' and (
            p.visibility in ('public','unlisted')
            or (p.visibility = 'followers' and is_following(p.artist_id))
      ))
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table profiles           enable row level security;
alter table pieces             enable row level security;
alter table piece_media        enable row level security;
alter table piece_search       enable row level security;
alter table enrichment_jobs    enable row level security;
alter table reactions          enable row level security;
alter table comments           enable row level security;
alter table follows            enable row level security;
alter table collections        enable row level security;
alter table collection_items   enable row level security;
alter table collection_follows enable row level security;
alter table reports            enable row level security;
alter table scout_waitlist     enable row level security;
alter table rate_limits        enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_all on profiles for select using (true);
create policy profiles_insert_self on profiles for insert with check (id = auth.uid());
create policy profiles_update_self on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on profiles for update using (is_admin());
create policy profiles_delete_self on profiles for delete using (id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------------
-- pieces
-- ---------------------------------------------------------------------------
create policy pieces_select on pieces for select using (
  (artist_id = auth.uid() and status <> 'deleted')
  or is_admin()
  or (status = 'active' and (
        visibility in ('public','unlisted')
        or (visibility = 'followers' and is_following(artist_id))
  ))
);
create policy pieces_insert_own on pieces for insert with check (artist_id = auth.uid());
create policy pieces_update_own on pieces for update using (artist_id = auth.uid() and status <> 'deleted') with check (artist_id = auth.uid());
create policy pieces_update_admin on pieces for update using (is_admin());
create policy pieces_delete_own on pieces for delete using (artist_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------------
-- piece_media  (visibility inherited from the parent piece)
-- ---------------------------------------------------------------------------
create policy piece_media_select on piece_media for select using (can_view_piece(piece_id));
create policy piece_media_write_own on piece_media for all
  using (exists (select 1 from pieces p where p.id = piece_media.piece_id and p.artist_id = auth.uid()))
  with check (exists (select 1 from pieces p where p.id = piece_media.piece_id and p.artist_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- piece_search — NEVER client-readable (search goes through an RPC)
-- enrichment_jobs / rate_limits — internal only
-- (RLS on with no policies => deny-all for anon/authenticated; grants revoked below)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- reactions — a user sees only their own rows (aggregate breakdown via RPC)
-- ---------------------------------------------------------------------------
create policy reactions_select_own on reactions for select using (user_id = auth.uid());
create policy reactions_insert_own on reactions for insert with check (user_id = auth.uid() and can_view_piece(piece_id));
create policy reactions_delete_own on reactions for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------
create policy comments_select on comments for select using (
  (status = 'active' and can_view_piece(piece_id))
  or user_id = auth.uid()
  or is_admin()
);
create policy comments_insert_own on comments for insert with check (
  user_id = auth.uid()
  and can_view_piece(piece_id)
  and (
    exists (select 1 from pieces p where p.id = piece_id and p.artist_id = auth.uid())
    or not exists (select 1 from pieces p where p.id = piece_id and p.comments_closed)
  )
);
create policy comments_update_own on comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- artist moderates comments on their own piece; admins moderate all
create policy comments_update_moderate on comments for update using (
  is_admin() or exists (select 1 from pieces p where p.id = comments.piece_id and p.artist_id = auth.uid())
);
create policy comments_delete on comments for delete using (
  user_id = auth.uid()
  or is_admin()
  or exists (select 1 from pieces p where p.id = comments.piece_id and p.artist_id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- follows — public social graph; write only as yourself
-- ---------------------------------------------------------------------------
create policy follows_select_all on follows for select using (true);
create policy follows_insert_own on follows for insert with check (follower_id = auth.uid());
create policy follows_delete_own on follows for delete using (follower_id = auth.uid());

-- ---------------------------------------------------------------------------
-- collections
-- ---------------------------------------------------------------------------
create policy collections_select on collections for select using (is_public or owner_id = auth.uid() or is_admin());
create policy collections_insert_own on collections for insert with check (owner_id = auth.uid());
create policy collections_update_own on collections for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy collections_delete_own on collections for delete using (owner_id = auth.uid() or is_admin());

create policy collection_items_select on collection_items for select using (
  exists (select 1 from collections c where c.id = collection_items.collection_id
          and (c.is_public or c.owner_id = auth.uid() or is_admin()))
);
create policy collection_items_insert on collection_items for insert with check (
  exists (select 1 from collections c where c.id = collection_items.collection_id and c.owner_id = auth.uid())
  and can_view_piece(piece_id)
);
create policy collection_items_update on collection_items for update using (
  exists (select 1 from collections c where c.id = collection_items.collection_id and c.owner_id = auth.uid())
);
create policy collection_items_delete on collection_items for delete using (
  exists (select 1 from collections c where c.id = collection_items.collection_id and (c.owner_id = auth.uid() or is_admin()))
);

create policy collection_follows_select_own on collection_follows for select using (follower_id = auth.uid());
create policy collection_follows_insert_own on collection_follows for insert with check (follower_id = auth.uid());
create policy collection_follows_delete_own on collection_follows for delete using (follower_id = auth.uid());

-- ---------------------------------------------------------------------------
-- reports — readable/updatable by admins only; insertable by the reporter
-- ---------------------------------------------------------------------------
create policy reports_insert_own on reports for insert with check (reporter_id = auth.uid());
create policy reports_select_admin on reports for select using (is_admin());
create policy reports_update_admin on reports for update using (is_admin());

-- ---------------------------------------------------------------------------
-- scout_waitlist — insert allowed (validated + rate-limited server-side); read admin only
-- ---------------------------------------------------------------------------
create policy scout_insert_any on scout_waitlist for insert with check (true);
create policy scout_select_admin on scout_waitlist for select using (is_admin());

-- ============================================================================
-- GRANTs + column-level hardening
-- ============================================================================
grant usage on schema public to anon, authenticated;

grant select on profiles to anon, authenticated;
grant insert, update, delete on profiles to authenticated;

grant select on pieces to anon, authenticated;
grant insert, update, delete on pieces to authenticated;

grant select on piece_media to anon, authenticated;
grant insert, update, delete on piece_media to authenticated;

grant select on follows to anon, authenticated;
grant insert, delete on follows to authenticated;

grant select, insert, delete on reactions to authenticated;

grant select on comments to anon, authenticated;
grant insert, update, delete on comments to authenticated;

grant select on collections to anon, authenticated;
grant insert, update, delete on collections to authenticated;

grant select on collection_items to anon, authenticated;
grant insert, update, delete on collection_items to authenticated;

grant select, insert, delete on collection_follows to authenticated;

grant select, insert, update on reports to authenticated;
grant insert on scout_waitlist to anon, authenticated;

-- private tables: no API-role access at all
revoke all on piece_search    from anon, authenticated;
revoke all on enrichment_jobs from anon, authenticated;
revoke all on rate_limits     from anon, authenticated;

-- privilege-escalation & vanity-counter hardening on profiles
revoke insert (role, piece_seq, follower_count, following_count) on profiles from authenticated;
revoke update (role, piece_seq, follower_count, following_count) on profiles from authenticated;

-- denormalized counters on pieces are trigger-owned and quiet-mode-masked:
-- no direct client read (reads go through SECURITY DEFINER RPCs) or write.
revoke select (reaction_count, comment_count, listen_count, view_count) on pieces from anon, authenticated;
revoke insert (sequence_no, reaction_count, comment_count, listen_count, view_count) on pieces from authenticated;
revoke update (sequence_no, reaction_count, comment_count, listen_count, view_count) on pieces from authenticated;
