-- Migration 076: ricerca utenti per la pagina Community (discovery follow).
--
-- Sottostringa case-insensitive su username, prefissi in testa. Esclusi
-- anonimi e username NULL (stessa regola di get_leaderboard). A ~4k profili
-- il seq scan è irrilevante: niente indici trigram finché non servono.
-- I bloccati vengono filtrati lato client (cache blockService), non qui.

CREATE FUNCTION search_users(
  p_query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id         UUID,
  username   TEXT,
  avatar_url TEXT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH q AS (
    -- Escape dei metacaratteri LIKE: l'utente cerca testo letterale.
    SELECT replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') AS term
  )
  SELECT p.id, p.username, p.avatar_url
  FROM profiles p, q
  WHERE length(q.term) >= 2
    AND p.username IS NOT NULL
    AND NOT COALESCE(p.is_anonymous, false)
    AND p.username ILIKE '%' || q.term || '%'
  ORDER BY (p.username ILIKE q.term || '%') DESC, lower(p.username)
  LIMIT p_limit;
$$;
