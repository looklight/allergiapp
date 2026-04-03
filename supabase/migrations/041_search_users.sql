-- Aggiunge parametro di ricerca alla RPC get_profiles_with_email

CREATE OR REPLACE FUNCTION get_profiles_with_email(
  page_limit int DEFAULT 26,
  page_offset int DEFAULT 0,
  search_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  role text,
  created_at timestamptz,
  email varchar
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.role, p.created_at, u.email::varchar
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
  ORDER BY p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$;
