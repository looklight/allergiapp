-- Aggiunge review_photo_count a get_restaurants_admin:
-- conteggio totale delle foto presenti dentro le recensioni (reviews.photos JSONB).
-- Permette in dashboard di distinguere "foto recensioni" da "foto menu".

DROP FUNCTION IF EXISTS get_restaurants_admin(int, int, text, text, text);

CREATE OR REPLACE FUNCTION get_restaurants_admin(
  page_limit int DEFAULT 26,
  page_offset int DEFAULT 0,
  country_filter text DEFAULT NULL,
  search_query text DEFAULT NULL,
  sort_by text DEFAULT 'created_desc'
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  city text,
  country text,
  country_code text,
  cuisine_types text[],
  created_at timestamptz,
  review_count int,
  review_photo_count int,
  menu_photo_count int,
  average_rating numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.address,
    r.city,
    r.country,
    r.country_code,
    r.cuisine_types,
    r.created_at,
    (SELECT COUNT(*)::int FROM reviews rv WHERE rv.restaurant_id = r.id) AS review_count,
    (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(rv.photos, '[]'::jsonb))), 0)::int
       FROM reviews rv WHERE rv.restaurant_id = r.id) AS review_photo_count,
    (SELECT COUNT(*)::int FROM menu_photos mp WHERE mp.restaurant_id = r.id) AS menu_photo_count,
    (SELECT COALESCE(AVG(rv.rating), 0)::numeric(3,2) FROM reviews rv WHERE rv.restaurant_id = r.id) AS average_rating
  FROM restaurants r
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
  AND (country_filter IS NULL OR r.country_code = country_filter)
  AND (
    search_query IS NULL
    OR r.name ILIKE '%' || search_query || '%'
    OR r.city ILIKE '%' || search_query || '%'
  )
  ORDER BY
    CASE WHEN sort_by = 'city_asc'     THEN r.city END ASC  NULLS LAST,
    CASE WHEN sort_by = 'reviews_desc' THEN (SELECT COUNT(*) FROM reviews rv WHERE rv.restaurant_id = r.id) END DESC NULLS LAST,
    r.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$;
