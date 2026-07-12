-- Migration 078: search_users espone anche il numero di recensioni scritte.
--
-- La riga risultato mostra "quanto è attivo" un profilo: segnale utile per
-- decidere chi seguire. Conteggio via subquery correlata: gira solo sulle
-- max p_limit righe restituite, costo irrilevante.
--
-- DROP+CREATE (non OR REPLACE): aggiungere una colonna al RETURNS TABLE
-- cambia la signature di ritorno e Postgres non lo consente in-place.
-- Incorpora le esclusioni della 077 (bloccati + se stessi): applicabile
-- indifferentemente prima o dopo di essa — questa versione le contiene.

DROP FUNCTION IF EXISTS search_users(TEXT, INT);

CREATE FUNCTION search_users(
  p_query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id           UUID,
  username     TEXT,
  avatar_url   TEXT,
  review_count BIGINT
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
    (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) AS review_count
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
