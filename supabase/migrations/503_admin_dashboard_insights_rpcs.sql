-- Migration 503: RPC admin per i nuovi pannelli insight della dashboard
-- (sostituiscono il live feed "Ultimi eventi" — get_recent_events resta nel DB, non più usata dalla UI).
-- Stesso pattern della 501: read-only, SECURITY DEFINER, gate role='admin'.
--
-- 1. get_top_viewed_restaurants(days, limit) — schede ristorante più aperte (da restaurant_viewed)
-- 2. get_needs_distribution(limit)           — esigenze più diffuse nei profili utente
-- 3. get_top_filtered_needs(days, limit)     — esigenze più usate nei filtri (da filter_applied, evento in arrivo con la 1.3.0)
-- 4. get_top_saved_restaurants(limit)        — ristoranti più salvati nelle liste (collection_items, dato completo)
-- 5. get_top_cities(days, limit)             — città più attive per recensioni recenti

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. get_top_viewed_restaurants — top schede per aperture
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_top_viewed_restaurants(int, int);

CREATE FUNCTION get_top_viewed_restaurants(p_days int DEFAULT 30, p_limit int DEFAULT 10)
RETURNS TABLE (
  restaurant_id uuid,
  name text,
  city text,
  view_count int,
  viewer_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id AS restaurant_id,
    r.name,
    r.city,
    COUNT(*)::int AS view_count,
    COUNT(DISTINCT ae.user_id)::int AS viewer_count
  FROM analytics_events ae
  JOIN restaurants r
    ON ae.properties->>'restaurant_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND r.id = (ae.properties->>'restaurant_id')::uuid
  WHERE ae.event_name = 'restaurant_viewed'
    AND ae.created_at > now() - (p_days || ' days')::interval
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  GROUP BY r.id, r.name, r.city
  ORDER BY view_count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_top_viewed_restaurants(int, int) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. get_needs_distribution — esigenze dichiarate nei profili (allergens + dietary_preferences)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_needs_distribution(int);

CREATE FUNCTION get_needs_distribution(p_limit int DEFAULT 10)
RETURNS TABLE (
  code text,
  need_type text,
  user_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH all_needs AS (
    SELECT p.id AS profile_id, unnest(p.allergens) AS code FROM profiles p
    UNION ALL
    SELECT p.id, unnest(p.dietary_preferences) FROM profiles p
  )
  SELECT
    n.code,
    COALESCE(a.type, 'other') AS need_type,
    COUNT(DISTINCT n.profile_id)::int AS user_count
  FROM all_needs n
  LEFT JOIN allergens a ON a.code = n.code
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
  GROUP BY n.code, a.type
  ORDER BY user_count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_needs_distribution(int) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. get_top_filtered_needs — esigenze più usate nei filtri mappa/lista
-- Legge l'evento `filter_applied` (properties.needs = array JSON di codici),
-- introdotto nell'app con la 1.3.0: vuoto finché non arrivano dati.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_top_filtered_needs(int, int);

CREATE FUNCTION get_top_filtered_needs(p_days int DEFAULT 30, p_limit int DEFAULT 10)
RETURNS TABLE (
  code text,
  use_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.code,
    COUNT(*)::int AS use_count
  FROM analytics_events ae
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(ae.properties->'needs') = 'array'
         THEN ae.properties->'needs'
         ELSE '[]'::jsonb
    END
  ) AS t(code)
  WHERE ae.event_name = 'filter_applied'
    AND ae.created_at > now() - (p_days || ' days')::interval
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  GROUP BY t.code
  ORDER BY use_count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_top_filtered_needs(int, int) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. get_top_saved_restaurants — ristoranti più presenti nelle liste degli utenti
-- Conta gli utenti distinti (stesso ristorante in più liste = 1), non consent-gated.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_top_saved_restaurants(int);

CREATE FUNCTION get_top_saved_restaurants(p_limit int DEFAULT 10)
RETURNS TABLE (
  restaurant_id uuid,
  name text,
  city text,
  saver_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id AS restaurant_id,
    r.name,
    r.city,
    COUNT(DISTINCT c.user_id)::int AS saver_count
  FROM collection_items ci
  JOIN collections c ON c.id = ci.collection_id
  JOIN restaurants r ON r.id = ci.restaurant_id
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
  GROUP BY r.id, r.name, r.city
  ORDER BY saver_count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_top_saved_restaurants(int) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. get_top_cities — città più attive per recensioni recenti
-- city può essere sporca (Google locality) ma per l'admin va bene così.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_top_cities(int, int);

CREATE FUNCTION get_top_cities(p_days int DEFAULT 30, p_limit int DEFAULT 10)
RETURNS TABLE (
  city text,
  country_code text,
  review_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.city,
    r.country_code,
    COUNT(*)::int AS review_count
  FROM reviews rv
  JOIN restaurants r ON r.id = rv.restaurant_id
  WHERE rv.created_at > now() - (p_days || ' days')::interval
    AND r.city IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  GROUP BY r.city, r.country_code
  ORDER BY review_count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_top_cities(int, int) TO authenticated;
