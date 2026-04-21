-- 1. Aggiunge last_sign_in_at + email_confirmed_at alle RPC utenti e il nuovo
--    sort 'last_sign_in_desc' per ordinare gli utenti per ultimo accesso.
-- 2. Introduce get_restaurants_admin: lista ristoranti per l'admin con
--    aggregati (review_count, menu_photo_count, average_rating) e sort
--    opzionali ('created_desc', 'city_asc', 'reviews_desc').

DROP FUNCTION IF EXISTS get_profiles_with_email(int, int, text, text);
DROP FUNCTION IF EXISTS get_profile_with_email(uuid);

CREATE OR REPLACE FUNCTION get_profiles_with_email(
  page_limit int DEFAULT 26,
  page_offset int DEFAULT 0,
  search_query text DEFAULT NULL,
  sort_by text DEFAULT 'created_desc'
)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  role text,
  created_at timestamptz,
  email varchar,
  reviews_count int,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.role,
    p.created_at,
    u.email::varchar,
    (SELECT COUNT(*)::int FROM reviews r WHERE r.user_id = p.id) AS reviews_count,
    u.last_sign_in_at,
    u.email_confirmed_at
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
  AND (
    search_query IS NULL
    OR p.display_name ILIKE '%' || search_query || '%'
    OR u.email::text ILIKE '%' || search_query || '%'
  )
  ORDER BY
    CASE WHEN sort_by = 'reviews_desc'      THEN (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) END DESC NULLS LAST,
    CASE WHEN sort_by = 'reviews_asc'       THEN (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) END ASC  NULLS LAST,
    CASE WHEN sort_by = 'last_sign_in_desc' THEN u.last_sign_in_at END DESC NULLS LAST,
    p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$;

CREATE OR REPLACE FUNCTION get_profile_with_email(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  allergens text[],
  dietary_preferences text[],
  profile_color text,
  role text,
  created_at timestamptz,
  email varchar,
  reviews_count int,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.allergens,
    p.dietary_preferences,
    p.profile_color,
    p.role,
    p.created_at,
    u.email::varchar,
    (SELECT COUNT(*)::int FROM reviews r WHERE r.user_id = p.id) AS reviews_count,
    u.last_sign_in_at,
    u.email_confirmed_at
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.id = target_user_id
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Nuova RPC: lista ristoranti con aggregati e sort per la admin dashboard.
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
