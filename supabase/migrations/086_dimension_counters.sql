-- STATO: DA APPLICARE a mano dal SQL editor (tracking locale fermo alla 045).
-- Migration 086: contatori ANONIMI con una dimensione (nessun dato personale).
--
-- Contesto: la 082 ha introdotto daily_counters (nome, giorno) -> numero. Serve
-- sapere anche CON QUALI esigenze e in QUALE lingua la card viene usata, e quali
-- esigenze si usano come filtro sulla mappa. Oggi quel dato esiste solo come
-- proprieta' utente su Firebase (elenco allergeni attaccato alla persona): dato
-- sanitario art. 9 spedito a Google. Qui lo sostituiamo con un aggregato.
--
-- ═══ LA REGOLA DA NON VIOLARE MAI ═══════════════════════════════════════════
-- Un contatore PER OGNI esigenza, MAI la combinazione.
-- Salvare l'insieme ("gluten+peanuts+nickel") sembrera' un'ottimizzazione
-- ovvia: non lo e'. Con pochi utenti una combinazione rara identifica una
-- persona sola, e la tabella tornerebbe a essere un profilo sanitario.
-- Contate separatamente, le righe non si possono ricombinare.
-- ════════════════════════════════════════════════════════════════════════════
--
-- Nessun riferimento all'utente, al dispositivo o alla sessione: non sono dati
-- personali, quindi (come la 082) NON passano dal gate del consenso e contano
-- tutti gli utenti.
--
-- La chiave e' testo libero validato per FORMA, non per appartenenza a una
-- lista: gli allergeni sono 15, gli alimenti extra 79, le restrizioni 39, le
-- lingue 86, e cambiano. Una lista chiusa qui dentro vorrebbe dire una
-- migration a ogni alimento nuovo — cioe' il difetto che ha oggi
-- landing/lib/labels.js ("ricordati di aggiungerlo anche qui").
--
-- ⚠️ I codici non si rinominano MAI: la storia si spaccherebbe in due serie
-- senza nessun errore a segnalarlo. Le etichette visibili si cambiano quando
-- si vuole, il codice sotto e' per sempre.
--
-- Limiti dichiarati:
-- - conta aperture, non persone (chi apre dieci volte pesa dieci);
-- - la somma delle esigenze e' piu' alta del numero di aperture (ognuno ne ha
--   diverse): sulla dashboard vanno presentate come PRESENZE, non come
--   percentuali di utenti;
-- - la card usata offline non arriva (nessuna chiamata possibile);
-- - nessun retroattivo: la serie parte dal giorno del rilascio dell'app.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Tabella (RLS senza policy: scrittura solo via RPC SECURITY DEFINER,
--    lettura solo via RPC admin range 500+ su admin-prod)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS daily_dimension_counters (
  name  text NOT NULL,  -- 'card_need' | 'card_language' | 'filter_need'
  day   date NOT NULL,
  key   text NOT NULL,  -- 'gluten', 'fava_beans', 'de', 'pregnancy', ...
  count int  NOT NULL DEFAULT 0,
  PRIMARY KEY (name, day, key)
);

ALTER TABLE daily_dimension_counters ENABLE ROW LEVEL SECURITY;

-- L'ordine della PK (name, day, key) serve alle letture della dashboard, che
-- chiedono sempre "un nome, un intervallo di giorni" e scorrono le chiavi.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. RPC generica: una dimensione, piu' chiavi in una sola chiamata
-- ═══════════════════════════════════════════════════════════════════════════════

-- Whitelist sui NOMI (pochi e nostri), validazione di forma sulle CHIAVI
-- (molte e in crescita). Estendere l'array quando si aggiunge una dimensione.
--
-- DISTINCT obbligatorio, non difensivo: 'diabetes', 'nickel', 'histamine',
-- 'pregnancy' e 'vegetarian' esistono sia in dietModes che in otherRestrictions
-- che in diets, quindi la stessa chiave puo' arrivare due volte nello stesso
-- array. Senza DISTINCT, ON CONFLICT colpirebbe la stessa riga due volte nella
-- stessa istruzione e Postgres rifiuta l'intera INSERT.
--
-- Il taglio a 40 chiavi e i 40 caratteri per chiave limitano il danno di un
-- client ostile: al massimo righe spazzatura filtrabili, mai una fuga di dati.
CREATE OR REPLACE FUNCTION bump_daily_dimensions(p_name text, p_keys text[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO daily_dimension_counters AS ddc (name, day, key, count)
  SELECT p_name, (now() AT TIME ZONE 'Europe/Rome')::date, s.key, 1
  FROM (SELECT DISTINCT k AS key FROM unnest(p_keys[1:40]) AS k) s
  WHERE p_name = ANY (ARRAY['card_need', 'card_language', 'filter_need'])
    AND s.key ~ '^[a-z0-9_]{1,40}$'
  ON CONFLICT (name, day, key) DO UPDATE SET count = ddc.count + 1;
$$;

GRANT EXECUTE ON FUNCTION bump_daily_dimensions(text, text[]) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RPC dedicata alla card: totale + esigenze + lingua in UN round trip
-- ═══════════════════════════════════════════════════════════════════════════════

-- La card e' il percorso piu' caldo dell'app: senza questa, ogni apertura
-- costerebbe tre chiamate (card_opened + esigenze + lingua). Qui resta una,
-- esattamente come oggi.
--
-- Incrementa anche daily_counters 'card_opened', quindi il widget esistente
-- continua a funzionare. Le build vecchie in circolazione chiamano ancora
-- bump_daily_counter('card_opened'), che resta valida: nessun doppio conteggio
-- perche' un client chiama l'una o l'altra, mai entrambe.
CREATE OR REPLACE FUNCTION bump_card_open(p_needs text[], p_language text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Rome')::date;
BEGIN
  INSERT INTO daily_counters AS dc (name, day, count)
  VALUES ('card_opened', v_today, 1)
  ON CONFLICT (name, day) DO UPDATE SET count = dc.count + 1;

  -- p_needs NULL o vuoto: unnest non produce righe, l'INSERT non fa nulla.
  INSERT INTO daily_dimension_counters AS ddc (name, day, key, count)
  SELECT 'card_need', v_today, s.key, 1
  FROM (SELECT DISTINCT k AS key FROM unnest(p_needs[1:40]) AS k) s
  WHERE s.key ~ '^[a-z0-9_]{1,40}$'
  ON CONFLICT (name, day, key) DO UPDATE SET count = ddc.count + 1;

  IF p_language ~ '^[a-z]{2,3}$' THEN
    INSERT INTO daily_dimension_counters AS ddc (name, day, key, count)
    VALUES ('card_language', v_today, p_language, 1)
    ON CONFLICT (name, day, key) DO UPDATE SET count = ddc.count + 1;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION bump_card_open(text[], text) TO anon, authenticated;
