-- Stats aggregate per i ristoranti, opzionalmente filtrate per paese.
-- Usata dalla pagina admin ristoranti.

CREATE OR REPLACE FUNCTION get_restaurant_country_stats(
  filter_country text DEFAULT NULL
)
RETURNS TABLE (
  restaurant_count bigint,
  review_count bigint,
  average_rating numeric,
  favorite_count bigint,
  city_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM restaurants WHERE filter_country IS NULL OR country = filter_country),
    (SELECT COUNT(*) FROM reviews r JOIN restaurants rest ON r.restaurant_id = rest.id
     WHERE filter_country IS NULL OR rest.country = filter_country),
    (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r JOIN restaurants rest ON r.restaurant_id = rest.id
     WHERE filter_country IS NULL OR rest.country = filter_country),
    (SELECT COUNT(*) FROM favorites f JOIN restaurants rest ON f.restaurant_id = rest.id
     WHERE filter_country IS NULL OR rest.country = filter_country),
    (SELECT COUNT(DISTINCT city) FROM restaurants WHERE city IS NOT NULL AND (filter_country IS NULL OR country = filter_country));
$$;
