-- Migration 067: Faccette lodging su `restaurants` (hotel / B&B / strutture)
--
-- Contesto: una struttura ricettiva NON e' una tabella a parte. Un "luogo" puo'
-- essere ristorante, struttura, o entrambi (hotel con ristorante aperto al
-- pubblico). Modello a FACCETTE sulla stessa `restaurants`, niente sdoppiamento:
-- tutto l'ecosistema (reviews/favorites/reports/claims/foto) resta condiviso.
--
-- Scelte di design:
-- - `serves_food` DEFAULT true: i ristoranti esistenti (453) diventano tutti
--   true senza backfill. Questo rende NO-OP il futuro `WHERE serves_food` nelle
--   RPC (stesso identico risultato di "nessun filtro" finche' non esistono righe
--   solo-struttura) -> la migration RPC e' spedibile in anticipo, a rischio zero.
-- - `offers_lodging` DEFAULT false: il default dell'app resta 100% ristoranti.
-- - `lodging_type` TEXT free-text (NULL = non e' una struttura), seminato da
--   Google Places all'inserimento. NIENTE enum/whitelist a DB: identica scelta di
--   `cuisine_types` (validato lato client via constants), cosi' aggiungere un
--   nuovo tipo struttura non richiede una migration.
-- - Chi governa a runtime sono QUESTE colonne, non Google: Google le semina una
--   volta sola all'inserimento. `serves_food` per gli hotel non lo decide Google
--   (non sa "aperto al pubblico") ma il toggle umano in fase di inserimento.
-- - Indice PARZIALE su offers_lodging: gli hotel sono la minoranza, l'indice e'
--   selettivo. `serves_food` NON va indicizzato (quasi-sempre-true, selettivita'
--   nulla; l'indice spaziale GiST su location fa gia' il lavoro pesante e
--   serves_food e' solo un filtro a valle a costo zero).
-- - RLS invariata: le colonne ereditano le policy esistenti di `restaurants`.
--   Un utente le imposta in INSERT (added_by = auth.uid()); modificarle dopo
--   resta riservato a owner/admin dalle policy UPDATE gia' in essere (e' il
--   motivo per cui la correzione di un attributo errato passa da report->admin).

ALTER TABLE restaurants
  ADD COLUMN serves_food    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN offers_lodging BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN lodging_type   TEXT;

-- Integrita': un luogo deve essere almeno una delle due cose.
ALTER TABLE restaurants
  ADD CONSTRAINT restaurants_facet_not_empty
  CHECK (serves_food OR offers_lodging);

-- Integrita': il tipo struttura ha senso solo se e' una struttura.
ALTER TABLE restaurants
  ADD CONSTRAINT restaurants_lodging_type_requires_lodging
  CHECK (lodging_type IS NULL OR offers_lodging);

-- Indice spaziale PARZIALE per la query "solo alloggi" del filtro hotel
-- (lodging_mode): la query e' `offers_lodging AND ST_DWithin/&&(location)`, quindi
-- l'indice utile e' un GiST su location ristretto alle sole righe lodging — cosi'
-- la ricerca spaziale tocca solo la minoranza-alloggi, non tutta la tabella.
-- (Un indice su (id) non servirebbe: id non e' filtro/join key in quelle query.)
CREATE INDEX IF NOT EXISTS idx_restaurants_offers_lodging
  ON restaurants USING GIST (location) WHERE offers_lodging;
