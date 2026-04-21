-- Aggiunge parametro sort_by a get_profiles_with_email.
-- Valori supportati: 'created_desc' (default), 'reviews_desc', 'reviews_asc'.

DROP FUNCTION IF EXISTS get_profiles_with_email(int, int, text);

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
  reviews_count int
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
    (SELECT COUNT(*)::int FROM reviews r WHERE r.user_id = p.id) AS reviews_count
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
    CASE WHEN sort_by = 'reviews_desc' THEN (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) END DESC NULLS LAST,
    CASE WHEN sort_by = 'reviews_asc'  THEN (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) END ASC  NULLS LAST,
    p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$;
