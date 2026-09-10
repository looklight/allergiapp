-- Migration 509 (admin-prod): lettura dei contatori con dimensione (mig 086 su main).
-- Read-only sopra `daily_dimension_counters`, gated da check role='admin' come
-- tutto il range 500+.
--
-- PREREQUISITO: migration 086 applicata sul DB live (tabella
-- daily_dimension_counters + bump_daily_dimensions + bump_card_open).
-- Applicata l'11/09/2026.
--
-- Due pezzi:
-- 1. get_daily_dimensions(nome, giorni, limite) — generica: serve 'card_need',
--    'card_language' e 'filter_need' con una funzione sola.
-- 2. get_top_filtered_needs RIPUNTATA sui contatori (prima leggeva l'elenco
--    esigenze dentro l'evento `filter_applied`, che dalla prossima build non lo
--    porta piu': era un dato sanitario legato all'id dell'utente).
--
-- ⚠️ Le due sorgenti NON si sommano e non vanno mescolate: l'evento contava solo
-- chi aveva dato il consenso analytics, il contatore conta tutti. Alla prima
-- build che include la 086 la serie fa un salto verso l'alto: e' il consenso che
-- non filtra piu', non un boom di utenti. I dati storici restano in
-- analytics_events se un giorno servissero.
--
-- ⚠️ Le esigenze sono PRESENZE, non utenti: chi ha otto allergeni ne conta otto
-- a ogni apertura, quindi la somma supera il numero di aperture. Non presentarle
-- come percentuali di utenti.
--
-- Le due sorgenti restano ENTRAMBE, affiancate e mai sommate — stessa scelta
-- gia' fatta per gli utenti attivi (barre consenzienti + linea 'Reali') e per le
-- aperture di scheda (508: consenzienti e anonime una accanto all'altra).
-- Cosi' la serie dei consenzienti non si interrompe mentre quella anonima si
-- riempie da sola man mano che gli utenti aggiornano l'app.
--
-- Nessun indice nuovo: la PK (name, day, key) della 086 copre il filtro
-- (name, day) di entrambe le funzioni.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. get_daily_dimensions — classifica delle chiavi di una dimensione
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_daily_dimensions(text, int, int);

CREATE FUNCTION get_daily_dimensions(p_name text, p_days int DEFAULT 30, p_limit int DEFAULT 20)
RETURNS TABLE (
  key text,
  count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ddc.key, SUM(ddc.count)::int AS count
  FROM daily_dimension_counters ddc
  WHERE ddc.name = p_name
    AND ddc.day > ((now() AT TIME ZONE 'Europe/Rome')::date - p_days)
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  GROUP BY ddc.key
  -- ORDER BY sull'espressione, non sull'alias: `count` sarebbe al tempo stesso
  -- il nome della colonna di output (OUT parameter di RETURNS TABLE) e una
  -- colonna della tabella. Postgres risolverebbe sull'output, ma qualificare
  -- tutto e' la convenzione del range 500+ (v. 507) e non lascia dubbi.
  ORDER BY SUM(ddc.count) DESC, ddc.key
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_daily_dimensions(text, int, int) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. get_top_filtered_needs — stessa firma, sorgente nuova
-- ═══════════════════════════════════════════════════════════════════════════════

-- `use_count` conserva il significato che aveva nella 503 (evento
-- `filter_applied`, solo chi ha dato il consenso analytics) e continua a
-- riempirsi con le build 1.3.0+ gia' in giro. `anon_count` e' la stessa
-- classifica dal contatore anonimo, che conta tutti ma parte da zero e cresce
-- man mano che gli utenti installano la build con la 086.
--
-- ⚠️ Non sommarle e non metterle nello stesso asse: la prima e' un
-- sottoinsieme della seconda, e per un periodo lungo la seconda sara' la piu'
-- piccola delle due. Due colonne dichiarate, come nella 508.
--
-- FULL JOIN perche' un'esigenza puo' esistere in una sorgente e non nell'altra:
-- durante la transizione quasi tutte staranno solo a sinistra.
DROP FUNCTION IF EXISTS get_top_filtered_needs(int, int);

CREATE FUNCTION get_top_filtered_needs(p_days int DEFAULT 30, p_limit int DEFAULT 10)
RETURNS TABLE (
  code text,
  use_count int,
  anon_count int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH consenting AS (
    SELECT t.code, COUNT(*)::int AS n
    FROM analytics_events ae
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(ae.properties->'needs') = 'array'
           THEN ae.properties->'needs'
           ELSE '[]'::jsonb
      END
    ) AS t(code)
    WHERE ae.event_name = 'filter_applied'
      AND ae.created_at > now() - (p_days || ' days')::interval
    GROUP BY t.code
  ),
  anonymous AS (
    SELECT ddc.key AS code, SUM(ddc.count)::int AS n
    FROM daily_dimension_counters ddc
    WHERE ddc.name = 'filter_need'
      AND ddc.day > ((now() AT TIME ZONE 'Europe/Rome')::date - p_days)
    GROUP BY ddc.key
  )
  SELECT
    COALESCE(c.code, a.code) AS code,
    COALESCE(c.n, 0) AS use_count,
    COALESCE(a.n, 0) AS anon_count
  FROM consenting c
  FULL JOIN anonymous a ON a.code = c.code
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
  -- Ordina sull'anonimo quando c'e', sul consenziente finche' e' a zero: la
  -- classifica non si riordina di colpo il giorno in cui esce la build.
  ORDER BY COALESCE(a.n, 0) DESC, COALESCE(c.n, 0) DESC, COALESCE(c.code, a.code)
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_top_filtered_needs(int, int) TO authenticated;
