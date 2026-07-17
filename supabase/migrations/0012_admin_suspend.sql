-- ============================================================================
-- UNTITLED — 0012 admin suspend RPC
-- `suspended` update is revoked from authenticated (incl. admins), so suspension
-- goes through this admin-gated SECURITY DEFINER function, which also hides the
-- suspended artist's active work.
-- ============================================================================

create or replace function suspend_user(p_uid uuid, p_suspended boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update profiles set suspended = p_suspended where id = p_uid;
  if p_suspended then
    update pieces set status = 'hidden' where artist_id = p_uid and status = 'active';
  end if;
end;
$$;

revoke execute on function suspend_user(uuid, boolean) from public;
grant execute on function suspend_user(uuid, boolean) to authenticated;
