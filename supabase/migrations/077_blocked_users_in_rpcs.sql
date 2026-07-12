-- Migration 077: esclusione utenti bloccati DENTRO le RPC di lettura.
--
-- Sostituisce il filtro client-side introdotto con la feature follow (che
-- lasciava totalCount/paginazione incoerenti e copriva solo 2 percorsi su 4).
-- Regola unica: chi ho bloccato sparisce da recensioni paginate, classifica
-- e ricerca utenti. Il viewer è p_user_id per get_paginated_reviews (già
-- parametro) e auth.uid() per le altre; la RLS su blocked_users (own-rows,
-- mig 075) fa sì che un p_user_id altrui non possa leggere blocchi non suoi:
-- l'EXISTS semplicemente non matcha e il risultato resta non filtrato.
--
-- get_following_feed non serve toccarla: un bloccato non può essere seguito
-- (trigger 075), quindi il feed è già pulito.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. get_paginated_reviews — esclude i bloccati da righe E total_count
-- ════════════════════════════════════════════════════════════════════════════
-- Stessa signature di mig 056: CREATE OR REPLACE. Il conteggio e le righe
-- applicano lo stesso WHERE, così header e paginazione restano coerenti.

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
  user_username     TEXT,
  user_avatar_url   TEXT,
  user_is_anonymous BOOLEAN,
  total_count       BIGINT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH
  visible AS (
    SELECT r.*
    FROM reviews r
    WHERE r.restaurant_id = p_restaurant_id
      AND (
        p_user_id IS NULL
        OR r.user_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM blocked_users b
          WHERE b.blocker_id = p_user_id AND b.blocked_id = r.user_id
        )
      )
  ),
  total AS (
    SELECT COUNT(*) AS cnt FROM visible
  ),
  base AS (
    SELECT
      r.id, r.restaurant_id, r.user_id, r.rating, r.comment,
      r.allergens_snapshot, r.dietary_snapshot, r.photos, r.language,
      r.created_at, r.updated_at, r.likes_count,
      CASE WHEN p_user_id IS NOT NULL THEN
        EXISTS(SELECT 1 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = p_user_id)
      ELSE false END AS liked_by_me,
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
    FROM visible r
    LEFT JOIN profiles p ON p.id = r.user_id
  )
  SELECT
    b.id, b.restaurant_id, b.user_id, b.rating, b.comment,
    b.allergens_snapshot, b.dietary_snapshot, b.photos, b.language,
    b.created_at, b.updated_at, b.likes_count, b.liked_by_me,
    b.user_username, b.user_avatar_url, b.user_is_anonymous,
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

-- ════════════════════════════════════════════════════════════════════════════
-- 2. get_leaderboard — i bloccati escono dalla classifica del viewer
-- ════════════════════════════════════════════════════════════════════════════
-- auth.uid() NULL (anonimo/guest) → nessun filtro, comportamento invariato.

CREATE OR REPLACE FUNCTION get_leaderboard(p_limit INT DEFAULT 20)
RETURNS TABLE (
  category     TEXT,
  user_id      UUID,
  username     TEXT,
  avatar_url   TEXT,
  allergens    TEXT[],
  dietary_preferences TEXT[],
  count        BIGINT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  (
    SELECT
      'reviews'::TEXT AS category,
      rv.user_id,
      p.username,
      p.avatar_url,
      p.allergens,
      p.dietary_preferences,
      COUNT(*) AS count
    FROM reviews rv
    JOIN profiles p ON p.id = rv.user_id
    WHERE rv.user_id IS NOT NULL
      AND COALESCE(p.is_anonymous, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM blocked_users b
        WHERE b.blocker_id = auth.uid() AND b.blocked_id = rv.user_id
      )
    GROUP BY rv.user_id, p.username, p.avatar_url, p.allergens, p.dietary_preferences
    ORDER BY count DESC
    LIMIT p_limit
  )
  UNION ALL
  (
    SELECT
      'likes'::TEXT AS category,
      rv.user_id,
      p.username,
      p.avatar_url,
      p.allergens,
      p.dietary_preferences,
      SUM(rv.likes_count)::BIGINT AS count
    FROM reviews rv
    JOIN profiles p ON p.id = rv.user_id
    WHERE rv.user_id IS NOT NULL
      AND COALESCE(p.is_anonymous, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM blocked_users b
        WHERE b.blocker_id = auth.uid() AND b.blocked_id = rv.user_id
      )
    GROUP BY rv.user_id, p.username, p.avatar_url, p.allergens, p.dietary_preferences
    HAVING SUM(rv.likes_count) > 2
    ORDER BY count DESC
    LIMIT p_limit
  );
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. search_users — esclude bloccati e se stessi; espone recensioni e paesi
-- ════════════════════════════════════════════════════════════════════════════
-- Conteggi via subquery correlate (girano solo sulle max p_limit righe
-- restituite, costo irrilevante); paesi su country_code (sorgente di verità,
-- mai il testo legacy `country`). DROP+CREATE perché rispetto alla mig 076
-- cambia la signature di ritorno (colonne nuove) e Postgres non consente
-- CREATE OR REPLACE in quel caso.

DROP FUNCTION IF EXISTS search_users(TEXT, INT);

CREATE FUNCTION search_users(
  p_query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id            UUID,
  username      TEXT,
  avatar_url    TEXT,
  review_count  BIGINT,
  country_count BIGINT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH q AS (
    -- Escape dei metacaratteri LIKE: l'utente cerca testo letterale.
    SELECT replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') AS term
  )
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) AS review_count,
    (SELECT COUNT(DISTINCT rst.country_code)
     FROM reviews r
     JOIN restaurants rst ON rst.id = r.restaurant_id
     WHERE r.user_id = p.id AND rst.country_code IS NOT NULL) AS country_count
  FROM profiles p, q
  WHERE length(q.term) >= 2
    AND p.username IS NOT NULL
    AND NOT COALESCE(p.is_anonymous, false)
    AND p.id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b
      WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.id
    )
    AND p.username ILIKE '%' || q.term || '%'
  ORDER BY (p.username ILIKE q.term || '%') DESC, lower(p.username)
  LIMIT p_limit;
$$;
