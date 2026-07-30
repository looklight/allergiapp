-- Migration 082: contatori d'uso ANONIMI (nessun dato personale).
--
-- Contesto: gli eventi analytics_events (mig 061) sono consent-gated lato
-- client e salvano user_id -> sottostimano l'uso reale. Qui aggiungiamo
-- contatori puramente aggregati (giorno -> numero), senza alcun riferimento
-- all'utente: non sono dati personali, quindi contano TUTTI gli utenti
-- indipendentemente dal consenso tracking (base: contatore anonimo, come un
-- contatore visite di una pagina web).
--
-- Tre pezzi:
-- 1. daily_counters            — contatori generici per (nome, giorno).
--    Primo uso: 'card_opened' (aperture card allergeni, dal client).
-- 2. restaurant_view_counts    — aperture scheda per (ristorante, giorno).
-- 3. touch_last_seen esteso    — al primo touch del giorno (Europe/Rome)
--    incrementa daily_counters 'active_users': DAU reale di tutti gli utenti
--    loggati, ATTIVO DA SUBITO con le build gia' in circolazione (>=1.1.0),
--    nessun aggiornamento app richiesto.
--
-- Limiti dichiarati:
-- - 'active_users' conta solo utenti autenticati (touch_last_seen richiede
--   auth.uid()) e parte dal giorno di applicazione (nessun retroattivo).
-- - 'card_opened' e restaurant_view_counts partono dalla prima build che
--   chiama le RPC bump_* (client) e non contano l'uso offline della card.
-- - Bucket giorno su Europe/Rome, coerente con le RPC admin (mig 504).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Tabelle contatori (RLS senza policy: scrittura solo via RPC SECURITY
--    DEFINER, lettura solo via RPC admin range 500+ su admin-prod)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS daily_counters (
  name  text NOT NULL,
  day   date NOT NULL,
  count int  NOT NULL DEFAULT 0,
  PRIMARY KEY (name, day)
);

ALTER TABLE daily_counters ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS restaurant_view_counts (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  day           date NOT NULL,
  count         int  NOT NULL DEFAULT 0,
  PRIMARY KEY (restaurant_id, day)
);

ALTER TABLE restaurant_view_counts ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. RPC di incremento chiamate dal client (fire-and-forget, anon+authenticated)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Whitelist nomi: evita che un client malevolo riempia la tabella di nomi
-- arbitrari. Estendere l'array quando si aggiungono contatori.
CREATE OR REPLACE FUNCTION bump_daily_counter(p_name text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO daily_counters AS dc (name, day, count)
  SELECT p_name, (now() AT TIME ZONE 'Europe/Rome')::date, 1
  WHERE p_name = ANY (ARRAY['card_opened'])
  ON CONFLICT (name, day) DO UPDATE SET count = dc.count + 1;
$$;

GRANT EXECUTE ON FUNCTION bump_daily_counter(text) TO anon, authenticated;

-- Il FK su restaurants scarta id inesistenti (l'errore muore nel
-- fire-and-forget del client, nessuna riga spazzatura).
CREATE OR REPLACE FUNCTION bump_restaurant_view(p_restaurant_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO restaurant_view_counts AS rvc (restaurant_id, day, count)
  VALUES (p_restaurant_id, (now() AT TIME ZONE 'Europe/Rome')::date, 1)
  ON CONFLICT (restaurant_id, day) DO UPDATE SET count = rvc.count + 1;
$$;

GRANT EXECUTE ON FUNCTION bump_restaurant_view(uuid) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. touch_last_seen: al primo touch del giorno incrementa 'active_users'
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION touch_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Rome')::date;
BEGIN
  -- Il WHERE fa da guardia: matcha solo al primo touch del giorno. Il row
  -- lock su profiles serializza due device concorrenti dello stesso utente,
  -- quindi niente doppi conteggi.
  UPDATE profiles SET last_seen_at = now()
  WHERE id = auth.uid()
    AND (last_seen_at IS NULL
         OR (last_seen_at AT TIME ZONE 'Europe/Rome')::date < v_today);

  IF FOUND THEN
    INSERT INTO daily_counters AS dc (name, day, count)
    VALUES ('active_users', v_today, 1)
    ON CONFLICT (name, day) DO UPDATE SET count = dc.count + 1;
  ELSE
    -- Touch successivi nella giornata: solo il timestamp (comportamento 062).
    UPDATE profiles SET last_seen_at = now() WHERE id = auth.uid();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION touch_last_seen() TO authenticated;
