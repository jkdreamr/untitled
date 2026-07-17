-- ============================================================================
-- UNTITLED — 0010 private dashboard RPC
-- Counts are revoked from clients (quiet-mode masking), so the owner reads their
-- own totals through this SECURITY DEFINER RPC, which only ever returns
-- auth.uid()'s own data.
-- ============================================================================

create or replace function get_my_dashboard()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'totals', jsonb_build_object(
      'pieces',    (select count(*) from pieces where artist_id = auth.uid() and status = 'active'),
      'reactions', (select coalesce(sum(reaction_count), 0) from pieces where artist_id = auth.uid() and status <> 'deleted'),
      'listens',   (select coalesce(sum(listen_count), 0) from pieces where artist_id = auth.uid() and status <> 'deleted'),
      'views',     (select coalesce(sum(view_count), 0) from pieces where artist_id = auth.uid() and status <> 'deleted'),
      'comments',  (select coalesce(sum(comment_count), 0) from pieces where artist_id = auth.uid() and status <> 'deleted'),
      'followers', (select follower_count from profiles where id = auth.uid())
    ),
    'recent_followers', coalesce((
      select jsonb_agg(jsonb_build_object('handle', handle, 'display_name', display_name, 'avatar_path', avatar_path, 'since', since))
      from (
        select p.handle, p.display_name, p.avatar_path, f.created_at as since
        from follows f join profiles p on p.id = f.follower_id
        where f.following_id = auth.uid()
        order by f.created_at desc limit 12
      ) x
    ), '[]'::jsonb),
    'pieces', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'sequence_no', sequence_no, 'medium', medium,
        'reactions', reaction_count, 'comments', comment_count, 'listens', listen_count,
        'views', view_count, 'published_at', published_at))
      from (
        select id, title, sequence_no, medium, reaction_count, comment_count, listen_count, view_count, published_at
        from pieces where artist_id = auth.uid() and status = 'active'
        order by published_at desc limit 60
      ) s
    ), '[]'::jsonb)
  ) end;
$$;

revoke execute on function get_my_dashboard() from public;
grant execute on function get_my_dashboard() to authenticated;
