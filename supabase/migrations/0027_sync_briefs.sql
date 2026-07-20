-- ============================================================================
-- 0027 — sync-licensing groundwork (DATA MODEL ONLY)
-- ----------------------------------------------------------------------------
-- Tables for a future sync-licensing flow. No UI, no matching engine, no
-- financial rails (no contracts/escrow/payments/royalties). Both tables are
-- internal (RLS on + revoke all); they exist so the schema is ready when the
-- flow is built. The intended flow is documented on sync_briefs below.
-- ============================================================================

create type sync_usage_type    as enum ('ad', 'game', 'film', 'social', 'other');
create type sync_brief_status  as enum ('open', 'matched', 'closed');
create type brief_match_status as enum ('suggested', 'artist_notified', 'artist_approved', 'declined');

create table sync_briefs (
  id            bigint generated always as identity primary key,
  org_name      text not null check (char_length(org_name) between 1 and 120),
  contact_name  text check (contact_name is null or char_length(contact_name) <= 120),
  contact_email text check (contact_email is null or char_length(contact_email) <= 320),
  brief_text    text not null check (char_length(brief_text) between 1 and 4000),
  usage_type    sync_usage_type not null default 'other',
  budget_range  text check (budget_range is null or char_length(budget_range) <= 80),
  status        sync_brief_status not null default 'open',
  created_at    timestamptz not null default now()
);
alter table sync_briefs enable row level security;  -- internal/admin only (no policies)
revoke all on sync_briefs from anon, authenticated;

comment on table sync_briefs is
  'Sync-licensing briefs (ad/game/film/social). DATA MODEL ONLY in v1 — no UI, '
  'no matching. Intended future flow: brief_text is embedded with the same model '
  'as piece_search, matched against pieces via vector similarity into '
  'brief_matches, and every match requires explicit artist consent '
  '(status = artist_approved) before any contact detail is shared with the org. '
  'No financial rails are modeled here.';

create table brief_matches (
  brief_id   bigint not null references sync_briefs (id) on delete cascade,
  piece_id   uuid   not null references pieces (id) on delete cascade,
  score      real   not null default 0,
  status     brief_match_status not null default 'suggested',
  created_at timestamptz not null default now(),
  primary key (brief_id, piece_id)
);
alter table brief_matches enable row level security;  -- internal only (no policies)
revoke all on brief_matches from anon, authenticated;
