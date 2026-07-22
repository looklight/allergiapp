-- Migration 505 (admin-only, range 500+): follower nella lista utenti,
-- follow + liste/salvataggi nella scheda utente.
--
-- Divisione deliberata: nella LISTA sta solo cio' per cui si ordina
-- (followers_count, che senza colonna renderebbe illeggibile il sort);
-- nella SCHEDA stanno i numeri che descrivono il singolo utente, dove non
-- si paga larghezza di tabella.
--
-- Privacy: solo aggregati. Le liste nascono private (mig 069), quindi qui
-- si contano; NON si espongono nomi delle liste ne' ristoranti salvati. Se
-- un domani servisse il contenuto, limitarsi a visibility = 'public'.
--
-- La pagina /users della admin mostrava attivita' (recensioni) e presenza
-- (last_seen_at) ma non il peso nel grafo follow, live dalla 1.3.0. Qui
-- get_profiles_with_email espone followers_count e accetta il sort
-- 'followers_desc', cosi' la lista utenti risponde a "chi sono gli account
-- piu' seguiti" incrociandolo con email, recensioni e ultimo accesso.
--
-- Complementare a get_top_followed_profiles (mig 080), che resta la classifica
-- top-N per la dashboard: quella e' una vetrina, questa e' la lista completa
-- con ricerca e paginazione.
--
-- Il conteggio e' una subquery correlata come reviews_count, coperta
-- dall'indice idx_follows_following (mig 075). Come per 'reviews_desc', il
-- conteggio si valuta su tutti i profili prima del LIMIT: stesso compromesso
-- gia' accettato, nessun costo nuovo di natura diversa.
--
-- Cambia la RETURNS TABLE -> serve DROP+CREATE. La signature resta identica,
-- quindi la chiamata dalla admin non cambia forma.
--
-- PREREQUISITO: tabelle follows (mig 075) e collections/collection_items
-- (mig 069) gia' presenti sul DB live.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. get_profiles_with_email — lista /users: solo followers_count + sort
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
  followers_count int,
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
    (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = p.id) AS followers_count,
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
    CASE WHEN sort_by = 'reviews_desc'    THEN (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) END DESC NULLS LAST,
    CASE WHEN sort_by = 'reviews_asc'     THEN (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) END ASC  NULLS LAST,
    CASE WHEN sort_by = 'followers_desc'  THEN (SELECT COUNT(*) FROM follows f WHERE f.following_id = p.id) END DESC NULLS LAST,
    CASE WHEN sort_by = 'last_seen_desc'  THEN p.last_seen_at END DESC NULLS LAST,
    p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. get_profile_with_email — scheda /users/[id]: follow + liste/salvataggi
-- ═══════════════════════════════════════════════════════════════════════════════
-- Quattro conteggi in piu' sulla RPC che la scheda chiama gia': nessun
-- round-trip aggiuntivo. Girano tutti su una riga sola (WHERE p.id = ...),
-- quindi il costo e' trascurabile a prescindere dagli indici.
--
-- restaurants_count e' l'unico conteggio "vecchio" che la scheda non aveva:
-- i riquadri Ristoranti/Recensioni si calcolavano da array caricati con
-- .limit(50), quindi si fermavano a 50. Accanto a conteggi esatti sarebbe
-- una scheda che si contraddice, percio' ora arrivano entrambi da qui.
--
-- collections_count esclude is_default: la lista "Preferiti" esiste per
-- chiunque salvi qualcosa, contarla direbbe solo "ha usato i preferiti", che
-- e' gia' saved_count. Escludendola il numero risponde alla domanda vera:
-- questo utente ORGANIZZA i salvataggi in liste sue?

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
  restaurants_count int,
  followers_count int,
  following_count int,
  collections_count int,
  saved_count int,
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
    (SELECT COUNT(*)::int FROM restaurants rst WHERE rst.added_by = p.id) AS restaurants_count,
    (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = p.id) AS followers_count,
    (SELECT COUNT(*)::int FROM follows f WHERE f.follower_id = p.id) AS following_count,
    (SELECT COUNT(*)::int FROM collections c
      WHERE c.user_id = p.id AND NOT c.is_default) AS collections_count,
    (SELECT COUNT(*)::int FROM collection_items ci
      JOIN collections c ON c.id = ci.collection_id
      WHERE c.user_id = p.id) AS saved_count,
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
