-- Migration 062: "Ultimo accesso" reale (last_seen_at)
--
-- Problema: la dashboard admin mostrava auth.users.last_sign_in_at come
-- "Ultimo accesso", ma Supabase lo aggiorna SOLO al login esplicito, non al
-- refresh silenzioso della sessione. Con sessioni persistenti (autoRefreshToken)
-- il valore resta fermo all'ultimo login anche se l'utente usa l'app ogni
-- giorno -> sembra inattivo pur essendo attivo.
--
-- Soluzione: colonna denormalizzata last_seen_at su profiles, aggiornata da una
-- RPC throttlata lato app (cold-start + ritorno in foreground).
-- - Dato OPERATIVO d'account (NON analytics): aggiornato sempre quando l'utente
--   e' autenticato, indipendentemente dal consenso tracking.
-- - Timestamp server-side (now()), non falsificabile dal client.
-- - La dashboard legge questa colonna: lettura O(1), ordinabile, nessuna
--   aggregazione che degrada a scala.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Indice per l'ordinamento "Accesso recente" nella dashboard admin.
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen
  ON profiles (last_seen_at DESC NULLS LAST);

-- RPC: l'utente autenticato segna se stesso come "visto ora".
-- SECURITY DEFINER + now() server-side: il client non puo' falsificare il
-- valore ne' scrivere su profili altrui (filtro su auth.uid()).
CREATE OR REPLACE FUNCTION touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION touch_last_seen() TO authenticated;
