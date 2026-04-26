-- Migration 050: Leaderboard "Like ricevuti" + difese anti-gaming sui like.
--
-- 1) Sostituisce nella leaderboard la categoria "ristoranti aggiunti" con "like
--    ricevuti" (somma cumulata likes_count). Soglia > 2 per filtrare la lunga
--    coda di utenti con pochissimi like.
-- 2) Modifica RPC toggle_review_like per impedire i self-like (un utente non
--    può più mettere like alle proprie recensioni). Tutela la credibilità del
--    counter per-recensione mostrato nelle card.
-- 3) Cleanup one-shot dei self-like esistenti. Il trigger
--    trg_update_review_likes_count (migration 028) auto-corregge likes_count
--    cacheato dopo il DELETE.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Refactor get_leaderboard: rimuove 'restaurants', aggiunge 'likes'
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
  )
  UNION ALL
  (
    -- Top utenti per like ricevuti (somma di likes_count su tutte le proprie
    -- recensioni). HAVING > 2 esclude la lunga coda dei nuovi/passivi.
    SELECT
      'likes'::TEXT AS category,
      rv.user_id,
      p.display_name,
      p.avatar_url,
      p.allergens,
      p.dietary_preferences,
      SUM(rv.likes_count)::BIGINT AS count
    FROM reviews rv
    JOIN profiles p ON p.id = rv.user_id
    WHERE rv.user_id IS NOT NULL
      AND COALESCE(p.is_anonymous, false) = false
    GROUP BY rv.user_id, p.display_name, p.avatar_url, p.allergens, p.dietary_preferences
    HAVING SUM(rv.likes_count) > 2
    ORDER BY count DESC
    LIMIT p_limit
  );
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Anti-self-like: modifica toggle_review_like
-- ═══════════════════════════════════════════════════════════════════════════════
-- Aggiunge un check al volo: l'utente non può likare le proprie recensioni.
-- Mantiene tutto il resto della logica della migration 028.

CREATE OR REPLACE FUNCTION toggle_review_like(p_review_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_existed  BOOLEAN;
  v_liked    BOOLEAN;
  v_count    INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Anti-self-like: l'autore della recensione non può apprezzarsi da solo.
  IF EXISTS (
    SELECT 1 FROM reviews WHERE id = p_review_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Cannot like your own review';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM review_likes
    WHERE user_id = v_user_id AND review_id = p_review_id
  ) INTO v_existed;

  IF v_existed THEN
    DELETE FROM review_likes WHERE user_id = v_user_id AND review_id = p_review_id;
    v_liked := FALSE;
  ELSE
    INSERT INTO review_likes(user_id, review_id) VALUES (v_user_id, p_review_id);
    v_liked := TRUE;
  END IF;

  SELECT likes_count INTO v_count FROM reviews WHERE id = p_review_id;

  RETURN json_build_object('liked', v_liked, 'likes_count', v_count);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RPC get_unique_likers_count: persone uniche che hanno apprezzato un utente
-- ═══════════════════════════════════════════════════════════════════════════════
-- Usata dal client per la condizione di sblocco `unique_likers_received`.
-- Server-side per evitare doppio JOIN lato client e fragilità della sintassi
-- PostgREST per filtrare su tabella joinata.

CREATE OR REPLACE FUNCTION get_unique_likers_count(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(DISTINCT rl.user_id)::INT
  FROM review_likes rl
  JOIN reviews rv ON rv.id = rl.review_id
  WHERE rv.user_id = p_user_id;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Cleanup self-like esistenti
-- ═══════════════════════════════════════════════════════════════════════════════
-- Il trigger trg_update_review_likes_count (migration 028) decrementa
-- automaticamente reviews.likes_count per ogni riga eliminata.

DELETE FROM review_likes
WHERE EXISTS (
  SELECT 1 FROM reviews
  WHERE reviews.id = review_likes.review_id
    AND reviews.user_id = review_likes.user_id
);
