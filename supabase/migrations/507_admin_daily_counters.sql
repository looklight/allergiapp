-- Migration 507: RPC admin per leggere i contatori anonimi (mig 082 su main).
-- Read-only sopra `daily_counters`, gated da check role='admin' come le altre
-- RPC del range 500+.
--
-- PREREQUISITO: migration 082 (tabella daily_counters + touch_last_seen esteso)
-- gia' applicata sul DB live.
--
-- Generica sul nome contatore, cosi' serve sia 'active_users' (DAU reale,
-- attivo da subito) sia i contatori futuri ('card_opened' dalla prossima
-- build). La serie parte dal giorno di applicazione della 082: nessun dato
-- retroattivo.

DROP FUNCTION IF EXISTS get_daily_counters(text, int);

CREATE FUNCTION get_daily_counters(p_name text, p_days int DEFAULT 30)
RETURNS TABLE (
  day date,
  count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dc.day, dc.count
  FROM daily_counters dc
  WHERE dc.name = p_name
    AND dc.day > ((now() AT TIME ZONE 'Europe/Rome')::date - p_days)
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  ORDER BY dc.day;
$$;

GRANT EXECUTE ON FUNCTION get_daily_counters(text, int) TO authenticated;
