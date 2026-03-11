-- Feature: "Per le mie esigenze" — filtro ristoranti per compatibilita allergeni
-- Nuova RPC con matching parziale (overlap) + punteggio copertura
-- Indice composito per performance subquery

-- 1. Indice composito: velocizza il filtro review per restaurant
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_rating
  ON reviews (restaurant_id, rating);

-- 2. Nuova RPC: trova ristoranti con review da utenti con allergie simili
--    Usa && (overlap) al posto di @> (containment) per match parziale
DROP FUNCTION IF EXISTS get_restaurants_for_my_needs(
  DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT[],
  DOUBLE PRECISION, INTEGER, INTEGER
);
DROP FUNCTION IF EXISTS get_restaurants_for_my_needs(
  DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT[],
  DOUBLE PRECISION, INTEGER
);

CREATE FUNCTION get_restaurants_for_my_needs(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  filter_allergens TEXT[] DEFAULT '{}',
  filter_dietary TEXT[] DEFAULT '{}',
  radius_km DOUBLE PRECISION DEFAULT 10,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  location GEOGRAPHY,
  phone TEXT,
  website TEXT,
  cuisine_types TEXT[],
  price_range SMALLINT,
  photo_urls TEXT[],
  added_by UUID,
  owner_id UUID,
  google_place_id TEXT,
  is_premium BOOLEAN,
  subscription_status TEXT,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Metriche base
  distance_km DOUBLE PRECISION,
  review_count BIGINT,
  average_rating NUMERIC,
  favorite_count BIGINT,
  -- Metriche matching
  matching_reviews BIGINT,
  matching_avg_rating NUMERIC,
  covered_allergen_count INTEGER,
  covered_dietary_count INTEGER,
  total_allergen_filters INTEGER,
  total_dietary_filters INTEGER
) AS $$
DECLARE
  has_filters BOOLEAN;
BEGIN
  radius_km := LEAST(radius_km, 50);
  max_results := LEAST(max_results, 200);
  has_filters := cardinality(filter_allergens) > 0 OR cardinality(filter_dietary) > 0;

  RETURN QUERY
  WITH geo_restaurants AS (
    -- Ristoranti nel raggio
    SELECT r.*,
      ST_Distance(
        r.location,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      ) / 1000.0 AS dist_km
    FROM restaurants r
    WHERE ST_DWithin(
      r.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
  ),
  all_review_stats AS (
    -- Stats generali (tutte le review)
    SELECT rv.restaurant_id,
      COUNT(*) AS cnt,
      AVG(rv.rating)::numeric AS avg_r
    FROM reviews rv
    WHERE rv.restaurant_id IN (SELECT gr.id FROM geo_restaurants gr)
    GROUP BY rv.restaurant_id
  ),
  fav_stats AS (
    SELECT f.restaurant_id, COUNT(*) AS cnt
    FROM favorites f
    WHERE f.restaurant_id IN (SELECT gr.id FROM geo_restaurants gr)
    GROUP BY f.restaurant_id
  ),
  matching_revs AS (
    -- Review con almeno 1 allergia O dieta in comune
    SELECT rv.restaurant_id, rv.rating,
      rv.allergens_snapshot, rv.dietary_snapshot
    FROM reviews rv
    WHERE rv.restaurant_id IN (SELECT gr.id FROM geo_restaurants gr)
      AND has_filters
      AND (
        (cardinality(filter_allergens) > 0
          AND rv.allergens_snapshot && filter_allergens)
        OR
        (cardinality(filter_dietary) > 0
          AND rv.dietary_snapshot && filter_dietary)
      )
  ),
  match_stats AS (
    SELECT mr.restaurant_id,
      COUNT(*) AS match_cnt,
      AVG(mr.rating)::numeric AS match_avg
    FROM matching_revs mr
    GROUP BY mr.restaurant_id
  ),
  allergen_coverage AS (
    -- Quante allergie dell'utente sono coperte da almeno 1 review
    SELECT mr.restaurant_id,
      COUNT(DISTINCT fa)::INTEGER AS covered
    FROM matching_revs mr
    CROSS JOIN unnest(filter_allergens) AS fa
    WHERE fa = ANY(mr.allergens_snapshot)
    GROUP BY mr.restaurant_id
  ),
  dietary_coverage AS (
    -- Quante preferenze dietetiche sono coperte
    SELECT mr.restaurant_id,
      COUNT(DISTINCT fd)::INTEGER AS covered
    FROM matching_revs mr
    CROSS JOIN unnest(filter_dietary) AS fd
    WHERE fd = ANY(mr.dietary_snapshot)
    GROUP BY mr.restaurant_id
  )
  SELECT
    gr.id, gr.name, gr.address, gr.city, gr.country, gr.location,
    gr.phone, gr.website, gr.cuisine_types, gr.price_range, gr.photo_urls,
    gr.added_by, gr.owner_id, gr.google_place_id, gr.is_premium,
    gr.subscription_status, gr.subscription_expires_at,
    gr.created_at, gr.updated_at,
    gr.dist_km AS distance_km,
    COALESCE(ars.cnt, 0) AS review_count,
    COALESCE(ROUND(ars.avg_r, 1), 0) AS average_rating,
    COALESCE(fs.cnt, 0) AS favorite_count,
    COALESCE(ms.match_cnt, 0) AS matching_reviews,
    COALESCE(ROUND(ms.match_avg, 1), 0) AS matching_avg_rating,
    COALESCE(ac.covered, 0) AS covered_allergen_count,
    COALESCE(dc.covered, 0) AS covered_dietary_count,
    cardinality(filter_allergens)::INTEGER AS total_allergen_filters,
    cardinality(filter_dietary)::INTEGER AS total_dietary_filters
  FROM geo_restaurants gr
  LEFT JOIN all_review_stats ars ON gr.id = ars.restaurant_id
  LEFT JOIN fav_stats fs ON gr.id = fs.restaurant_id
  LEFT JOIN match_stats ms ON gr.id = ms.restaurant_id
  LEFT JOIN allergen_coverage ac ON gr.id = ac.restaurant_id
  LEFT JOIN dietary_coverage dc ON gr.id = dc.restaurant_id
  -- Nessun filtro esclusivo: mostra tutti i ristoranti nel raggio,
  -- quelli con review compatibili salgono in cima grazie all'ORDER BY
  ORDER BY
    gr.is_premium DESC,
    -- Quando filtri attivi: prima i piu coperti, poi piu review, poi vicini
    CASE WHEN has_filters
      THEN COALESCE(ac.covered, 0) + COALESCE(dc.covered, 0)
      ELSE 0
    END DESC,
    CASE WHEN has_filters
      THEN COALESCE(ms.match_cnt, 0)
      ELSE 0
    END DESC,
    gr.dist_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;
