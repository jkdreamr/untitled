-- ============================================================================
-- UNTITLED — 0011 moderation: account suspension
-- Admins can suspend; a suspended account cannot post. Users cannot clear their
-- own suspension (column update revoked from authenticated).
-- ============================================================================

alter table profiles add column suspended boolean not null default false;

revoke update (suspended) on profiles from authenticated;

-- block posting while suspended
drop policy if exists pieces_insert_own on pieces;
create policy pieces_insert_own on pieces for insert
  with check (
    artist_id = auth.uid()
    and not coalesce((select suspended from profiles where id = auth.uid()), false)
  );

-- admin moderation helper: resolve a report and record who/when
create or replace function resolve_report(p_report_id uuid, p_status report_status)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update reports
     set status = p_status, resolved_by = auth.uid(), resolved_at = now()
   where id = p_report_id;
end;
$$;

revoke execute on function resolve_report(uuid, report_status) from public;
grant execute on function resolve_report(uuid, report_status) to authenticated;
