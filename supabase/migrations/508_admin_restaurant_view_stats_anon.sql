-- Migration 508: estende get_restaurant_view_stats (mig 506) con i contatori
-- ANONIMI di restaurant_view_counts (mig 082 su main, applicata 2026-07-30).
--
-- Due sorgenti per le aperture scheda:
-- - analytics_events 'restaurant_viewed' (consent-gated, dalle build >=1.1.0):
--   sottostima il reale ma conosce gli utenti unici.
-- - restaurant_view_counts (anonimo, nessun dato personale, conta tutti):
--   alimentato dal client via bump_restaurant_view a partire dalla prima
--   build che lo include; solo aperture, niente utenti unici.
-- Entrambi contano dal giorno di attivazione, nessun retroattivo.
--
-- get_restaurant_view_stats(target_restaurant_id) —
--   total_views   : aperture consenzienti totali
--   views_30d     : aperture consenzienti ultimi 30 giorni
--   unique_viewers: utenti loggati distinti (solo consenzienti)
--   anon_total    : aperture anonime totali (tutti gli utenti)
--   anon_30d      : aperture anonime ultimi 30 giorni (bucket Europe/Rome)

DROP FUNCTION IF EXISTS get_restaurant_view_stats(uuid);

CREATE FUNCTION get_restaurant_view_stats(target_restaurant_id uuid)
RETURNS TABLE (
  total_views int,
  views_30d int,
  unique_viewers int,
  anon_total int,
  anon_30d int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    consented.total_views,
    consented.views_30d,
    consented.unique_viewers,
    anon.anon_total,
    anon.anon_30d
  FROM (
    SELECT
      COUNT(*)::int AS total_views,
      (COUNT(*) FILTER (WHERE ae.created_at > now() - interval '30 days'))::int AS views_30d,
      COUNT(DISTINCT ae.user_id)::int AS unique_viewers
    FROM analytics_events ae
    WHERE ae.event_name = 'restaurant_viewed'
      AND ae.properties->>'restaurant_id' = target_restaurant_id::text
  ) consented
  CROSS JOIN (
    SELECT
      COALESCE(SUM(rvc.count), 0)::int AS anon_total,
      COALESCE(SUM(rvc.count) FILTER (
        WHERE rvc.day > (now() AT TIME ZONE 'Europe/Rome')::date - 30
      ), 0)::int AS anon_30d
    FROM restaurant_view_counts rvc
    WHERE rvc.restaurant_id = target_restaurant_id
  ) anon
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION get_restaurant_view_stats(uuid) TO authenticated;
