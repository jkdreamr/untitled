-- ============================================================================
-- UNTITLED — 0013 pg_cron
-- Nightly materialization of recommendation neighborhoods. Enrichment draining
-- is driven separately by a Vercel Cron hitting /api/enrichment/run (see
-- vercel.json) so it can call the AI providers from the Node runtime.
-- ============================================================================

create extension if not exists pg_cron;

select cron.schedule(
  'refresh-recommendations',
  '0 4 * * *',
  $$ select public.refresh_recommendations(); $$
);
