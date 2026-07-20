-- ============================================================================
-- 0023 — scout foundation: accounts, gating, consent
-- ----------------------------------------------------------------------------
-- Adds a first-class "scout" account type kept OUT of the user_role enum (so
-- user_role stays artist|admin and one person can be both an artist and a
-- scout), an is_scout() predicate mirroring is_admin() (0003), an admin-only
-- grant_scout() provisioning RPC, and the visible_to_scouts consent toggle on
-- profiles (default ON, threaded through the 0014 column-grant allowlist so it
-- stays client-writable).
--
-- Nothing here is reachable by any consumer surface. Scout data is read only
-- through the scout-gated SECURITY DEFINER RPCs added in 0025/0026.
-- ============================================================================

create type scout_status as enum ('pending', 'approved', 'revoked');

create table scout_accounts (
  profile_id  uuid primary key references profiles (id) on delete cascade,
  org_name    text not null check (char_length(org_name) between 1 and 120),
  status      scout_status not null default 'pending',
  granted_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table scout_accounts enable row level security;
revoke all on scout_accounts from anon, authenticated;
-- A scout may read their OWN row (to learn their status); nobody reads others'.
-- All writes go through grant_scout() (SECURITY DEFINER) — never a direct write.
grant select on scout_accounts to authenticated;
create policy scout_accounts_select_self
  on scout_accounts for select using (profile_id = auth.uid());

-- --- is_scout(): approved-scout predicate (mirrors is_admin, 0003:13) --------
create or replace function is_scout()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from scout_accounts where profile_id = auth.uid() and status = 'approved'
  );
$$;

-- --- grant_scout(): admin-only provisioning (no public path to scout) --------
create or replace function grant_scout(p_profile_id uuid, p_org_name text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_admin() then
    raise exception 'only admins can grant scout access' using errcode = '42501';
  end if;
  insert into scout_accounts (profile_id, org_name, status, granted_by)
  values (p_profile_id, p_org_name, 'approved', auth.uid())
  on conflict (profile_id)
  do update set status = 'approved', org_name = excluded.org_name, granted_by = auth.uid();
end;
$$;

revoke execute on function grant_scout(uuid, text) from public;
grant execute on function grant_scout(uuid, text) to authenticated;  -- body self-gates on is_admin()

-- --- visible_to_scouts consent toggle on profiles ---------------------------
-- Default ON: public work is visible in scout tools unless the artist opts out.
alter table profiles add column visible_to_scouts boolean not null default true;

-- Client-writable, exactly like quiet_mode. A table-level grant would override
-- the 0003/0011 column revokes, so the column must be named in the 0014-style
-- allowlist explicitly (column grants are additive).
grant insert (visible_to_scouts) on profiles to authenticated;
grant update (visible_to_scouts) on profiles to authenticated;
