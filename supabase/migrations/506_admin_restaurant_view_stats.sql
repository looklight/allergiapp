-- Migration 506: RPC admin per le aperture scheda di un singolo ristorante.
-- Read-only sopra `analytics_events` (evento restaurant_viewed, tracciato
-- dall'app dalle build 1.1.0 — vedi migration 061 su main), gated da check
-- role='admin' come le altre RPC del range 500+.
--
-- NOTA CONSENSO: restaurant_viewed parte solo dai client con tracking
-- autorizzato (ATT/GDPR), quindi i conteggi sono una sottostima del reale.
--
-- get_restaurant_view_stats(target_restaurant_id) —
--   total_views  : aperture totali da quando l'evento esiste
--   views_30d    : aperture negli ultimi 30 giorni
--   unique_viewers: utenti loggati distinti (NULL user_id esclusi dal distinct)

DROP FUNCTION IF EXISTS get_restaurant_view_stats(uuid);

CREATE FUNCTION get_restaurant_view_stats(target_restaurant_id uuid)
RETURNS TABLE (
  total_views int,
  views_30d int,
  unique_viewers int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::int AS total_views,
    (COUNT(*) FILTER (WHERE ae.created_at > now() - interval '30 days'))::int AS views_30d,
    COUNT(DISTINCT ae.user_id)::int AS unique_viewers
  FROM analytics_events ae
  WHERE ae.event_name = 'restaurant_viewed'
    AND ae.properties->>'restaurant_id' = target_restaurant_id::text
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION get_restaurant_view_stats(uuid) TO authenticated;
