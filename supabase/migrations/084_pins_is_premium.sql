-- STATO: DA APPLICARE (scritta il 2026-09-05).
-- 084: is_premium nel payload di get_pins_in_bounds + ORDER BY che protegge i
-- premium dal taglio a 1000 righe.
--
-- Perché adesso, con zero premium attivi (MAP_SCALING.md §0-ter):
--   • Il diradamento client (passo A) sceglie un rappresentante per areola, e a
--     parità di copertura deve vincere il premium. Il client sa già farlo, ma
--     senza questa colonna nel payload non ha il dato su cui decidere.
--   • Con le OTA bloccate la metà client viaggia solo con le build, che sono
--     rare: se l'aggancio non parte con questa build, la visibilità premium
--     arriverebbe mesi dopo il primo contratto firmato. Questa migration invece
--     è spedibile in qualunque momento, senza build.
--   • Oggi non cambia niente per nessuno: `is_premium` è false su tutte le
--     righe. Al primo contratto basta un UPDATE su una riga.
--
-- ORDER BY r.is_premium DESC: senza, un premium può essere tagliato dal LIMIT
-- come chiunque altro a zoom largo. È un ordinamento GLOBALE e indipendente
-- dall'utente, quindi non rompe l'invariante "pinCache filter-independent"
-- (MAP_SCALING.md §6). NON estenderlo ad altri criteri (popolarità, voto,
-- data): valutati e scartati — l'unica equità giusta per il taglio è
-- geografica, cioè le celle del punto 4. Il resto del taglio resta casuale,
-- e i suoi pregi (distribuzione proporzionale, merge della pinCache tra fetch)
-- restano intatti.
--
-- VINCOLO DI PRODOTTO, non negoziabile: il premium compra visibilità (ordine,
-- prominenza, soglia di rivelazione), MAI il colore o la semantica di
-- compatibilità. Verde/ambra sono un'informazione di sicurezza e non sono in
-- vendita. Per questo lato client il premium è solo il criterio SECONDARIO,
-- dopo la copertura: non può mai far diventare grigia un'areola dove c'è un
-- verde.
--
-- Nota legale collegata: il primo premium attiva P2B → la priorità di
-- visibilità va dichiarata nei termini.
--
-- Colonna additiva: i client vecchi leggono le colonne per nome e la ignorano
-- (stesso pattern della 073).
--
-- Da applicare A MANO via SQL editor (tracking migrations fermo, MAI db push).

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
  SELECT
    r.id,
    ST_Y(r.location::geometry)  AS latitude,
    ST_X(r.location::geometry)  AS longitude,
    r.supported_allergens,
    r.supported_diets,
    r.cuisine_types,
    r.offers_lodging,
    r.lodging_type,
    COALESCE(ROUND(rev.avg_r, 1), 0) AS average_rating,
    -- NON `r.is_premium` nudo: quella colonna è l'INTENTO, non la verità. Niente
    -- la fa tornare falsa quando l'abbonamento scade, quindi da sola darebbe
    -- visibilità a vita a chi ha smesso di pagare — sbagliato di suo e in
    -- contrasto col P2B, dove la priorità si vende per il periodo pagato.
    -- Scadenza NULL = premium senza scadenza (attivazione manuale): resta valido.
    -- APERTO: se gli abbonamenti avranno una macchina a stati vera, qui va
    -- aggiunto anche `r.subscription_status`. Non l'ho messo perché indovinare
    -- significherebbe accendere o spegnere la visibilità a chi paga.
    COALESCE(
      r.is_premium
      AND (r.subscription_expires_at IS NULL OR r.subscription_expires_at > now()),
      false
    ) AS is_premium
  FROM restaurants r
  LEFT JOIN (
    SELECT restaurant_id, AVG(rating)::numeric AS avg_r
    FROM reviews GROUP BY restaurant_id
  ) rev ON r.id = rev.restaurant_id
  WHERE r.location IS NOT NULL
    AND r.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    AND (CASE WHEN lodging_mode THEN r.offers_lodging ELSE r.serves_food END)
  ORDER BY (r.is_premium
            AND (r.subscription_expires_at IS NULL OR r.subscription_expires_at > now())) DESC
  LIMIT lim;
$$;
