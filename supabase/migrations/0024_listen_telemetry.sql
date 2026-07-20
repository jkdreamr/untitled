-- ============================================================================
-- 0024 — listen telemetry (consumer-invisible)
-- ----------------------------------------------------------------------------
-- Raw per-quartile listen events, written by a SECURITY DEFINER RPC that reuses
-- the record_engagement dedup idiom (0004). The table is locked down like
-- piece_neighbors (RLS on + revoke all, no policies): no consumer surface and
-- no scout reads it directly — it feeds the nightly signals rollup (0025) only.
-- ============================================================================

create table listen_events (
  id          bigint generated always as identity primary key,
  piece_id    uuid not null references pieces (id) on delete cascade,
  listener_id uuid references auth.users (id) on delete set null,  -- null for guests
  quartile    smallint not null check (quartile in (25, 50, 75, 100)),
  created_at  timestamptz not null default now()
);
create index listen_events_piece_idx on listen_events (piece_id, created_at desc);
create index listen_events_rollup_idx on listen_events (created_at);
create index listen_events_listener_idx on listen_events (listener_id, created_at);

alter table listen_events enable row level security;  -- internal only (no policies)
revoke all on listen_events from anon, authenticated;

comment on table listen_events is
  'Raw per-quartile listen telemetry (25/50/75/100). Internal only — feeds the '
  'artist_signals_daily rollup; never read by consumer surfaces or scouts. '
  'Rows are prunable once rolled up.';

-- --- record_listen_progress(): owner-excluded, deduped, guest-friendly -------
create or replace function record_listen_progress(p_id uuid, p_quartile int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid   uuid := auth.uid();
  owner uuid;
begin
  if p_quartile not in (25, 50, 75, 100) then return; end if;

  select artist_id into owner from pieces where id = p_id and status = 'active';
  if owner is null then return; end if;                    -- unknown/inactive piece
  if uid is not null and uid = owner then return; end if;  -- never count your own listens

  -- Dedup per (subject, 'q<quartile>:<piece>') within 6h, reusing the
  -- rate_limits ledger idiom from record_engagement (0004). Guests (uid null)
  -- can't be deduped server-side; the client fires each quartile once per load
  -- and /api/listen is rate-limited, which bounds guest noise.
  if uid is not null then
    if exists (
      select 1 from rate_limits
      where subject = uid::text
        and action = 'q' || p_quartile::text || ':' || p_id::text
        and created_at > now() - interval '6 hours'
    ) then return; end if;
    insert into rate_limits (subject, action)
    values (uid::text, 'q' || p_quartile::text || ':' || p_id::text);
  end if;

  insert into listen_events (piece_id, listener_id, quartile) values (p_id, uid, p_quartile);
end;
$$;

revoke execute on function record_listen_progress(uuid, int) from public;
grant execute on function record_listen_progress(uuid, int) to anon, authenticated;
