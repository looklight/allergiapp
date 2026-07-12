-- Migration 078: risoluzione username → id per il deep link profilo /u/{username}.
--
-- Guardia server-side: mai risolvere profili anonimi (il link condiviso di un
-- utente poi diventato anonimo smette semplicemente di aprire il profilo).
-- Match case-insensitive, coerente con l'indice UNIQUE su lower(username)
-- (mig 053).

CREATE FUNCTION get_profile_id_by_username(p_username TEXT)
RETURNS UUID
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT p.id
  FROM profiles p
  WHERE lower(p.username) = lower(trim(p_username))
    AND NOT COALESCE(p.is_anonymous, false)
  LIMIT 1;
$$;
