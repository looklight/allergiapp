-- Migration 501: RPC admin per il widget eventi nella dashboard.
-- Tre funzioni read-only sopra `analytics_events` (vedi migration 061 su main),
-- gated da check role='admin' come le altre RPC del range 500+.
--
-- 1. get_event_counts(days)        — conteggi per event_name nell'intervallo
-- 2. get_top_search_queries(days, limit) — top query degli eventi restaurant_search
-- 3. get_recent_events(limit)      — ultimi N eventi con username (JOIN profiles)

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. get_event_counts — counter card per ogni evento
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_event_counts(int);

CREATE FUNCTION get_event_counts(p_days int DEFAULT 30)
RETURNS TABLE (
  event_name text,
  event_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ae.event_name,
    COUNT(*)::int AS event_count
  FROM analytics_events ae
  WHERE ae.created_at > now() - (p_days || ' days')::interval
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  GROUP BY ae.event_name
  ORDER BY event_count DESC;
$$;

GRANT EXECUTE ON FUNCTION get_event_counts(int) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. get_top_search_queries — top query da restaurant_search
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_top_search_queries(int, int);

CREATE FUNCTION get_top_search_queries(p_days int DEFAULT 30, p_limit int DEFAULT 20)
RETURNS TABLE (
  query text,
  query_count int,
  place_count int,
  restaurant_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (ae.properties->>'query')::text AS query,
    COUNT(*)::int AS query_count,
    (COUNT(*) FILTER (WHERE ae.properties->>'selected_kind' = 'place'))::int AS place_count,
    (COUNT(*) FILTER (WHERE ae.properties->>'selected_kind' = 'restaurant'))::int AS restaurant_count
  FROM analytics_events ae
  WHERE ae.event_name = 'restaurant_search'
    AND ae.created_at > now() - (p_days || ' days')::interval
    AND ae.properties->>'query' IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  GROUP BY ae.properties->>'query'
  ORDER BY query_count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_top_search_queries(int, int) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. get_recent_events — live feed (ultimi N eventi con username)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_recent_events(int);

CREATE FUNCTION get_recent_events(p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  event_name text,
  user_id uuid,
  username text,
  is_anonymous boolean,
  properties jsonb,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ae.id,
    ae.event_name,
    ae.user_id,
    p.username,
    COALESCE(p.is_anonymous, false) AS is_anonymous,
    ae.properties,
    ae.created_at
  FROM analytics_events ae
  LEFT JOIN profiles p ON p.id = ae.user_id
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
  ORDER BY ae.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_recent_events(int) TO authenticated;
