-- ============================================================================
-- UNTITLED — RLS tests (pgTAP)
-- Run with: supabase test db   (or psql -f this file against a shadow DB)
-- Verifies the security-critical guarantees from the spec:
--   anon can't read private pieces · user A can't edit B's piece ·
--   artist_id can't be forged · deleted pieces invisible ·
--   quiet-mode artists' counts not exposed via API to others ·
--   piece_search never client-readable.
-- ============================================================================

begin;
select plan(13);

-- ---- fixtures (as the migration/superuser role) -------------------------
-- three auth users: A (author), B (other), Q (quiet-mode author)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev','x',now(),now(),now(),'{}','{}'),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev','x',now(),now(),now(),'{}','{}'),
  ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','q@test.dev','x',now(),now(),now(),'{}','{}')
on conflict (id) do nothing;

insert into profiles (id, handle, display_name, quiet_mode) values
  ('11111111-1111-1111-1111-111111111111','test_a','Artist A', false),
  ('22222222-2222-2222-2222-222222222222','test_b','Artist B', false),
  ('33333333-3333-3333-3333-333333333333','test_q','Artist Q', true);

-- A public piece, A followers-only piece, Q public piece
insert into pieces (id, artist_id, medium, visibility, status, attested, sequence_no) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','words','public','active',true,0),
  ('aaaaaaaa-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','words','followers','active',true,0),
  ('cccccccc-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','words','public','active',true,0);

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
     values ('11111111-1111-1111-1111-111111111111','words','public','active',true,0) $$,
  '42501', null, 'user B CANNOT forge artist_id = A on insert');

-- quiet-mode masking: B sees NULL reaction count for Q's piece via the API
select is(
  (select (piece_card_json('cccccccc-0000-0000-0000-000000000001') -> 'counts' ->> 'reactions')),
  null, 'quiet-mode reaction count is hidden from other users (API)');

-- B can read a public piece via the card RPC
select isnt(
  piece_card_json('aaaaaaaa-0000-0000-0000-000000000001'), null,
  'user B CAN read a public piece via the card RPC');

-- B cannot read Q's raw reaction_count column (revoked)
select throws_ok(
  $$ select reaction_count from pieces where id = 'cccccccc-0000-0000-0000-000000000001' $$,
  '42501', null, 'authenticated CANNOT select the revoked reaction_count column');

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

select * from finish();
rollback;
