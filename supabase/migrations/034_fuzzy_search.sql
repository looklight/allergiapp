-- 034: Fuzzy search per nome ristorante (pg_trgm + GIN index)
-- Usato dall'autocomplete nella barra di ricerca mappa

-- 1. Abilita estensione pg_trgm (trigram matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Indice GIN per ricerca fuzzy sul nome
CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm
  ON restaurants USING GIN (name gin_trgm_ops);

-- 3. RPC: ricerca ristoranti per nome (leggera, per autocomplete)
CREATE OR REPLACE FUNCTION search_restaurants_by_name(
  query TEXT,
  user_lat DOUBLE PRECISION DEFAULT NULL,
  user_lng DOUBLE PRECISION DEFAULT NULL,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  average_rating NUMERIC,
  distance_km DOUBLE PRECISION,
  similarity_score REAL
) AS $$
BEGIN
  max_results := LEAST(max_results, 20);

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.city,
    r.country,
    ST_Y(r.location::geometry) AS latitude,
    ST_X(r.location::geometry) AS longitude,
    COALESCE(ROUND(AVG(rev.rating)::numeric, 1), 0) AS average_rating,
    CASE
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL AND r.location IS NOT NULL
      THEN ST_Distance(
        r.location,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
      ) / 1000.0
      ELSE NULL
    END AS distance_km,
    similarity(r.name, query) AS similarity_score
  FROM restaurants r
  LEFT JOIN reviews rev ON r.id = rev.restaurant_id
  WHERE r.location IS NOT NULL
    AND (similarity(r.name, query) > 0.15 OR r.name ILIKE '%' || query || '%')
  GROUP BY r.id
  ORDER BY similarity(r.name, query) DESC, r.name
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;
