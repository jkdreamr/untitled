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
select plan(22);

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

select * from finish();
rollback;
