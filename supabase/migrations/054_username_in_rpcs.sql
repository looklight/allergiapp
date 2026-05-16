-- Migration 054: aggiunge username alle RPC che leggono profiles.
-- Step 2 del piano in docs/unique-username-plan.md.
-- Mantiene display_name in tutti i return per retrocompat con client esistenti.
-- I client nuovi useranno username via helper getDisplayName().
-- Anonimi: sia display_name sia username vengono mascherati a NULL (gia' regola attuale).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. get_paginated_reviews — aggiunge user_username
-- ═══════════════════════════════════════════════════════════════════════════════
-- Cambia signature di RETURNS TABLE, serve DROP+CREATE.

DROP FUNCTION IF EXISTS get_paginated_reviews(UUID, UUID, TEXT, TEXT[], TEXT[], INT, INT);

CREATE FUNCTION get_paginated_reviews(
  p_restaurant_id UUID,
  p_user_id       UUID    DEFAULT NULL,
  p_sort          TEXT    DEFAULT 'recent',
  p_user_allergens TEXT[] DEFAULT '{}',
  p_user_diets    TEXT[]  DEFAULT '{}',
  p_limit         INT     DEFAULT 15,
  p_offset        INT     DEFAULT 0
)
RETURNS TABLE (
  id                UUID,
  restaurant_id     UUID,
  user_id           UUID,
  rating            SMALLINT,
  comment           TEXT,
  allergens_snapshot TEXT[],
  dietary_snapshot  TEXT[],
  photos            JSONB,
  language          TEXT,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ,
  likes_count       INT,
  liked_by_me       BOOLEAN,
  user_display_name TEXT,
  user_username     TEXT,
  user_avatar_url   TEXT,
  user_is_anonymous BOOLEAN,
  total_count       BIGINT
)
LANGUAGE sql STABLE
AS $$
  WITH
  total AS (
    SELECT COUNT(*) AS cnt FROM reviews WHERE reviews.restaurant_id = p_restaurant_id
  ),
  base AS (
    SELECT
      r.id, r.restaurant_id, r.user_id, r.rating, r.comment,
      r.allergens_snapshot, r.dietary_snapshot, r.photos, r.language,
      r.created_at, r.updated_at, r.likes_count,
      CASE WHEN p_user_id IS NOT NULL THEN
        EXISTS(SELECT 1 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = p_user_id)
      ELSE false END AS liked_by_me,
      CASE WHEN COALESCE(p.is_anonymous, false) THEN NULL ELSE p.display_name END AS user_display_name,
      CASE WHEN COALESCE(p.is_anonymous, false) THEN NULL ELSE p.username END AS user_username,
      p.avatar_url AS user_avatar_url,
      COALESCE(p.is_anonymous, false) AS user_is_anonymous,
      CASE WHEN p_sort = 'relevance' THEN
        COALESCE(array_length(
          ARRAY(SELECT unnest(r.allergens_snapshot) INTERSECT SELECT unnest(p_user_allergens)), 1
        ), 0)
        + COALESCE(array_length(
          ARRAY(SELECT unnest(r.dietary_snapshot) INTERSECT SELECT unnest(p_user_diets)), 1
        ), 0)
      ELSE 0 END AS relevance_score
    FROM reviews r
    LEFT JOIN profiles p ON p.id = r.user_id
    WHERE r.restaurant_id = p_restaurant_id
  )
  SELECT
    b.id, b.restaurant_id, b.user_id, b.rating, b.comment,
    b.allergens_snapshot, b.dietary_snapshot, b.photos, b.language,
    b.created_at, b.updated_at, b.likes_count, b.liked_by_me,
    b.user_display_name, b.user_username, b.user_avatar_url, b.user_is_anonymous,
    t.cnt AS total_count
  FROM base b, total t
  ORDER BY
    CASE p_sort
      WHEN 'recent'     THEN extract(epoch from b.created_at)
      WHEN 'rating'     THEN b.rating::numeric
      WHEN 'likes'      THEN b.likes_count::numeric
      WHEN 'relevance'  THEN b.relevance_score::numeric
      WHEN 'rating-asc' THEN -(b.rating::numeric)
    END DESC,
    CASE WHEN p_sort = 'relevance' THEN b.rating ELSE 0 END DESC,
    b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. get_leaderboard — aggiunge username
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_leaderboard(INT);

CREATE FUNCTION get_leaderboard(p_limit INT DEFAULT 20)
RETURNS TABLE (
  category     TEXT,
  user_id      UUID,
  display_name TEXT,
  username     TEXT,
  avatar_url   TEXT,
  allergens    TEXT[],
  dietary_preferences TEXT[],
  count        BIGINT
) AS $$
  (
    SELECT
      'reviews'::TEXT AS category,
      rv.user_id,
      p.display_name,
      p.username,
      p.avatar_url,
      p.allergens,
      p.dietary_preferences,
      COUNT(*) AS count
    FROM reviews rv
    JOIN profiles p ON p.id = rv.user_id
    WHERE rv.user_id IS NOT NULL
      AND COALESCE(p.is_anonymous, false) = false
    GROUP BY rv.user_id, p.display_name, p.username, p.avatar_url, p.allergens, p.dietary_preferences
    ORDER BY count DESC
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT
      'likes'::TEXT AS category,
      rv.user_id,
      p.display_name,
      p.username,
      p.avatar_url,
      p.allergens,
      p.dietary_preferences,
      SUM(rv.likes_count)::BIGINT AS count
    FROM reviews rv
    JOIN profiles p ON p.id = rv.user_id
    WHERE rv.user_id IS NOT NULL
      AND COALESCE(p.is_anonymous, false) = false
    GROUP BY rv.user_id, p.display_name, p.username, p.avatar_url, p.allergens, p.dietary_preferences
    HAVING SUM(rv.likes_count) > 2
    ORDER BY count DESC
    LIMIT p_limit
  );
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. get_profile_with_email — aggiunge username
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_profile_with_email(uuid);

CREATE FUNCTION get_profile_with_email(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  allergens text[],
  dietary_preferences text[],
  role text,
  created_at timestamptz,
  email varchar
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.allergens, p.dietary_preferences,
         p.role, p.created_at, u.email::varchar
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.id = target_user_id
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. get_profiles_with_email — aggiunge username e ricerca per username
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_profiles_with_email(int, int, text);

CREATE FUNCTION get_profiles_with_email(
  page_limit int DEFAULT 26,
  page_offset int DEFAULT 0,
  search_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  role text,
  created_at timestamptz,
  email varchar
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.role, p.created_at, u.email::varchar
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
  AND (
    search_query IS NULL
    OR p.display_name ILIKE '%' || search_query || '%'
    OR p.username ILIKE '%' || search_query || '%'
    OR u.email::text ILIKE '%' || search_query || '%'
  )
  ORDER BY p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. is_username_available — check realtime per UI onboarding/edit-profile
-- ═══════════════════════════════════════════════════════════════════════════════
-- Ritorna true se lo username e' formalmente valido E non gia' preso.
-- Reserved list hardcoded (modificabile senza migration tabella).
-- Confronto case-insensitive coerente con l'indice UNIQUE su lower(username).

CREATE OR REPLACE FUNCTION is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    -- formato valido
    p_username ~ '^[A-Za-z0-9][A-Za-z0-9_.]{1,28}[A-Za-z0-9_]$'
    AND p_username !~ '\.\.'
    -- non riservato
    AND lower(p_username) NOT IN (
      'admin', 'support', 'allergiapp', 'help', 'info',
      'system', 'user', 'null', 'undefined'
    )
    -- non gia' preso (esclude eventualmente l'utente corrente per consentire "no-op" save)
    AND NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE lower(username) = lower(p_username)
        AND id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    );
$$;
