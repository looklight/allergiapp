-- Migration 032: Server-side sorted + paginated reviews
-- Sostituisce il caricamento client-side di TUTTE le recensioni.
-- Supporta ordinamento per: recent, rating, rating-asc, likes, relevance.
-- Ritorna total_count per la paginazione senza query COUNT separata.

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
  WITH base AS (
    SELECT
      r.id,
      r.restaurant_id,
      r.user_id,
      r.rating,
      r.comment,
      r.allergens_snapshot,
      r.dietary_snapshot,
      r.photos,
      r.language,
      r.created_at,
      r.updated_at,
      r.likes_count,
      -- liked_by_me: true se l'utente ha messo like
      CASE WHEN p_user_id IS NOT NULL THEN
        EXISTS(SELECT 1 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = p_user_id)
      ELSE false END AS liked_by_me,
      -- Profilo autore
      CASE WHEN COALESCE(p.is_anonymous, false) THEN NULL ELSE p.display_name END AS user_display_name,
      p.avatar_url AS user_avatar_url,
      p.profile_color AS user_profile_color,
      COALESCE(p.is_anonymous, false) AS user_is_anonymous,
      -- Relevance score: overlap allergie+diete utente con snapshot recensione
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
    COUNT(*) OVER() AS total_count
  FROM base b
  ORDER BY
    -- Sort primario
    CASE p_sort
      WHEN 'recent'     THEN extract(epoch from b.created_at)
      WHEN 'rating'     THEN b.rating::numeric
      WHEN 'likes'      THEN b.likes_count::numeric
      WHEN 'relevance'  THEN b.relevance_score::numeric
      WHEN 'rating-asc' THEN -(b.rating::numeric)
    END DESC,
    -- Sort secondario: per relevance usiamo rating, altrimenti noop
    CASE WHEN p_sort = 'relevance' THEN b.rating ELSE 0 END DESC,
    -- Tiebreaker: sempre data decrescente
    b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
