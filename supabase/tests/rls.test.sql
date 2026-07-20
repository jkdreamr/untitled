-- ============================================================================
-- UNTITLED — RLS + schema tests (pgTAP)
-- Run with: supabase test db   (or psql -f this file against a shadow DB)
-- Verifies the security-critical guarantees from the spec:
--   anon can't read private pieces · user A can't edit B's piece ·
--   artist_id can't be forged · deleted pieces invisible ·
--   quiet-mode artists' counts not exposed via API to others ·
--   piece_search never client-readable (incl. raw transcript segments) ·
--   confirmed lyrics surface on the card but raw transcription never does ·
--   the music pivot's CHECK constraints hold (medium, lyric pairing, roles) ·
--   role escalation via a column write is blocked.
-- ============================================================================

begin;
select plan(41);

-- ---- fixtures (as the migration/superuser role) -------------------------
-- three auth users: A (author), B (other), Q (quiet-mode author)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev','x',now(),now(),now(),'{}','{}'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev','x',now(),now(),now(),'{}','{}'),
  ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','q@test.dev','x',now(),now(),now(),'{}','{}')
on conflict (id) do nothing;

insert into profiles (id, handle, display_name, quiet_mode, roles) values
  ('11111111-1111-1111-1111-111111111111','test_a','Artist A', false, '{vocalist,songwriter}'),
  ('22222222-2222-2222-2222-222222222222','test_b','Artist B', false, '{}'),
  ('33333333-3333-3333-3333-333333333333','test_q','Artist Q', true, '{producer}');

-- A public track (with confirmed lyrics), A followers-only track, Q public track
insert into pieces (id, artist_id, medium, visibility, status, attested, sequence_no, lyrics, lyrics_source) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','sound','public','active',true,0,'hold on to the night','written'),
  ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','sound','followers','active',true,0,null,null),
  ('cccccccc-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','sound','public','active',true,0,null,null);

-- the enqueue trigger already created the piece_search row; stash a RAW (unconfirmed)
-- transcript on the public track — it must never surface on the card or to clients.
update piece_search
   set transcript = 'raw unconfirmed whisper vocals that must never be shown',
       transcript_segments = '[{"start":0,"end":2,"text":"raw unconfirmed"}]'::jsonb
 where piece_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- give Q's piece a reaction from B so its count is > 0
insert into reactions (piece_id, user_id, kind) values
  ('cccccccc-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','felt_this');

-- ================= anon =================
set local role anon;

select is(
  (select count(*) from pieces where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1::bigint, 'anon CAN read a public active piece');

select is(
  (select count(*) from pieces where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  0::bigint, 'anon CANNOT read a followers-only piece');

select throws_ok(
  $$ select reaction_count from pieces where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'anon CANNOT select the revoked reaction_count column');

select throws_ok(
  $$ select embedding from piece_search $$,
  null, null, 'anon CANNOT read piece_search at all');

reset role;

-- ================= user B =================
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

-- IDOR: B cannot edit A's piece (RLS filters the row; caption stays unchanged)
update pieces set caption = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select caption from pieces where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  null, 'user B CANNOT edit user A''s piece');

-- forging artist_id on insert is rejected by the WITH CHECK policy
select throws_ok(
  $$ insert into pieces (artist_id, medium, visibility, status, attested, sequence_no)
     values ('11111111-1111-1111-1111-111111111111','sound','public','active',true,0) $$,
  '42501', null, 'user B CANNOT forge artist_id = A on insert');

-- quiet-mode masking: B sees NULL reaction count for Q's piece via the API
select is(
  (select (piece_card_json('cccccccc-0000-0000-0000-000000000001') -> 'counts' ->> 'reactions')),
  null, 'quiet-mode reaction count is hidden from other users (API)');

-- B can read a public piece via the card RPC
select isnt(
  piece_card_json('aaaaaaaa-0000-0000-0000-000000000001'), null,
  'user B CAN read a public piece via the card RPC');

-- confirmed lyrics ARE exposed on the card
select is(
  (select piece_card_json('aaaaaaaa-0000-0000-0000-000000000001') ->> 'lyrics'),
  'hold on to the night', 'confirmed lyrics surface on the card');

-- the card NEVER carries a raw transcript / transcript_segments key
select is(
  (select (piece_card_json('aaaaaaaa-0000-0000-0000-000000000001') ? 'transcript'
        or piece_card_json('aaaaaaaa-0000-0000-0000-000000000001') ? 'transcript_segments')),
  false, 'raw transcription is never exposed on the card');

-- B cannot read the raw transcript segments column (whole table revoked)
select throws_ok(
  $$ select transcript_segments from piece_search where piece_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'authenticated CANNOT read raw transcript_segments');

-- B cannot read Q's raw reaction_count column (revoked)
select throws_ok(
  $$ select reaction_count from pieces where id = 'cccccccc-0000-0000-0000-000000000001' $$,
  '42501', null, 'authenticated CANNOT select the revoked reaction_count column');

-- privilege escalation: authenticated cannot write the role column (not granted)
select throws_ok(
  $$ update profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'authenticated CANNOT escalate their own role (column not granted)');

-- lyric intelligence: the raw transcription is invisible to a non-owner
select is(
  get_pending_transcription('aaaaaaaa-0000-0000-0000-000000000001') is null,
  true, 'raw transcription is hidden from a non-owner');

-- and a non-owner cannot confirm lyrics onto someone else's track
select throws_ok(
  $$ select confirm_lyrics('aaaaaaaa-0000-0000-0000-000000000001', 'hijacked lyrics', '[]'::jsonb) $$,
  null, null, 'user B CANNOT confirm lyrics on user A''s track');

reset role;

-- ================= user A (owner) may review their transcription =================
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select is(
  get_pending_transcription('aaaaaaaa-0000-0000-0000-000000000001') is not null,
  true, 'the track owner CAN see the raw transcription to confirm it');

reset role;

-- ================= user Q (owner) sees own counts =================
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select is(
  (select (piece_card_json('cccccccc-0000-0000-0000-000000000001') -> 'counts' ->> 'reactions')),
  '1', 'quiet-mode artist SEES their own reaction count');

reset role;

-- ================= deleted pieces invisible =================
update pieces set status = 'deleted' where id = 'aaaaaaaa-0000-0000-0000-000000000001';

set local role anon;
select is(
  (select count(*) from pieces where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint, 'deleted pieces are invisible to anon');
reset role;

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;
select is(
  (select count(*) from pieces where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0::bigint, 'deleted pieces are invisible even to their author');
reset role;

-- ================= music-pivot CHECK constraints (superuser) =================
-- CHECK constraints bind everyone, including the table owner.
select throws_ok(
  $$ insert into pieces (artist_id, medium, visibility, status, attested, sequence_no)
     values ('11111111-1111-1111-1111-111111111111','words','public','active',true,0) $$,
  '23514', null, 'medium is constrained to music (sound/video) — words is rejected');

select throws_ok(
  $$ insert into pieces (artist_id, medium, visibility, status, attested, sequence_no, lyric_segments)
     values ('11111111-1111-1111-1111-111111111111','sound','public','active',true,0,'[]'::jsonb) $$,
  '23514', null, 'lyric_segments require lyric text');

select throws_ok(
  $$ update profiles set roles = '{wizard}' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'profiles.roles rejects values outside the allowed set');

-- ============================================================================
-- SIGNALS + SCOUT (workstream B): the backend/gated layer must never leak into
-- consumer surfaces, and must honor consent + gating at every edge.
-- ============================================================================
reset role;
select set_config('request.jwt.claims', '', true);

-- fixtures: two approved scouts and three artists —
--   V visible + open_to (findable, contactable),
--   H opted out of scouts (visible_to_scouts=false),
--   U visible but no open_to (findable, uncontactable).
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('44444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-000000000000','authenticated','authenticated','s@test.dev','x',now(),now(),now(),'{}','{}'),
  ('55555555-5555-5555-5555-555555555555','00000000-0000-0000-0000-000000000000','authenticated','authenticated','s2@test.dev','x',now(),now(),now(),'{}','{}'),
  ('66666666-6666-6666-6666-666666666666','00000000-0000-0000-0000-000000000000','authenticated','authenticated','v@test.dev','x',now(),now(),now(),'{}','{}'),
  ('77777777-7777-7777-7777-777777777777','00000000-0000-0000-0000-000000000000','authenticated','authenticated','h@test.dev','x',now(),now(),now(),'{}','{}'),
  ('88888888-8888-8888-8888-888888888888','00000000-0000-0000-0000-000000000000','authenticated','authenticated','u@test.dev','x',now(),now(),now(),'{}','{}')
on conflict (id) do nothing;

insert into profiles (id, handle, display_name, onboarded, roles, open_to, visible_to_scouts) values
  ('44444444-4444-4444-4444-444444444444','test_scout','Scout One', true, '{}', '{}', true),
  ('55555555-5555-5555-5555-555555555555','test_scout2','Scout Two', true, '{}', '{}', true),
  ('66666666-6666-6666-6666-666666666666','test_vis','Visible Artist', true, '{vocalist}', '{collabs}', true),
  ('77777777-7777-7777-7777-777777777777','test_hidden','Hidden Artist', true, '{vocalist}', '{collabs}', false),
  ('88888888-8888-8888-8888-888888888888','test_uncontact','No-OpenTo Artist', true, '{vocalist}', '{}', true);

insert into scout_accounts (profile_id, org_name, status) values
  ('44444444-4444-4444-4444-444444444444','Test Label','approved'),
  ('55555555-5555-5555-5555-555555555555','Other Label','approved');

insert into pieces (id, artist_id, medium, visibility, status, attested, sequence_no) values
  ('66660000-0000-0000-0000-000000000001','66666666-6666-6666-6666-666666666666','sound','public','active',true,0),
  ('77770000-0000-0000-0000-000000000001','77777777-7777-7777-7777-777777777777','sound','public','active',true,0),
  ('88880000-0000-0000-0000-000000000001','88888888-8888-8888-8888-888888888888','sound','public','active',true,0);

-- a suspended (moderated) artist: visible_to_scouts stays true, but `suspended`
-- must still hide them from every scout surface
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('99999999-9999-9999-9999-999999999999','00000000-0000-0000-0000-000000000000','authenticated','authenticated','susp@test.dev','x',now(),now(),now(),'{}','{}')
on conflict (id) do nothing;
insert into profiles (id, handle, display_name, onboarded, roles, open_to, visible_to_scouts, suspended)
values ('99999999-9999-9999-9999-999999999999','test_susp','Suspended', true, '{vocalist}', '{collabs}', true, true);

-- (B0.1) no consumer RPC references any signals/scout/notification table
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('get_following_feed','get_wander_pool','search_pieces','search_artists','refresh_recommendations','piece_card_json')
       and p.prosrc ~* '(artist_signals_daily|artist_momentum|scout_queries|listen_events|scout_accounts|scout_lists|scout_saved_searches|scout_list_items|notifications)'),
  0::bigint, 'no consumer RPC references a signals/scout/notification table');

-- ---- as a plain authenticated user (U, not a scout) ----------------------
set local request.jwt.claims to '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$ select score from artist_momentum $$,
  '42501', null, 'authenticated CANNOT read artist_momentum (internal)');
select throws_ok(
  $$ select quartile from listen_events $$,
  '42501', null, 'authenticated CANNOT read listen_events (internal)');
select throws_ok(
  $$ insert into scout_accounts (profile_id, org_name, status)
     values ('88888888-8888-8888-8888-888888888888','Sneaky','approved') $$,
  '42501', null, 'authenticated CANNOT self-provision a scout account');
select throws_ok(
  $$ select scout_search_artists('', null, null, null, null, null, 'momentum', 10) $$,
  '42501', null, 'a non-scout CANNOT run scout_search_artists');
select throws_ok(
  $$ select send_scout_contact('66666666-6666-6666-6666-666666666666','hi') $$,
  '42501', null, 'a non-scout CANNOT send a scout contact');
reset role;

-- ---- as an approved scout (S) --------------------------------------------
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from scout_search_artists('', null, null, null, null, null, 'momentum', 50)
     where (artist->>'id') = '66666666-6666-6666-6666-666666666666'),
  1::bigint, 'scout search surfaces a visible artist');
select is(
  (select count(*) from scout_search_artists('', null, null, null, null, null, 'momentum', 50)
     where (artist->>'id') = '77777777-7777-7777-7777-777777777777'),
  0::bigint, 'scout search HIDES an artist who opted out (visible_to_scouts=false)');
select ok(
  scout_artist_signals('77777777-7777-7777-7777-777777777777') is null,
  'scout_artist_signals returns null for an opted-out artist');
select ok(
  scout_artist_signals('66666666-6666-6666-6666-666666666666') is not null,
  'scout_artist_signals returns data for a visible artist');
select ok(
  scout_artist_signals('99999999-9999-9999-9999-999999999999') is null,
  'scout_artist_signals HIDES a suspended artist (even with visible_to_scouts=true)');
select throws_ok(
  $$ select send_scout_contact('88888888-8888-8888-8888-888888888888','hi') $$,
  '22000', null, 'a scout CANNOT contact an artist with no open_to flags');
select throws_ok(
  $$ select send_scout_contact('99999999-9999-9999-9999-999999999999','hi') $$,
  '22000', null, 'a scout CANNOT contact a suspended artist');
select lives_ok(
  $$ select send_scout_contact('66666666-6666-6666-6666-666666666666','loved the take') $$,
  'a scout CAN contact an artist who is open_to');
reset role;

select is(
  (select count(*) from notifications
     where recipient_id = '66666666-6666-6666-6666-666666666666' and kind = 'scout_contact'
       and payload ? 'org' and not (payload ? 'email') and not (payload ? 'scout_id')),
  1::bigint, 'the contact landed as a notification with org but no email/scout identity');

-- ---- private list notes never leak across scouts -------------------------
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;
-- two statements, not a CTE: the item's WITH CHECK must see a *committed* list
-- (a data-modifying CTE inserts both in one snapshot, so the check can't see it)
insert into scout_lists (scout_id, name) values ('44444444-4444-4444-4444-444444444444','watchlist');
insert into scout_list_items (list_id, artist_id, note)
  select id, '66666666-6666-6666-6666-666666666666', 'call their manager'
  from scout_lists where scout_id = '44444444-4444-4444-4444-444444444444' and name = 'watchlist';
reset role;

set local request.jwt.claims to '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;
select is(
  (select count(*) from scout_list_items),
  0::bigint, 'a scout CANNOT see another scout''s list items or private notes');
reset role;

-- ---- consent toggle is the artist's own, client-writable -----------------
set local request.jwt.claims to '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
set local role authenticated;
select lives_ok(
  $$ update profiles set visible_to_scouts = false where id = '66666666-6666-6666-6666-666666666666' $$,
  'an artist CAN toggle their own visible_to_scouts');
reset role;

-- ---- telemetry write path (owner-excluded, deduped) ----------------------
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;
select record_listen_progress('66660000-0000-0000-0000-000000000001', 50);
reset role;
select set_config('request.jwt.claims', '', true);
select is(
  (select count(*) from listen_events where piece_id = '66660000-0000-0000-0000-000000000001' and quartile = 50),
  1::bigint, 'record_listen_progress writes a listen_event for a non-owner listener');

-- momentum counts only IDENTIFIED listens on public pieces: a guest ping and a
-- non-owner authenticated ping both land in listen_events, but the rollup drops
-- the guest one (so unauthenticated pings can't inflate a scout-facing score).
insert into listen_events (piece_id, listener_id, quartile) values
  ('66660000-0000-0000-0000-000000000001', null, 25),                                     -- guest (excluded)
  ('66660000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 25);   -- identified (counted)
select refresh_artist_signals();
select is(
  (select listens from artist_signals_daily
     where artist_id = '66666666-6666-6666-6666-666666666666' and day = current_date),
  1, 'momentum counts only identified listens on public pieces (guest ping excluded)');

select * from finish();
rollback;
