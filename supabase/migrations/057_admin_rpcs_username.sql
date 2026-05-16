-- Migration 057: ripristina le RPC admin con username (post-056) mantenendo
-- le feature aggiunte da admin-prod (sort_by, reviews_count, last_sign_in_at,
-- email_confirmed_at, review_photo_count).
--
-- Contesto:
--   * main:048 ha droppato profiles.profile_color
--   * main:056 ha droppato profiles.display_name e semplificato 4 RPC
--     (get_profiles_with_email, get_profile_with_email, get_paginated_reviews,
--     get_leaderboard) rimuovendo sort_by e gli aggregati admin.
--   * admin-prod aveva 048-050 paralleli che aggiungevano sort_by e aggregati
--     a get_profiles_with_email + get_restaurants_admin, ma referenziavano
--     ancora display_name / profile_color.
--   * Questa migration porta le RPC admin allo schema nuovo (username,
--     no profile_color) mantenendo l'UX della admin dashboard (ordinamento,
--     ultimo accesso, conteggi foto/recensioni).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. get_profiles_with_email — pagina /users della admin
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_profiles_with_email(int, int, text);
DROP FUNCTION IF EXISTS get_profiles_with_email(int, int, text, text);

CREATE FUNCTION get_profiles_with_email(
  page_limit int DEFAULT 26,
  page_offset int DEFAULT 0,
  search_query text DEFAULT NULL,
  sort_by text DEFAULT 'created_desc'
)
RETURNS TABLE (
  id uuid,
  username text,
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
    p.username,
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
    OR p.username ILIKE '%' || search_query || '%'
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. get_profile_with_email — pagina /users/[id] della admin
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_profile_with_email(uuid);

CREATE FUNCTION get_profile_with_email(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  allergens text[],
  dietary_preferences text[],
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
    p.username,
    p.avatar_url,
    p.allergens,
    p.dietary_preferences,
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. get_restaurants_admin — pagina /restaurants della admin
-- ═══════════════════════════════════════════════════════════════════════════════
-- Idempotente: ricrea la stessa signature di admin-prod:050.

DROP FUNCTION IF EXISTS get_restaurants_admin(int, int, text, text, text);

CREATE FUNCTION get_restaurants_admin(
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
