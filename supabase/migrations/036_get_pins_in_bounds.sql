-- Pin leggeri (id + coordinate) limitati a un bounding box.
-- Sostituisce get_all_restaurant_positions per il caricamento viewport-based.
-- Usa l'indice spaziale su location (geography) per performance O(log n).
CREATE OR REPLACE FUNCTION get_pins_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  lim integer DEFAULT 1000
)
RETURNS TABLE(id uuid, latitude double precision, longitude double precision)
LANGUAGE sql STABLE
AS $$
  SELECT
    r.id,
    ST_Y(r.location::geometry) AS latitude,
    ST_X(r.location::geometry) AS longitude
  FROM restaurants r
  WHERE r.location IS NOT NULL
    AND r.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
  LIMIT lim;
$$;
