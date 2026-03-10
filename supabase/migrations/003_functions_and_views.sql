-- Funzioni RPC e viste per query complesse
-- NOTA: versione aggiornata con plpgsql + cap parametri + google_place_id

-- ============================================
-- RPC: Ristoranti vicini con PostGIS
-- ============================================
CREATE OR REPLACE FUNCTION get_nearby_restaurants(
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
  location GEOGRAPHY,
  phone TEXT,
  website TEXT,
  cuisine_type TEXT,
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
    r.id, r.name, r.address, r.city, r.country, r.location,
    r.phone, r.website, r.cuisine_type, r.price_range, r.photo_urls,
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

-- ============================================
-- RPC: Ristoranti filtrati per allergeni recensiti
-- ============================================
CREATE OR REPLACE FUNCTION get_restaurants_by_allergens(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10,
  filter_allergens TEXT[] DEFAULT '{}',
  filter_dietary TEXT[] DEFAULT '{}',
  min_rating INTEGER DEFAULT 1,
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
  cuisine_type TEXT,
  price_range SMALLINT,
  photo_urls TEXT[],
  owner_id UUID,
  google_place_id TEXT,
  is_premium BOOLEAN,
  created_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION,
  review_count BIGINT,
  average_rating NUMERIC,
  matching_reviews BIGINT
) AS $$
BEGIN
  radius_km := LEAST(radius_km, 50);
  max_results := LEAST(max_results, 200);

  RETURN QUERY
  SELECT
    r.id, r.name, r.address, r.city, r.country, r.location,
    r.phone, r.website, r.cuisine_type, r.price_range, r.photo_urls,
    r.owner_id, r.google_place_id, r.is_premium, r.created_at,
    ST_Distance(r.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) / 1000.0 AS distance_km,
    COALESCE(rev_all.cnt, 0) AS review_count,
    COALESCE(ROUND(rev_all.avg_r, 1), 0) AS average_rating,
    COALESCE(rev_match.cnt, 0) AS matching_reviews
  FROM restaurants r
  LEFT JOIN (
    SELECT restaurant_id, COUNT(*) AS cnt, AVG(rating)::numeric AS avg_r
    FROM reviews GROUP BY restaurant_id
  ) rev_all ON r.id = rev_all.restaurant_id
  LEFT JOIN (
    SELECT rv.restaurant_id, COUNT(*) AS cnt
    FROM reviews rv
    WHERE rv.rating >= min_rating
      AND (cardinality(filter_allergens) = 0 OR rv.allergens_snapshot @> filter_allergens)
      AND (cardinality(filter_dietary) = 0 OR rv.dietary_snapshot @> filter_dietary)
    GROUP BY rv.restaurant_id
  ) rev_match ON r.id = rev_match.restaurant_id
  WHERE ST_DWithin(
    r.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_km * 1000
  )
  AND (
    cardinality(filter_allergens) = 0 AND cardinality(filter_dietary) = 0
    OR COALESCE(rev_match.cnt, 0) > 0
  )
  ORDER BY r.is_premium DESC, COALESCE(rev_match.cnt, 0) DESC, distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RPC: Statistiche singolo ristorante
-- ============================================
CREATE OR REPLACE FUNCTION get_restaurant_stats(restaurant_uuid UUID)
RETURNS TABLE (
  review_count BIGINT,
  average_rating NUMERIC,
  favorite_count BIGINT,
  dish_count BIGINT
) AS $$
  SELECT
    (SELECT COUNT(*) FROM reviews WHERE restaurant_id = restaurant_uuid),
    (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) FROM reviews WHERE restaurant_id = restaurant_uuid),
    (SELECT COUNT(*) FROM favorites WHERE restaurant_id = restaurant_uuid),
    (SELECT COUNT(*) FROM review_dishes rd JOIN reviews r ON rd.review_id = r.id WHERE r.restaurant_id = restaurant_uuid);
$$ LANGUAGE sql STABLE;
