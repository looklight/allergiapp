-- Migration 048: Rimuove la feature "colore profilo".
-- La colonna profiles.profile_color e tutti i suoi riferimenti negli RPC vengono eliminati.
-- Nessun dato utente viene perso: la colonna era opzionale e ridondante (avatar + nickname coprono la personalizzazione).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. RICREA get_paginated_reviews SENZA user_profile_color
-- ═══════════════════════════════════════════════════════════════════════════════
-- DROP necessario perché cambia la signature del RETURNS TABLE (rimossa una colonna).
-- CREATE OR REPLACE non basta in Postgres in questi casi.

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
    b.user_display_name, b.user_avatar_url, b.user_is_anonymous,
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
-- 2. RICREA get_leaderboard SENZA profile_color
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_leaderboard(INT);

CREATE FUNCTION get_leaderboard(p_limit INT DEFAULT 20)
RETURNS TABLE (
  category     TEXT,
  user_id      UUID,
  display_name TEXT,
  avatar_url   TEXT,
  allergens    TEXT[],
  dietary_preferences TEXT[],
  count        BIGINT
) AS $$
  (
    SELECT
      'restaurants'::TEXT AS category,
      r.added_by AS user_id,
      p.display_name,
      p.avatar_url,
      p.allergens,
      p.dietary_preferences,
      COUNT(*) AS count
    FROM restaurants r
    JOIN profiles p ON p.id = r.added_by
    WHERE r.added_by IS NOT NULL
      AND COALESCE(p.is_anonymous, false) = false
    GROUP BY r.added_by, p.display_name, p.avatar_url, p.allergens, p.dietary_preferences
    ORDER BY count DESC
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT
      'reviews'::TEXT AS category,
      rv.user_id,
      p.display_name,
      p.avatar_url,
      p.allergens,
      p.dietary_preferences,
      COUNT(*) AS count
    FROM reviews rv
    JOIN profiles p ON p.id = rv.user_id
    WHERE rv.user_id IS NOT NULL
      AND COALESCE(p.is_anonymous, false) = false
    GROUP BY rv.user_id, p.display_name, p.avatar_url, p.allergens, p.dietary_preferences
    ORDER BY count DESC
    LIMIT p_limit
  );
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RICREA get_profile_with_email SENZA profile_color
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_profile_with_email(uuid);

CREATE FUNCTION get_profile_with_email(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
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
  SELECT p.id, p.display_name, p.avatar_url, p.allergens, p.dietary_preferences,
         p.role, p.created_at, u.email::varchar
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.id = target_user_id
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. DROP COLUMN profile_color
-- ═══════════════════════════════════════════════════════════════════════════════
-- Tutti gli RPC dipendenti sono stati ricreati sopra, è ora sicuro droppare la colonna.

ALTER TABLE profiles DROP COLUMN IF EXISTS profile_color;
