-- Migration 502 (admin-only, range 500+): "Ultimo accesso" = last_seen_at.
--
-- Le RPC utenti mostravano u.last_sign_in_at come "Ultimo accesso", ma Supabase
-- lo aggiorna solo al login esplicito -> con sessioni persistenti restava fermo
-- all'ultimo login anche per utenti attivi. La presence reale ora vive in
-- profiles.last_seen_at (vedi migration 062 + app), aggiornata al cold-start e
-- al ritorno in foreground.
--
-- Qui: le due RPC utenti espongono p.last_seen_at e il sort "Accesso recente"
-- ordina per last_seen_at. last_sign_in_at resta esposto (utile come riferimento
-- "ultimo login" futuro), ma la UI mostra last_seen_at.
--
-- PREREQUISITO: la colonna profiles.last_seen_at (migration 062) deve gia'
-- esistere sul DB live prima di applicare questa migration.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. get_profiles_with_email — pagina /users della admin
-- ═══════════════════════════════════════════════════════════════════════════════

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
  is_anonymous boolean,
  role text,
  created_at timestamptz,
  email varchar,
  reviews_count int,
  last_seen_at timestamptz,
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
    COALESCE(p.is_anonymous, false) AS is_anonymous,
    p.role,
    p.created_at,
    u.email::varchar,
    (SELECT COUNT(*)::int FROM reviews r WHERE r.user_id = p.id) AS reviews_count,
    p.last_seen_at,
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
    CASE WHEN sort_by = 'reviews_desc'   THEN (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) END DESC NULLS LAST,
    CASE WHEN sort_by = 'reviews_asc'    THEN (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) END ASC  NULLS LAST,
    CASE WHEN sort_by = 'last_seen_desc' THEN p.last_seen_at END DESC NULLS LAST,
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
  is_anonymous boolean,
  allergens text[],
  dietary_preferences text[],
  role text,
  created_at timestamptz,
  email varchar,
  reviews_count int,
  last_seen_at timestamptz,
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
    COALESCE(p.is_anonymous, false) AS is_anonymous,
    p.allergens,
    p.dietary_preferences,
    p.role,
    p.created_at,
    u.email::varchar,
    (SELECT COUNT(*)::int FROM reviews r WHERE r.user_id = p.id) AS reviews_count,
    p.last_seen_at,
    u.last_sign_in_at,
    u.email_confirmed_at
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.id = target_user_id
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$;
