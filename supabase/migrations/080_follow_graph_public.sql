-- Migration 080: grafo follow visibile — conteggi e liste pubbliche.
--
-- Rovescia la scelta della mig 075 ("contatori pubblici volutamente
-- assenti"): deciso 2026-07-12, PRIMA del rilascio della feature (1.3.0),
-- quindi nessun utente ha costruito il grafo credendolo privato. In un'app
-- community il grafo visibile è il motore di scoperta: chi segue chi.
--
-- La RLS own-rows su follows resta intatta: l'esposizione passa SOLO da
-- queste RPC SECURITY DEFINER, con guardia unica "profilo non anonimo,
-- oppure se stessi". Niente filtro bloccati: il trigger della 075 scioglie
-- i follow nei due sensi, il grafo non contiene mai archi tra bloccati.
--
-- Attività (recensioni/paesi) via subquery correlate come search_users
-- (mig 077): girano solo sulle max p_limit righe restituite. I profili
-- DIVENTATI anonimi dopo il follow restano nei conteggi ma nelle liste
-- escono mascherati (username/avatar NULL, attività a 0), stesso
-- comportamento della gestione seguiti in app.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Conteggi follower/seguiti di un profilo
-- ════════════════════════════════════════════════════════════════════════════
-- Una riga sola; nessuna riga se il profilo non esiste o è anonimo (e non è
-- il chiamante). L'indice idx_follows_following (mig 075) copre il conteggio
-- follower, la PK (follower_id, following_id) quello dei seguiti.

CREATE FUNCTION get_follow_counts(p_profile_id UUID)
RETURNS TABLE (
  follower_count  BIGINT,
  following_count BIGINT
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM follows f WHERE f.following_id = p.id) AS follower_count,
    (SELECT COUNT(*) FROM follows f WHERE f.follower_id = p.id) AS following_count
  FROM profiles p
  WHERE p.id = p_profile_id
    AND (NOT COALESCE(p.is_anonymous, false) OR p.id = auth.uid());
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Liste follower / seguiti
-- ════════════════════════════════════════════════════════════════════════════
-- Paginate, ordinate per follow più recente. La gestione seguiti in app passa
-- da get_following_public (prima leggeva follows via RLS, senza attività);
-- le liste sui profili altrui arrivano con la Fase B della UI.
-- total_count su ogni riga (COUNT(*) OVER (): calcolato sull'insieme filtrato
-- PRIMA del LIMIT — stesso totale del CTE `total` del feed, mig 075): le
-- intestazioni mostrano il totale vero anche quando la lista è cappata.

CREATE FUNCTION get_followers_public(
  p_profile_id UUID,
  p_limit  INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  username      TEXT,
  avatar_url    TEXT,
  is_anonymous  BOOLEAN,
  review_count  BIGINT,
  country_count BIGINT,
  total_count   BIGINT
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pr.id,
    CASE WHEN COALESCE(pr.is_anonymous, false) THEN NULL ELSE pr.username END,
    CASE WHEN COALESCE(pr.is_anonymous, false) THEN NULL ELSE pr.avatar_url END,
    COALESCE(pr.is_anonymous, false),
    CASE WHEN COALESCE(pr.is_anonymous, false) THEN 0 ELSE
      (SELECT COUNT(*) FROM reviews r WHERE r.user_id = pr.id)
    END,
    CASE WHEN COALESCE(pr.is_anonymous, false) THEN 0 ELSE
      (SELECT COUNT(DISTINCT rst.country_code)
       FROM reviews r
       JOIN restaurants rst ON rst.id = r.restaurant_id
       WHERE r.user_id = pr.id AND rst.country_code IS NOT NULL)
    END,
    COUNT(*) OVER ()
  FROM follows f
  JOIN profiles pr ON pr.id = f.follower_id
  WHERE f.following_id = p_profile_id
    AND EXISTS (
      SELECT 1 FROM profiles t
      WHERE t.id = p_profile_id
        AND (NOT COALESCE(t.is_anonymous, false) OR t.id = auth.uid())
    )
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

CREATE FUNCTION get_following_public(
  p_profile_id UUID,
  p_limit  INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  username      TEXT,
  avatar_url    TEXT,
  is_anonymous  BOOLEAN,
  review_count  BIGINT,
  country_count BIGINT,
  total_count   BIGINT
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pr.id,
    CASE WHEN COALESCE(pr.is_anonymous, false) THEN NULL ELSE pr.username END,
    CASE WHEN COALESCE(pr.is_anonymous, false) THEN NULL ELSE pr.avatar_url END,
    COALESCE(pr.is_anonymous, false),
    CASE WHEN COALESCE(pr.is_anonymous, false) THEN 0 ELSE
      (SELECT COUNT(*) FROM reviews r WHERE r.user_id = pr.id)
    END,
    CASE WHEN COALESCE(pr.is_anonymous, false) THEN 0 ELSE
      (SELECT COUNT(DISTINCT rst.country_code)
       FROM reviews r
       JOIN restaurants rst ON rst.id = r.restaurant_id
       WHERE r.user_id = pr.id AND rst.country_code IS NOT NULL)
    END,
    COUNT(*) OVER ()
  FROM follows f
  JOIN profiles pr ON pr.id = f.following_id
  WHERE f.follower_id = p_profile_id
    AND EXISTS (
      SELECT 1 FROM profiles t
      WHERE t.id = p_profile_id
        AND (NOT COALESCE(t.is_anonymous, false) OR t.id = auth.uid())
    )
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. RPC admin: monitoraggio del grafo dalla dashboard
-- ════════════════════════════════════════════════════════════════════════════
-- Solo lato SQL per ora (la card in admin/ arriva a ridosso della 1.3.0):
-- incluse qui per chiudere il capitolo grafo in una migration sola invece di
-- una 081 a funzioni già live. Guardia is_admin() (mig 019) come le altre
-- RPC admin. Il trend follow/giorno è volutamente fuori: si deriverà da
-- analytics_events (user_followed/user_unfollowed) quando si farà la card.

-- Adozione della feature: senza ruolo admin HAVING è falso → zero righe
-- (a differenza del WHERE, che su una query aggregata darebbe una riga di 0).
CREATE FUNCTION get_follow_admin_stats()
RETURNS TABLE (
  total_follows   BIGINT,  -- archi attivi nel grafo
  users_following BIGINT,  -- utenti che seguono almeno un profilo
  users_followed  BIGINT   -- profili seguiti da almeno qualcuno
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*),
    COUNT(DISTINCT f.follower_id),
    COUNT(DISTINCT f.following_id)
  FROM follows f
  HAVING is_admin();
$$;

-- Top profili per follower (gestione community). L'admin vede anche gli
-- anonimi in chiaro, come nel resto della dashboard: is_anonymous serve
-- solo a badgearli nella UI.
CREATE FUNCTION get_top_followed_profiles(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id             UUID,
  username       TEXT,
  avatar_url     TEXT,
  is_anonymous   BOOLEAN,
  follower_count BIGINT
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    COALESCE(p.is_anonymous, false),
    COUNT(*) AS follower_count
  FROM follows f
  JOIN profiles p ON p.id = f.following_id
  WHERE is_admin()
  GROUP BY p.id, p.username, p.avatar_url, p.is_anonymous
  ORDER BY COUNT(*) DESC, lower(p.username)
  LIMIT p_limit;
$$;
