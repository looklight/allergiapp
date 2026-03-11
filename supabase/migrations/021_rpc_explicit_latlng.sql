-- Migrazione: restituisci latitude/longitude espliciti dalle RPC
-- Elimina la dipendenza dal parsing GEOGRAPHY→GeoJSON lato client

-- ═══ 1. get_nearby_restaurants ═══════════════════════════════════════════════
DROP FUNCTION IF EXISTS get_nearby_restaurants(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE FUNCTION get_nearby_restaurants(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 5,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
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
  distance_km DOUBLE PRECISION,
  review_count BIGINT,
  average_rating NUMERIC,
  favorite_count BIGINT
) AS $$
BEGIN
  radius_km := LEAST(radius_km, 50);
  max_results := LEAST(max_results, 200);

  RETURN QUERY
  SELECT
    r.id, r.name, r.address, r.city, r.country,
    ST_Y(r.location::geometry) AS latitude,
    ST_X(r.location::geometry) AS longitude,
    r.phone, r.website, r.cuisine_types, r.price_range, r.photo_urls,
    r.added_by, r.owner_id, r.google_place_id, r.is_premium, r.subscription_status,
    r.subscription_expires_at, r.created_at, r.updated_at,
    ST_Distance(r.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) / 1000.0 AS distance_km,
    COALESCE(rev.cnt, 0) AS review_count,
    COALESCE(ROUND(rev.avg_r, 1), 0) AS average_rating,
    COALESCE(fav.cnt, 0) AS favorite_count
  FROM restaurants r
  LEFT JOIN (
    SELECT restaurant_id, COUNT(*) AS cnt, AVG(rating)::numeric AS avg_r
    FROM reviews GROUP BY restaurant_id
  ) rev ON r.id = rev.restaurant_id
  LEFT JOIN (
    SELECT restaurant_id, COUNT(*) AS cnt
    FROM favorites GROUP BY restaurant_id
  ) fav ON r.id = fav.restaurant_id
  WHERE ST_DWithin(
    r.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_km * 1000
  )
  ORDER BY r.is_premium DESC, distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═══ 2. get_restaurants_for_my_needs ═════════════════════════════════════════
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
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
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
  distance_km DOUBLE PRECISION,
  review_count BIGINT,
  average_rating NUMERIC,
  favorite_count BIGINT,
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
    SELECT mr.restaurant_id,
      COUNT(DISTINCT fa)::INTEGER AS covered
    FROM matching_revs mr
    CROSS JOIN unnest(filter_allergens) AS fa
    WHERE fa = ANY(mr.allergens_snapshot)
    GROUP BY mr.restaurant_id
  ),
  dietary_coverage AS (
    SELECT mr.restaurant_id,
      COUNT(DISTINCT fd)::INTEGER AS covered
    FROM matching_revs mr
    CROSS JOIN unnest(filter_dietary) AS fd
    WHERE fd = ANY(mr.dietary_snapshot)
    GROUP BY mr.restaurant_id
  )
  SELECT
    gr.id, gr.name, gr.address, gr.city, gr.country,
    ST_Y(gr.location::geometry) AS latitude,
    ST_X(gr.location::geometry) AS longitude,
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
  ORDER BY
    gr.is_premium DESC,
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

-- ═══ 3. get_all_restaurants (nuova — sostituisce SELECT * + batchLoadStats) ═
CREATE OR REPLACE FUNCTION get_all_restaurants(
  max_results INTEGER DEFAULT 200
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
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
  review_count BIGINT,
  average_rating NUMERIC,
  favorite_count BIGINT
) AS $$
BEGIN
  max_results := LEAST(max_results, 200);

  RETURN QUERY
  SELECT
    r.id, r.name, r.address, r.city, r.country,
    ST_Y(r.location::geometry) AS latitude,
    ST_X(r.location::geometry) AS longitude,
    r.phone, r.website, r.cuisine_types, r.price_range, r.photo_urls,
    r.added_by, r.owner_id, r.google_place_id, r.is_premium, r.subscription_status,
    r.subscription_expires_at, r.created_at, r.updated_at,
    COALESCE(rev.cnt, 0) AS review_count,
    COALESCE(ROUND(rev.avg_r, 1), 0) AS average_rating,
    COALESCE(fav.cnt, 0) AS favorite_count
  FROM restaurants r
  LEFT JOIN (
    SELECT restaurant_id, COUNT(*) AS cnt, AVG(rating)::numeric AS avg_r
    FROM reviews GROUP BY restaurant_id
  ) rev ON r.id = rev.restaurant_id
  LEFT JOIN (
    SELECT restaurant_id, COUNT(*) AS cnt
    FROM favorites GROUP BY restaurant_id
  ) fav ON r.id = fav.restaurant_id
  ORDER BY r.is_premium DESC, r.created_at DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;
