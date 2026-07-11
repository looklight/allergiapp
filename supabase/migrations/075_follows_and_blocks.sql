-- Migration 075: grafo social minimo — follow utenti + blocco.
--
-- follows: chi segue chi. Scritture dirette da supabase-js (niente RPC di
-- scrittura): le guardie stanno nella policy INSERT (no anonimi, no bloccati).
-- blocked_users: blocco unidirezionale; al blocco un trigger rimuove i follow
-- in ENTRAMBE le direzioni e la policy su follows impedisce di ricrearli.
--
-- Il feed dei seguiti passa dalla RPC get_following_feed (SECURITY INVOKER:
-- profiles/reviews/restaurants hanno SELECT pubblico, follows espone solo le
-- righe del follower via RLS). Contatori pubblici volutamente assenti: la
-- lettura di follows resta own-rows, nessuno puo' contare i follower altrui.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. TABELLE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE blocked_users (
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE follows (
  follower_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- Per il trigger di blocco (delete sul lato following) e per futuri conteggi.
CREATE INDEX idx_follows_following ON follows (following_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. RLS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own follows"
  ON follows FOR SELECT USING (auth.uid() = follower_id);

CREATE POLICY "Users delete own follows"
  ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Guardie dichiarative sull'insert: niente self-follow (CHECK di tabella),
-- niente follow di profili anonimi, niente follow attraverso un blocco
-- (in entrambe le direzioni).
CREATE POLICY "Users insert own follows"
  ON follows FOR INSERT WITH CHECK (
    auth.uid() = follower_id
    AND NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = following_id AND COALESCE(p.is_anonymous, false)
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b
      WHERE (b.blocker_id = follower_id  AND b.blocked_id = following_id)
         OR (b.blocker_id = following_id AND b.blocked_id = follower_id)
    )
  );

CREATE POLICY "Users manage own blocks"
  ON blocked_users FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. TRIGGER: il blocco scioglie il rapporto di follow nei due sensi
-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY DEFINER: deve cancellare anche la riga del bloccato (follower_id
-- altrui), che la RLS del chiamante non vede.

CREATE FUNCTION trg_block_removes_follows()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM follows
   WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
      OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_block_insert
AFTER INSERT ON blocked_users
FOR EACH ROW EXECUTE FUNCTION trg_block_removes_follows();

-- ════════════════════════════════════════════════════════════════════════════
-- 4. RPC: feed dei seguiti (paginata, stile get_paginated_reviews)
-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY INVOKER: follows filtrata dalla RLS own-rows del chiamante.
-- Esclude gli autori DIVENTATI anonimi dopo il follow (il follow resta ma
-- e' inerte finche' l'utente e' anonimo). Coordinate esplicite come nelle
-- RPC ristoranti (mig 021), total_count come get_paginated_reviews.

CREATE FUNCTION get_following_feed(
  p_limit  INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id                        UUID,
  restaurant_id             UUID,
  user_id                   UUID,
  rating                    SMALLINT,
  comment                   TEXT,
  allergens_snapshot        TEXT[],
  dietary_snapshot          TEXT[],
  photos                    JSONB,
  language                  TEXT,
  created_at                TIMESTAMPTZ,
  updated_at                TIMESTAMPTZ,
  likes_count               INT,
  author_username           TEXT,
  author_avatar_url         TEXT,
  restaurant_name           TEXT,
  restaurant_city           TEXT,
  restaurant_country        TEXT,
  restaurant_country_code   TEXT,
  restaurant_offers_lodging BOOLEAN,
  restaurant_lat            DOUBLE PRECISION,
  restaurant_lng            DOUBLE PRECISION,
  total_count               BIGINT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH visible AS (
    SELECT r.*, p.username AS author_username, p.avatar_url AS author_avatar_url
    FROM reviews r
    JOIN follows f  ON f.following_id = r.user_id AND f.follower_id = auth.uid()
    JOIN profiles p ON p.id = r.user_id
    WHERE NOT COALESCE(p.is_anonymous, false)
  ),
  total AS (
    SELECT COUNT(*) AS cnt FROM visible
  )
  SELECT
    v.id, v.restaurant_id, v.user_id, v.rating, v.comment,
    v.allergens_snapshot, v.dietary_snapshot, v.photos, v.language,
    v.created_at, v.updated_at, v.likes_count,
    v.author_username, v.author_avatar_url,
    rst.name, rst.city, rst.country, rst.country_code, rst.offers_lodging,
    ST_Y(rst.location::geometry) AS restaurant_lat,
    ST_X(rst.location::geometry) AS restaurant_lng,
    t.cnt AS total_count
  FROM visible v
  JOIN restaurants rst ON rst.id = v.restaurant_id
  CROSS JOIN total t
  ORDER BY v.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
