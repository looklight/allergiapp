-- STATO: APPLICATA in produzione il 2026-09-05, ma NON con questo file —
--        con la tecnica delle rinomine descritta qui sotto. Il DROP + CREATE
--        dentro BEGIN/COMMIT è stato provato e NON ha funzionato.
-- 085: il taglio a 1000 righe di get_pins_in_bounds smette di essere italiano.
--      Include e SUPERA la 084 (mai applicata): la colonna is_premium c'è, ma il
--      premium è protetto meglio (v. "Il premium" più sotto). Applicare SOLO
--      questa; la 084 resta nel repo come verbale della decisione.
--
-- ─── Il problema ────────────────────────────────────────────────────────────
-- La funzione viva (073) non ha nessun ORDER BY, e PostgREST tronca ogni
-- risposta a 1000 righe (max-rows). Le 1000 righe che sopravvivono sono quindi
-- quelle che l'ordine fisico della tabella mette per prime: in pratica le
-- italiane. Misurato il 2026-09-05: su 33 locali nordici ne arrivano 9, e a
-- zoom Europa ~2700 locali su 3692 non arrivano mai. Non è un problema di
-- disegno — il client può diradare solo ciò che gli è arrivato — e peggiora
-- crescendo: oggi si mostra il 24% dell'archivio, a 40.000 locali sarà il 2,4%.
--
-- ─── La cura ────────────────────────────────────────────────────────────────
-- Prima di tagliare, il rettangolo richiesto viene diviso in una griglia 31×31
-- e i locali di ogni quadretto vengono numerati. Il taglio prende PRIMA il
-- primo di ogni quadretto abitato — cioè la copertura geografica — e solo dopo
-- tutto il resto, fino a esaurire le 1000 righe.
--
-- Perché 31 e non un numero tondo: 31×31 = 961 < 1000. È una garanzia
-- dimostrabile e non una taratura — il primo giro non può MAI essere troncato,
-- quindi ogni quadretto che contiene almeno un locale riceve sempre almeno un
-- rappresentante, a qualunque zoom. Con una griglia più fine i quadretti
-- abitati potrebbero superare le 1000 righe e il taglio tornerebbe arbitrario,
-- cioè di nuovo italiano.
--
-- L'ordinamento finale è a DUE GRUPPI, non un giro di giostra fino in fondo:
-- prima i primi di ogni quadretto (la copertura), poi tutto il resto per densità.
-- Il perché, e i numeri che l'hanno deciso, stanno nel commento sull'ORDER BY.
--
-- Cosa cambia per chi guarda: a zoom largo compare lo scheletro geografico
-- (Scandinavia, Iberia, est Europa), e sopra ci va la densità dove i locali sono
-- tanti. L'Italia resta di gran lunga la regione più fitta ma cede posti: è una
-- REDISTRIBUZIONE delle stesse 1000 righe, non un aumento. Per togliere il tetto
-- servono i tile (MAP_SCALING.md §0-ter, passo B).
--
-- MISURATO davvero, le due funzioni una accanto all'altra nello stesso istante
-- sullo stesso rettangolo Europa (35,-10 → 70,30), 1000 righe:
--
--                    073 (prima)   085 (dopo)
--   nordici                16          23
--   italiani              778         725
--   paesi distinti         27          35
--
-- ⚠️ Le simulazioni preventive avevano previsto 28 nordici e 477 italiani:
-- SBAGLIAVANO, perché distribuivano i locali italiani uniformemente sulla
-- penisola mentre in realtà sono ammassati nelle città. Conseguenza da
-- ricordare: i quadretti abitati sono molti meno del previsto (~200 su 961),
-- quindi la copertura costa poco budget e la gran parte delle 1000 righe finisce
-- comunque al secondo gruppo, cioè alla densità, cioè all'Italia.
--
-- Corollario verificato: la FORMA dei quadretti non conta. Provate 31×31,
-- 40×24, 44×22, 50×19, 60×16 — nordici 23-24 in tutte. Non ha senso inseguire
-- celle quadrate sullo schermo: a decidere non è la griglia, è il rapporto fra
-- i due gruppi.
--
-- Se un giorno si preferisse la copertura massima alla densità, la manopola è
-- una sola: alzare il 2 in LEAST(rn, 2), fino a togliere il LEAST del tutto.
--
-- A zoom ravvicinato non cambia NIENTE: sotto le 1000 righe totali tornano
-- tutte comunque, e l'ordine è irrilevante.
--
-- ─── Il premium ─────────────────────────────────────────────────────────────
-- La 084 metteva `ORDER BY is_premium DESC` in testa, globale. Funziona con
-- zero premium, ma il giorno che fossero molti si mangerebbero il budget delle
-- 1000 righe sottraendo spazio GEOGRAFICO — cioè comprerebbero il vuoto altrui.
-- Qui il premium vince dentro il suo quadretto (quindi rn = 1, quindi è nel
-- primo giro, quindi è protetto dal taglio) senza poter mai spostare una riga
-- fuori da un altro quadretto. Stessa promessa commerciale, senza l'effetto
-- collaterale, e il tetto dei premium visibili è per costruzione il numero di
-- quadretti in cui stanno.
--
-- Invariato dalla 084: NON si usa `r.is_premium` nudo (è l'intento, non la
-- verità: niente lo fa scadere) ma il booleano già risolto con la scadenza.
-- APERTO, come nella 084: se gli abbonamenti avranno una macchina a stati,
-- aggiungere `r.subscription_status` al predicato — da decidere, non da
-- indovinare.
--
-- VINCOLO DI PRODOTTO invariato: il premium compra visibilità, MAI il colore o
-- la semantica di compatibilità. Qui infatti il criterio dentro il quadretto è
-- cieco alle esigenze dell'utente: il server non PUÒ scegliere "il più verde"
-- senza rompere l'invariante pinCache filter-independent (MAP_SCALING.md §6).
-- Scegliere il rappresentante più compatibile resta lavoro del client, che è
-- l'unico a sapere di che ha bisogno chi guarda.
--
-- ─── Contratto col client: invariato ────────────────────────────────────────
-- `mapPinRow` (services/restaurant.types.ts:27) legge ogni colonna per nome con
-- un default: la 1.3.1 in produzione ignora `is_premium`, e un eventuale
-- ritorno indietro le fa leggere `false` invece di romperla. Stesso pattern
-- della 073. `rn` NON è nel RETURNS TABLE: serve solo a ordinare.
--
-- ─── Perché l'ORDER BY sta nella SELECT più esterna ─────────────────────────
-- Il client chiede lim = 3000 (PIN_FETCH_CAP) ma PostgREST tronca a 1000: a
-- decidere quali 1000 sopravvivono è l'ordinamento del livello più esterno, non
-- il LIMIT interno. Ordinare dentro una CTE e non fuori renderebbe questa
-- migration silenziosamente inutile. È l'assunzione portante di tutto il
-- disegno ed è la prima cosa da verificare dopo aver applicato (query in fondo).
--
-- ─── COME È STATA APPLICATA (e perché non con il blocco qui sotto) ─────────
-- ⚠️ Il blocco BEGIN / DROP / CREATE / COMMIT qui sotto **è stato incollato nel
-- SQL editor di Supabase e ha risposto "success" senza installare niente**: la
-- verifica successiva ha mostrato che girava ancora la 073. Il corpo era valido
-- — provato subito dopo creandolo con un altro nome, che è passato al primo
-- colpo. Il sospetto è la transazione esplicita, che l'editor sembra ingoiare.
-- Causa NON accertata: se serve saperlo, va riprodotta guardando l'errore vero.
--
-- La procedura che ha funzionato, ed è anche più sicura (nessun DROP, nessuna
-- finestra in cui la funzione non esiste, ritorno indietro immediato):
--
--   1. creare la funzione con un nome nuovo — stesso corpo, ma
--      `CREATE OR REPLACE FUNCTION get_pins_in_bounds_085(` al posto del
--      `CREATE FUNCTION get_pins_in_bounds(`. Non tocca la produzione;
--   2. misurarla accanto a quella viva sullo stesso rettangolo (v. verifiche);
--   3. scambiarle con due rinomine:
--        ALTER FUNCTION get_pins_in_bounds(double precision, double precision, double precision, double precision, integer, boolean) RENAME TO get_pins_in_bounds_073;
--        ALTER FUNCTION get_pins_in_bounds_085(double precision, double precision, double precision, double precision, integer, boolean) RENAME TO get_pins_in_bounds;
--   4. confermare con la verifica `LIKE '%row_number%'` in fondo.
--
-- La vecchia versione resta parcheggiata come `get_pins_in_bounds_073`: il
-- rollback sono le stesse due rinomine al contrario, non un file da incollare.
-- Nota: la copia VIVA è stata creata senza i commenti (tolti per isolare
-- l'errore), quindi in produzione il corpo è questo ma nudo.

BEGIN;

DROP FUNCTION IF EXISTS get_pins_in_bounds(double precision, double precision, double precision, double precision, integer, boolean);

CREATE FUNCTION get_pins_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  lim integer DEFAULT 1000,
  lodging_mode boolean DEFAULT false
)
RETURNS TABLE(
  id                  uuid,
  latitude            double precision,
  longitude           double precision,
  supported_allergens text[],
  supported_diets     text[],
  cuisine_types       text[],
  offers_lodging      boolean,
  lodging_type        text,
  average_rating      numeric,
  is_premium          boolean
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  -- Le colonne delle CTE si chiamano lat/lng/avg_rating/prem e non come le
  -- colonne di uscita: in una funzione RETURNS TABLE i nomi del RETURNS sono
  -- parametri OUT visibili nel corpo, e tenerli distinti toglie di mezzo ogni
  -- ambiguità invece di affidarla alla qualificazione.
  WITH hits AS (
    SELECT
      r.id                        AS rid,
      ST_Y(r.location::geometry)  AS lat,
      ST_X(r.location::geometry)  AS lng,
      r.supported_allergens       AS allergens,
      r.supported_diets           AS diets,
      r.cuisine_types             AS cuisines,
      r.offers_lodging            AS lodging,
      r.lodging_type              AS lodging_kind,
      COALESCE(ROUND(rev.avg_r, 1), 0) AS avg_rating,
      COALESCE(
        r.is_premium
        AND (r.subscription_expires_at IS NULL OR r.subscription_expires_at > now()),
        false
      ) AS prem
    FROM restaurants r
    LEFT JOIN (
      SELECT restaurant_id, AVG(rating)::numeric AS avg_r
      FROM reviews GROUP BY restaurant_id
    ) rev ON r.id = rev.restaurant_id
    WHERE r.location IS NOT NULL
      AND r.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
      AND (CASE WHEN lodging_mode THEN r.offers_lodging ELSE r.serves_food END)
  ),
  ranked AS (
    SELECT
      h.*,
      row_number() OVER (
        PARTITION BY
          -- GREATEST(…, 1e-9) sul passo: un rettangolo degenere (span 0, che il
          -- client non manda ma un chiamante futuro sì) darebbe divisione per
          -- zero e mappa in errore invece che mappa brutta.
          -- Il cast a int sta FUORI dal clamp, non dentro: con un rettangolo
          -- passato al contrario il quoziente vale ~-1e10, e castarlo prima di
          -- averlo clampato darebbe "integer out of range" — cioè un errore
          -- invece del degrado previsto.
          -- LEAST(30, …) sull'indice: un locale ESATTAMENTE sul bordo massimo
          -- cadrebbe nel quadretto 31, creando una 32ª fascia — 32×32 = 1024
          -- quadretti, cioè più di 1000, e la garanzia del primo giro salterebbe
          -- proprio nei casi limite. GREATEST(0, …) è la stessa difesa a valle,
          -- per un rettangolo passato al contrario: degrada al comportamento di
          -- oggi (un quadretto solo) invece di dare indici negativi.
          LEAST(30, GREATEST(0, floor((h.lat - min_lat) / GREATEST((max_lat - min_lat) / 31.0, 1e-9::double precision))))::int,
          LEAST(30, GREATEST(0, floor((h.lng - min_lng) / GREATEST((max_lng - min_lng) / 31.0, 1e-9::double precision))))::int
        -- Dentro il quadretto: prima il premium, poi l'id. L'id rende la scelta
        -- deterministica — due chiamate identiche danno lo stesso rappresentante,
        -- quindi pannare avanti e indietro non fa ballare i pallini.
        ORDER BY h.prem DESC, h.rid
      ) AS rn
    FROM hits h
  )
  SELECT
    ranked.rid,
    ranked.lat,
    ranked.lng,
    ranked.allergens,
    ranked.diets,
    ranked.cuisines,
    ranked.lodging,
    ranked.lodging_kind,
    ranked.avg_rating,
    ranked.prem
  FROM ranked
  -- LEAST(rn, 2) e non `rn` secco: due gruppi, non un giro di giostra fino in
  -- fondo. Prima TUTTI i primi di quadretto (la copertura, garantita); poi
  -- tutto il resto in ordine di uuid, che è pseudo-casuale e quindi campiona in
  -- proporzione alla densità reale — cioè si comporta come l'ordine fisico di
  -- oggi, che è la cosa giusta una volta che la copertura è già assicurata.
  -- Misurato in simulazione (v. testata): col giro di giostra completo l'Italia
  -- scendeva a ~200 pallini per darne 33 su 33 ai nordici; così ne tiene ~477
  -- dandone comunque 28 su 33. La copertura la compra il primo gruppo, la
  -- densità la conserva il secondo.
  ORDER BY LEAST(ranked.rn, 2), ranked.prem DESC, ranked.rid
  LIMIT lim;
$$;

COMMIT;

-- ─── Verifica 0 — PRIMA di applicare ───────────────────────────────────────
-- Deve restituire UNA riga sola. Se ne restituisse due, in produzione esiste una
-- firma diversa da quella che il DROP qui sopra nomina: il DROP non troverebbe
-- niente (senza errore) e il CREATE aggiungerebbe una SECONDA versione. Con due
-- versioni PostgREST non sa quale chiamare e ogni richiesta fallisce — mappa
-- vuota per tutti, con una causa che non somiglia a "ho cambiato un ORDER BY".
-- Eseguita il 2026-09-05: UNA riga sola (nessuna ambiguità di firma) e corpo
-- della 073 — 9 colonne, nessun is_premium, nessun ORDER BY. Cioè la 084 non era
-- mai stata applicata. Quell'output è salvato in
-- `085_pins_grid_fairness.ROLLBACK.sql`, che è il ritorno indietro di questa
-- migration: NON è un passo da eseguire in sequenza, serve solo se la 085 non
-- convince.
--
-- SELECT p.oid::regprocedure AS firma, pg_get_functiondef(p.oid)
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'get_pins_in_bounds';
--
-- ─── Verifiche da eseguire SUBITO dopo, nel SQL editor ──────────────────────
-- Il LIMIT 1000 esterno simula il troncamento di PostgREST, che nel SQL editor
-- non c'è. Rettangolo = Europa, lo stesso su cui è stato misurato il difetto.
--
-- 1. La distribuzione è cambiata. Sul campo, il 2026-09-05, i nordici erano 9
--    su 33; qui devono essere molte decine e i paesi distinti devono salire.
--    È anche la prova dell'assunzione portante: se l'ordinamento del livello
--    esterno NON governasse il troncamento di PostgREST, questi numeri non si
--    muoverebbero di un'unità e la migration sarebbe inutile in silenzio.
--
-- SELECT count(*) FILTER (WHERE r.country_code IN ('NO','SE','FI','DK','IS')) AS nordici,
--        count(*) FILTER (WHERE r.country_code = 'IT') AS italiani,
--        count(DISTINCT r.country_code) AS paesi,
--        count(*) AS totale
-- FROM (SELECT * FROM get_pins_in_bounds(35, -10, 70, 30, 3000) LIMIT 1000) p
-- JOIN restaurants r ON r.id = p.id;
--
-- 2. A zoom ravvicinato non si perde NIENTE: sotto il tetto tornano tutti,
--    quindi i due conteggi devono coincidere (rettangolo scandinavo stretto).
--
-- SELECT (SELECT count(*) FROM get_pins_in_bounds(57, 4, 71, 31, 3000)) AS dalla_rpc,
--        (SELECT count(*) FROM restaurants r
--         WHERE r.location IS NOT NULL AND r.serves_food
--           AND r.location && ST_MakeEnvelope(4, 57, 31, 71, 4326)::geography) AS nella_tabella;
--
-- 3. Determinismo: due letture identiche devono dare lo stesso insieme, o i
--    pallini ballerebbero pannando avanti e indietro. Deve dare 0.
--
-- SELECT count(*) FROM (
--   SELECT id FROM (SELECT * FROM get_pins_in_bounds(35,-10,70,30,3000) LIMIT 1000) a
--   EXCEPT
--   SELECT id FROM (SELECT * FROM get_pins_in_bounds(35,-10,70,30,3000) LIMIT 1000) b
-- ) d;
--
-- 4. Poi la mappa su un telefono, che è l'unico giudice che conta: la
--    Scandinavia deve popolarsi e l'Italia deve restare la zona più fitta.
