-- Migration 079: dati pubblici profilo per la pagina web /u/{username}.
--
-- Stesso pattern di get_restaurant_public_by_slug: una RPC che dà alla
-- serverless function del sito (branch landing, client anon) tutto quello
-- che serve in una chiamata. Mai profili anonimi (stessa guardia di
-- get_profile_id_by_username, mig 078). Conteggi come in search_users
-- (mig 077): subquery correlate su una sola riga, costo irrilevante.

CREATE FUNCTION get_profile_public_by_username(p_username TEXT)
RETURNS TABLE (
  id            UUID,
  username      TEXT,
  created_at    TIMESTAMPTZ,
  review_count  BIGINT,
  country_count BIGINT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.created_at,
    (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id) AS review_count,
    (SELECT COUNT(DISTINCT rst.country_code)
     FROM reviews r
     JOIN restaurants rst ON rst.id = r.restaurant_id
     WHERE r.user_id = p.id AND rst.country_code IS NOT NULL) AS country_count
  FROM profiles p
  WHERE lower(p.username) = lower(trim(p_username))
    AND NOT COALESCE(p.is_anonymous, false)
  LIMIT 1;
$$;
