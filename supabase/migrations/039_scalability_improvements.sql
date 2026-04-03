-- Migration 039: Scalability improvements
-- Prepara il DB per migliaia di ristoranti e decine di migliaia di recensioni.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. INDICI MANCANTI
-- ═══════════════════════════════════════════════════════════════════════════════

-- reviews.likes_count — usato per ordinamento "più apprezzate" in get_paginated_reviews
CREATE INDEX IF NOT EXISTS idx_reviews_likes_count
  ON reviews (likes_count DESC NULLS LAST);

-- menu_photos — query frequente: foto di un ristorante ordinate per data
CREATE INDEX IF NOT EXISTS idx_menu_photos_restaurant_created
  ON menu_photos (restaurant_id, created_at DESC);

-- review_likes — lookup "l'utente X ha messo like alla review Y" (usato in get_paginated_reviews)
CREATE INDEX IF NOT EXISTS idx_review_likes_review_user
  ON review_likes (review_id, user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. OTTIMIZZA get_restaurant_stats — da 3 subquery correlate a 1 singolo JOIN
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_restaurant_stats(UUID);

CREATE FUNCTION get_restaurant_stats(restaurant_uuid UUID)
RETURNS TABLE (
  review_count BIGINT,
  average_rating NUMERIC,
  favorite_count BIGINT
) AS $$
  SELECT
    COALESCE(rev.cnt, 0),
    COALESCE(ROUND(rev.avg_r, 1), 0),
    COALESCE(fav.cnt, 0)
  FROM (SELECT 1) AS dummy
  LEFT JOIN (
    SELECT COUNT(*) AS cnt, AVG(rating)::numeric AS avg_r
    FROM reviews WHERE restaurant_id = restaurant_uuid
  ) rev ON true
  LEFT JOIN (
    SELECT COUNT(*) AS cnt
    FROM favorites WHERE restaurant_id = restaurant_uuid
  ) fav ON true;
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. OTTIMIZZA get_paginated_reviews — relevance precalcolata con operatori array
-- ═══════════════════════════════════════════════════════════════════════════════
-- Ottimizzazioni:
-- 1. COUNT(*) precalcolato in CTE `total` invece di COUNT(*) OVER() su ogni riga
-- 2. Relevance usa INTERSECT solo quando p_sort='relevance' (short-circuit via CASE)
-- Per array piccoli (<20 elementi) INTERSECT è già efficiente.

CREATE OR REPLACE FUNCTION get_paginated_reviews(
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
  user_profile_color TEXT,
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
      p.profile_color AS user_profile_color,
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
    b.user_display_name, b.user_avatar_url, b.user_profile_color, b.user_is_anonymous,
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
-- 4. LEADERBOARD RPC — aggregazione server-side
-- ═══════════════════════════════════════════════════════════════════════════════
-- Sostituisce il download client-side di TUTTI i ristoranti e recensioni.
-- Ritorna le top N entry per ristoranti aggiunti e per recensioni scritte.

CREATE OR REPLACE FUNCTION get_leaderboard(p_limit INT DEFAULT 20)
RETURNS TABLE (
  category     TEXT,
  user_id      UUID,
  display_name TEXT,
  avatar_url   TEXT,
  profile_color TEXT,
  allergens    TEXT[],
  dietary_preferences TEXT[],
  count        BIGINT
) AS $$
  -- Top contributors: chi ha aggiunto più ristoranti
  (
    SELECT
      'restaurants'::TEXT AS category,
      r.added_by AS user_id,
      p.display_name,
      p.avatar_url,
      p.profile_color,
      p.allergens,
      p.dietary_preferences,
      COUNT(*) AS count
    FROM restaurants r
    JOIN profiles p ON p.id = r.added_by
    WHERE r.added_by IS NOT NULL
      AND COALESCE(p.is_anonymous, false) = false
    GROUP BY r.added_by, p.display_name, p.avatar_url, p.profile_color, p.allergens, p.dietary_preferences
    ORDER BY count DESC
    LIMIT p_limit
  )
  UNION ALL
  -- Top reviewers: chi ha scritto più recensioni
  (
    SELECT
      'reviews'::TEXT AS category,
      rv.user_id,
      p.display_name,
      p.avatar_url,
      p.profile_color,
      p.allergens,
      p.dietary_preferences,
      COUNT(*) AS count
    FROM reviews rv
    JOIN profiles p ON p.id = rv.user_id
    WHERE rv.user_id IS NOT NULL
      AND COALESCE(p.is_anonymous, false) = false
    GROUP BY rv.user_id, p.display_name, p.avatar_url, p.profile_color, p.allergens, p.dietary_preferences
    ORDER BY count DESC
    LIMIT p_limit
  );
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. PULIZIA — Rimuovi RPC obsoleta
-- ═══════════════════════════════════════════════════════════════════════════════
-- get_restaurants_by_allergens: sostituita da get_restaurants_for_my_needs (migration 020+037+038)
DROP FUNCTION IF EXISTS get_restaurants_by_allergens(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], TEXT[], INTEGER, INTEGER
);
