-- Funzione RPC per ottenere profili con email (solo per admin).
-- Usa SECURITY DEFINER per accedere a auth.users, che non e' accessibile dal client.

CREATE OR REPLACE FUNCTION get_profiles_with_email(
  page_limit int DEFAULT 26,
  page_offset int DEFAULT 0
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
  ORDER BY p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$;

-- Funzione RPC per ottenere un singolo profilo con email (solo per admin).

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
  email varchar
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.allergens, p.dietary_preferences,
         p.profile_color, p.role, p.created_at, u.email::varchar
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.id = target_user_id
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$;
