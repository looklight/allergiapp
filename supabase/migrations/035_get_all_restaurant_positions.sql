-- Restituisce id + coordinate di tutti i ristoranti (query leggera per i pallini mappa)
CREATE OR REPLACE FUNCTION get_all_restaurant_positions()
RETURNS TABLE(id uuid, latitude double precision, longitude double precision)
LANGUAGE sql STABLE
AS $$
  SELECT
    r.id,
    ST_Y(r.location::geometry) AS latitude,
    ST_X(r.location::geometry) AS longitude
  FROM restaurants r
  WHERE r.location IS NOT NULL;
$$;
