-- Migration 504: RPC admin per il grafico "Utenti attivi" nella dashboard.
-- Read-only sopra `analytics_events` (vedi migration 061 su main),
-- gated da check role='admin' come le altre RPC del range 500+.
--
-- "Attivo" = utente distinto con almeno un evento tracciato nel giorno.
-- I bucket giorno sono sul calendario Europe/Rome (coerente col resto della UI IT).
-- Nota profondità: la serie parte da quando gli eventi vengono scritti (mig 061),
-- non dal lancio dell'app. Di conseguenza "nuovo" (primo evento mai) è gonfiato
-- nei primi giorni della finestra e si assesta dopo il rodaggio.
--
-- 1. get_daily_active_users(days)  — serie giornaliera: attivi / nuovi / di ritorno
-- 2. get_active_users_stats(days)  — aggregati: unici periodo, eventi periodo,
--                                    WAU (7g), MAU (30g), media DAU (30g, per stickiness)

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. get_daily_active_users — DAU giornaliero splittato nuovi vs di ritorno
--    new + returning = active (ogni utente in un giorno è esattamente uno dei due,
--    in base al giorno del suo primo evento in assoluto)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_daily_active_users(int);

CREATE FUNCTION get_daily_active_users(p_days int DEFAULT 30)
RETURNS TABLE (
  day date,
  active_users int,
  new_users int,
  returning_users int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH first_seen AS (
    SELECT user_id, (MIN(created_at) AT TIME ZONE 'Europe/Rome')::date AS first_day
    FROM analytics_events
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  )
  SELECT
    (ae.created_at AT TIME ZONE 'Europe/Rome')::date AS day,
    COUNT(DISTINCT ae.user_id)::int AS active_users,
    COUNT(DISTINCT ae.user_id) FILTER (
      WHERE fs.first_day = (ae.created_at AT TIME ZONE 'Europe/Rome')::date
    )::int AS new_users,
    COUNT(DISTINCT ae.user_id) FILTER (
      WHERE fs.first_day < (ae.created_at AT TIME ZONE 'Europe/Rome')::date
    )::int AS returning_users
  FROM analytics_events ae
  JOIN first_seen fs ON fs.user_id = ae.user_id
  WHERE ae.created_at > now() - (p_days || ' days')::interval
    AND ae.user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION get_daily_active_users(int) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. get_active_users_stats — numeri in testata al grafico
--    period_active / period_events seguono la finestra scelta (p_days);
--    wau / mau / avg_dau sono finestre fisse (7g / 30g / media DAU 30g),
--    servono per WAU, MAU e stickiness (avg_dau / mau) e NON cambiano coi chip.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_active_users_stats(int);
-- rimuove la vecchia RPC totale rimpiazzata da questa
DROP FUNCTION IF EXISTS get_active_users_total(int);

CREATE FUNCTION get_active_users_stats(p_days int DEFAULT 30)
RETURNS TABLE (
  period_active int,
  period_events int,
  wau int,
  mau int,
  avg_dau numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(DISTINCT user_id)::int FROM analytics_events
       WHERE created_at > now() - (p_days || ' days')::interval AND user_id IS NOT NULL),
    (SELECT COUNT(*)::int FROM analytics_events
       WHERE created_at > now() - (p_days || ' days')::interval AND user_id IS NOT NULL),
    (SELECT COUNT(DISTINCT user_id)::int FROM analytics_events
       WHERE created_at > now() - interval '7 days' AND user_id IS NOT NULL),
    (SELECT COUNT(DISTINCT user_id)::int FROM analytics_events
       WHERE created_at > now() - interval '30 days' AND user_id IS NOT NULL),
    (SELECT AVG(d)::numeric FROM (
       SELECT COUNT(DISTINCT user_id) AS d FROM analytics_events
       WHERE created_at > now() - interval '30 days' AND user_id IS NOT NULL
       GROUP BY (created_at AT TIME ZONE 'Europe/Rome')::date
     ) t)
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION get_active_users_stats(int) TO authenticated;
