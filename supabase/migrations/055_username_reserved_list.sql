-- Migration 055: amplia la reserved list di is_username_available.
-- Aggiunge:
--   - substring block per 'user' e 'utente' (anti-confusione con auto-generati)
--   - parole esatte per impersonificazione di ruoli/sistema

CREATE OR REPLACE FUNCTION is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    -- formato valido
    p_username ~ '^[A-Za-z0-9][A-Za-z0-9_.]{1,28}[A-Za-z0-9_]$'
    AND p_username !~ '\.\.'
    -- substring block (case-insensitive): protegge contro pattern user_xxxxxx
    -- auto-generati e l'equivalente italiano
    AND p_username !~* 'user|utente'
    -- match esatto (case-insensitive): anti-impersonificazione ruoli/brand
    AND lower(p_username) NOT IN (
      'admin', 'support', 'allergiapp', 'help', 'info',
      'system', 'null', 'undefined', 'staff', 'team',
      'moderator', 'mod', 'bot', 'official', 'verified',
      'root', 'allergy', 'allergi', 'me'
    )
    -- non gia' preso (esclude l'utente corrente per consentire "no-op" save)
    AND NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE lower(username) = lower(p_username)
        AND id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    );
$$;
