-- ============================================================================
-- UNTITLED — 0002 search, social, safety
-- piece_search (never client-readable), enrichment_jobs, reactions, comments,
-- follows, collections, reports, scout_waitlist, rate_limits + count triggers.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- piece_search — search metadata only. Two embedding spaces:
--   embedding        : Layer A unified multimodal (Gemini), dim configurable (1536)
--   embedding_small  : gte-small text fallback (384) when no GEMINI_API_KEY
-- fts is generated from `doc` (tags + title + caption + description + transcript).
-- ---------------------------------------------------------------------------
create table piece_search (
  piece_id        uuid primary key references pieces (id) on delete cascade,
  description     text,                 -- vision description (search + alt text; never shown as artist writing)
  transcript      text,                 -- whisper transcription of sung/rapped audio
  doc             text,                 -- concatenated enrichment document (source of fts)
  fts             tsvector generated always as (to_tsvector('english', coalesce(doc, ''))) stored,
  embedding       extensions.vector(1536),
  embedding_small extensions.vector(384),
  embed_model     text,
  status          search_status not null default 'pending',
  updated_at      timestamptz not null default now()
);

create index piece_search_fts_idx on piece_search using gin (fts);
-- HNSW cosine indexes (partial: only rows that actually carry a vector)
create index piece_search_embedding_hnsw
  on piece_search using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;
create index piece_search_embedding_small_hnsw
  on piece_search using hnsw (embedding_small extensions.vector_cosine_ops)
  where embedding_small is not null;

create trigger piece_search_updated_at
  before update on piece_search
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- enrichment_jobs — async pipeline. Posting never waits on AI.
-- ---------------------------------------------------------------------------
create table enrichment_jobs (
  id          uuid primary key default gen_random_uuid(),
  piece_id    uuid not null references pieces (id) on delete cascade,
  stage       job_stage not null,
  status      job_status not null default 'pending',
  attempts    integer not null default 0,
  last_error  text,
  run_after   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (piece_id, stage)
);

create index enrichment_jobs_drain_idx
  on enrichment_jobs (run_after)
  where status in ('pending', 'error');

create trigger enrichment_jobs_updated_at
  before update on enrichment_jobs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- reactions — fixed set of four; one row per (piece, user, kind); tap toggles.
-- ---------------------------------------------------------------------------
create table reactions (
  piece_id   uuid not null references pieces (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  kind       reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (piece_id, user_id, kind)
);

create index reactions_piece_idx on reactions (piece_id);
create index reactions_user_idx on reactions (user_id, created_at desc);

create or replace function bump_reaction_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update pieces set reaction_count = reaction_count + 1 where id = new.piece_id;
  elsif tg_op = 'DELETE' then
    update pieces set reaction_count = greatest(0, reaction_count - 1) where id = old.piece_id;
  end if;
  return null;
end;
$$;

create trigger reactions_count_ins after insert on reactions
  for each row execute function bump_reaction_count();
create trigger reactions_count_del after delete on reactions
  for each row execute function bump_reaction_count();

-- ---------------------------------------------------------------------------
-- comments — <=500 chars; artist can close per-post (pieces.comments_closed).
-- ---------------------------------------------------------------------------
create table comments (
  id         uuid primary key default gen_random_uuid(),
  piece_id   uuid not null references pieces (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  status     comment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_piece_idx on comments (piece_id, created_at desc) where status = 'active';

create trigger comments_updated_at before update on comments
  for each row execute function set_updated_at();

create or replace function bump_comment_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.status = 'active' then
    update pieces set comment_count = comment_count + 1 where id = new.piece_id;
  elsif tg_op = 'DELETE' and old.status = 'active' then
    update pieces set comment_count = greatest(0, comment_count - 1) where id = old.piece_id;
  elsif tg_op = 'UPDATE' and old.status <> new.status then
    if new.status = 'active' then
      update pieces set comment_count = comment_count + 1 where id = new.piece_id;
    elsif old.status = 'active' then
      update pieces set comment_count = greatest(0, comment_count - 1) where id = new.piece_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger comments_count_ins after insert on comments
  for each row execute function bump_comment_count();
create trigger comments_count_del after delete on comments
  for each row execute function bump_comment_count();
create trigger comments_count_upd after update on comments
  for each row execute function bump_comment_count();

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------
create table follows (
  follower_id  uuid not null references profiles (id) on delete cascade,
  following_id uuid not null references profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create index follows_following_idx on follows (following_id, created_at desc);
create index follows_follower_idx on follows (follower_id, created_at desc);

create or replace function bump_follow_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update profiles set following_count = following_count + 1 where id = new.follower_id;
    update profiles set follower_count = follower_count + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' then
    update profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update profiles set follower_count = greatest(0, follower_count - 1) where id = old.following_id;
  end if;
  return null;
end;
$$;

create trigger follows_count_ins after insert on follows
  for each row execute function bump_follow_counts();
create trigger follows_count_del after delete on follows
  for each row execute function bump_follow_counts();

-- ---------------------------------------------------------------------------
-- collections (Are.na-style boards) + items + follows
-- ---------------------------------------------------------------------------
create table collections (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references profiles (id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 60),
  slug           text not null check (slug ~ '^[a-z0-9-]{1,80}$'),
  description    text check (description is null or char_length(description) <= 280),
  is_public      boolean not null default true,
  item_count     integer not null default 0,
  follower_count integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (owner_id, slug)
);

create index collections_owner_idx on collections (owner_id, updated_at desc);
create index collections_public_idx on collections (is_public, updated_at desc) where is_public;

create trigger collections_updated_at before update on collections
  for each row execute function set_updated_at();

create table collection_items (
  collection_id uuid not null references collections (id) on delete cascade,
  piece_id      uuid not null references pieces (id) on delete cascade,
  note          text check (note is null or char_length(note) <= 280),
  position      integer not null default 0,
  added_at      timestamptz not null default now(),
  primary key (collection_id, piece_id)
);

create index collection_items_piece_idx on collection_items (piece_id);
create index collection_items_order_idx on collection_items (collection_id, position, added_at desc);

create or replace function bump_collection_item_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update collections set item_count = item_count + 1, updated_at = now() where id = new.collection_id;
  elsif tg_op = 'DELETE' then
    update collections set item_count = greatest(0, item_count - 1), updated_at = now() where id = old.collection_id;
  end if;
  return null;
end;
$$;

create trigger collection_items_count_ins after insert on collection_items
  for each row execute function bump_collection_item_count();
create trigger collection_items_count_del after delete on collection_items
  for each row execute function bump_collection_item_count();

create table collection_follows (
  follower_id   uuid not null references profiles (id) on delete cascade,
  collection_id uuid not null references collections (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, collection_id)
);

create or replace function bump_collection_follow_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update collections set follower_count = follower_count + 1 where id = new.collection_id;
  elsif tg_op = 'DELETE' then
    update collections set follower_count = greatest(0, follower_count - 1) where id = old.collection_id;
  end if;
  return null;
end;
$$;

create trigger collection_follows_count_ins after insert on collection_follows
  for each row execute function bump_collection_follow_count();
create trigger collection_follows_count_del after delete on collection_follows
  for each row execute function bump_collection_follow_count();

-- ---------------------------------------------------------------------------
-- reports — moderation intake (readable by admins only, via RLS)
-- ---------------------------------------------------------------------------
create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles (id) on delete set null,
  target_type report_target not null,
  target_id   uuid not null,
  reason      report_reason not null,
  detail      text check (detail is null or char_length(detail) <= 1000),
  status      report_status not null default 'open',
  resolved_by uuid references profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index reports_open_idx on reports (status, created_at desc);
create index reports_target_idx on reports (target_type, target_id);

-- ---------------------------------------------------------------------------
-- scout_waitlist — /scout email capture (verified-human corpus pitch)
-- ---------------------------------------------------------------------------
create table scout_waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null unique,
  org        text check (org is null or char_length(org) <= 120),
  role       text check (role is null or char_length(role) <= 60),
  note       text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rate_limits — sliding-window event log
-- ---------------------------------------------------------------------------
create table rate_limits (
  id         bigint generated always as identity primary key,
  subject    text not null,   -- auth.uid()::text or an ip hash for anon flows
  action     text not null,   -- 'post' | 'comment' | 'react' | 'report' | 'search' | 'auth'
  created_at timestamptz not null default now()
);

create index rate_limits_window_idx on rate_limits (subject, action, created_at desc);
