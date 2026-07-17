-- ============================================================================
-- UNTITLED — 0001 core
-- Extensions, enums, helper functions, and the primary content tables.
-- RLS is enabled here but policies live in 0003_rls.sql.
-- ============================================================================

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- enums
-- ---------------------------------------------------------------------------
create type medium as enum ('sound', 'video', 'image', 'words');
create type visibility as enum ('public', 'followers', 'unlisted');
create type piece_status as enum ('active', 'hidden', 'deleted');
create type media_kind as enum ('audio', 'image', 'video');
create type reaction_kind as enum ('keep_going', 'felt_this', 'on_repeat', 'teach_me');
create type user_role as enum ('artist', 'admin');
create type search_status as enum ('pending', 'partial', 'ready', 'error');
create type job_stage as enum ('embed', 'describe', 'transcribe', 'index');
create type job_status as enum ('pending', 'processing', 'done', 'error', 'skipped');
create type report_target as enum ('piece', 'comment', 'profile');
create type report_reason as enum ('ai_generated', 'stolen', 'harassment', 'explicit', 'other');
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type comment_status as enum ('active', 'hidden', 'deleted');

-- ---------------------------------------------------------------------------
-- helper functions
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Reserved handles: routes, brand, and impersonation risks. IMMUTABLE for CHECK use.
create or replace function is_reserved_handle(h text)
returns boolean
language sql
immutable
as $$
  select lower(h) = any (array[
    'admin','administrator','api','app','auth','about','account','settings','support',
    'scout','untitled','novum','help','home','feed','wander','explore','discover',
    'search','collections','collection','piece','pieces','profile','profiles','post',
    'posts','upload','compose','new','edit','delete','onboarding','dashboard','notifications',
    'login','logout','signin','signup','register','verify','callback','reset','me','you',
    'user','users','u','artist','artists','terms','privacy','dmca','legal','report','reports',
    'null','undefined','root','system','staff','team','mod','moderator','www','mail','ftp',
    'static','public','assets','_next','favicon'
  ]);
$$;

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  handle        citext not null unique
                  check (handle ~ '^[a-z0-9_]{3,20}$' and not is_reserved_handle(handle)),
  display_name  text not null check (char_length(display_name) between 1 and 40),
  bio           text check (char_length(bio) <= 160),
  links         jsonb not null default '[]'::jsonb,
  interests     text[] not null default '{}',
  avatar_path   text,
  quiet_mode    boolean not null default false,
  role          user_role not null default 'artist',
  onboarded     boolean not null default false,
  -- monotonic lifetime piece counter -> "untitled no. {n}" is stable across deletes
  piece_seq       integer not null default 0,
  follower_count  integer not null default 0,
  following_count integer not null default 0,
  pinned_piece_id uuid,   -- FK added after pieces exists
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- pieces
-- ---------------------------------------------------------------------------
create table pieces (
  id             uuid primary key default gen_random_uuid(),
  artist_id      uuid not null references profiles (id) on delete cascade,
  medium         medium not null,
  title          text check (title is null or char_length(title) <= 120),
  caption        text check (caption is null or char_length(caption) <= 280),
  tags           text[] not null default '{}',
  visibility     visibility not null default 'public',
  after_piece_id uuid references pieces (id) on delete set null,
  sequence_no    integer not null,
  status         piece_status not null default 'active',
  -- human-made attestation is required to publish (enforced in server + here)
  attested       boolean not null default false,
  comments_closed boolean not null default false,
  mux_asset_id    text,
  mux_playback_id text,
  -- denormalized counters (masked for quiet-mode artists at the read layer)
  reaction_count integer not null default 0,
  comment_count  integer not null default 0,
  listen_count   bigint not null default 0,
  view_count     bigint not null default 0,
  published_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint after_not_self check (after_piece_id is null or after_piece_id <> id),
  constraint attested_when_active check (status <> 'active' or attested = true)
);

-- profile pinned piece FK (added now that pieces exists)
alter table profiles
  add constraint profiles_pinned_piece_fk
  foreign key (pinned_piece_id) references pieces (id) on delete set null;

create trigger pieces_updated_at
  before update on pieces
  for each row execute function set_updated_at();

-- assign the per-artist monotonic sequence number on insert
create or replace function assign_piece_sequence()
returns trigger
language plpgsql
as $$
declare
  next_seq integer;
begin
  update profiles
     set piece_seq = piece_seq + 1
   where id = new.artist_id
  returning piece_seq into next_seq;

  if next_seq is null then
    raise exception 'artist profile % does not exist', new.artist_id;
  end if;

  new.sequence_no := next_seq;
  return new;
end;
$$;

create trigger pieces_assign_sequence
  before insert on pieces
  for each row execute function assign_piece_sequence();

-- ---------------------------------------------------------------------------
-- piece_media
-- ---------------------------------------------------------------------------
create table piece_media (
  id               uuid primary key default gen_random_uuid(),
  piece_id         uuid not null references pieces (id) on delete cascade,
  kind             media_kind not null,
  storage_path     text,             -- Supabase Storage path (audio/image); null for Mux video
  width            integer,
  height           integer,
  duration_seconds numeric(7,2),
  peaks            jsonb,            -- ~800 normalized waveform peaks for audio
  blurhash         text,            -- image placeholder
  mime             text,
  bytes            bigint,
  position         integer not null default 0,  -- ordering within an image "roll"
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- indexes — every feed / profile / lookup path is covered
-- ---------------------------------------------------------------------------
-- Following feed & profile grids read active+visible pieces newest-first: keyset on (published_at, id).
create index pieces_feed_idx
  on pieces (published_at desc, id desc)
  where status = 'active';

create index pieces_artist_idx
  on pieces (artist_id, published_at desc, id desc)
  where status = 'active';

create index pieces_artist_medium_idx
  on pieces (artist_id, medium, published_at desc)
  where status = 'active';

create index pieces_visibility_idx
  on pieces (visibility, status, published_at desc);

create index pieces_after_idx on pieces (after_piece_id) where after_piece_id is not null;
create index pieces_tags_gin on pieces using gin (tags);

create index piece_media_piece_idx on piece_media (piece_id, position);

comment on column profiles.piece_seq is 'Monotonic lifetime piece counter; source of "untitled no. {n}". Never decremented.';
comment on column pieces.sequence_no is 'The artist''s nth piece ever. Stable across deletion.';
comment on table piece_media is 'Concrete media rows. Audio carries peaks; images carry blurhash; video lives in Mux (storage_path null).';
