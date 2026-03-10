-- RPC per ottenere i ristoranti con piu segnalazioni pending (top N).
-- Evita di scaricare tutte le segnalazioni client-side.

CREATE OR REPLACE FUNCTION get_top_reported_restaurants(
  top_n int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  country text,
  report_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.id, r.name, r.city, r.country, COUNT(rp.id) AS report_count
  FROM reports rp
  JOIN restaurants r ON r.id = rp.restaurant_id
  WHERE rp.status = 'pending'
    AND rp.restaurant_id IS NOT NULL
  GROUP BY r.id, r.name, r.city, r.country
  ORDER BY report_count DESC
  LIMIT top_n;
$$;

-- RPC per ottenere le stats aggregate di un ristorante.
-- Evita di scaricare tutte le recensioni per calcolare la media.

CREATE OR REPLACE FUNCTION get_restaurant_admin_stats(target_restaurant_id uuid)
RETURNS TABLE (
  review_count bigint,
  average_rating numeric,
  favorite_count bigint,
  pending_report_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM reviews WHERE restaurant_id = target_restaurant_id),
    (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE restaurant_id = target_restaurant_id),
    (SELECT COUNT(*) FROM favorites WHERE restaurant_id = target_restaurant_id),
    (SELECT COUNT(*) FROM reports WHERE restaurant_id = target_restaurant_id AND status = 'pending');
$$;
