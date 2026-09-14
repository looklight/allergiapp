-- ============================================================
-- 715_card_dishes_on_venue.sql
-- STATO: APPLICATA il 2026-09-15 (verificata: colonne, chiavi,
-- le tre policy public_read; 0 righe spostate).
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- I PIATTI SCELTI PER LA SCHEDA SI APPENDONO AL LOCALE, non più
-- alla scheda.
--
-- ⚠️ È UNA MARCIA INDIETRO DICHIARATA rispetto alla 703, che aveva
-- tolto di proposito lo stato "bozza non ancora associata": la
-- scheda (partner_cards) nasce solo col claim, e i piatti accesi
-- pendevano da lei — quindi prima del claim non c'era dove
-- salvarli, e la sezione piatti del portale era un tappo. Decisione
-- dell'utente (2026-09-15): il partner deve poter preparare la
-- scheda PRIMA dell'associazione, tenerla salvata, e pubblicarla
-- solo con l'abbonamento.
--
-- Quello che la 703 voleva evitare resta evitato: una scheda senza
-- ristorante continua a non esistere (restaurant_id NOT NULL). Cambia
-- solo DOVE sta il contenuto: sul locale, come i LINK dalla 703 in
-- poi. La scheda torna a essere solo il claim e lo stato
-- dell'abbonamento, cioè SE quel contenuto compare nell'app — non
-- COSA contiene.
--
-- Il nome della tabella resta partner_card_dishes: dice ancora
-- esattamente cosa c'è dentro, i piatti che il partner sceglie per
-- la scheda in app. Sul menù al tavolo i piatti li sceglie il menù.
--
-- DATI SPOSTATI: al 15/09 fuori dal portale nessuno legge queste
-- tabelle (né app né admin, verificato sul codice), e senza claim
-- non esiste nessuna scheda — quindi non ci sono righe da spostare.
-- La migration è scritta per essere corretta anche se ce ne fossero.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. LA COLONNA NUOVA, riempita dalla scheda di ogni riga
-- ------------------------------------------------------------
ALTER TABLE partner_card_dishes ADD COLUMN venue_id UUID;

UPDATE partner_card_dishes cd
SET venue_id = c.venue_id
FROM partner_cards c
WHERE c.id = cd.card_id;

-- Un locale con più schede (lo schema non lo vieta: l'unicità è per
-- ristorante, non per locale) darebbe lo stesso piatto due volte, e
-- la chiave primaria nuova lo rifiuterebbe: se ne tiene uno.
DELETE FROM partner_card_dishes a
USING partner_card_dishes b
WHERE a.venue_id = b.venue_id
  AND a.dish_id = b.dish_id
  AND a.ctid > b.ctid;


-- ------------------------------------------------------------
-- 2. VIA LE POLICY CHE LEGGONO card_id
-- ⚠️ PRIMA di togliere la colonna, non dopo (v. la lezione della
-- 703, punto 7): PostgreSQL non la lascia togliere sotto i piedi di
-- chi la usa, e con CASCADE sparirebbero in silenzio.
-- Si ricreano identiche al punto 4, passando dal locale.
-- ------------------------------------------------------------
DROP POLICY partner_card_dishes_public_read ON partner_card_dishes;
DROP POLICY partner_dishes_public_read ON partner_dishes;
DROP POLICY partner_dish_translations_public_read ON partner_dish_translations;


-- ------------------------------------------------------------
-- 3. LE CHIAVI: dalla scheda al locale
-- La chiave composta con owner_user_id resta: è lei che rende
-- impossibile accendere il piatto di un partner nel locale di un
-- altro, per vincolo e non per policy (v. 700).
-- ------------------------------------------------------------
ALTER TABLE partner_card_dishes DROP CONSTRAINT partner_card_dishes_pkey;
ALTER TABLE partner_card_dishes DROP CONSTRAINT partner_card_dishes_card_id_owner_user_id_fkey;
ALTER TABLE partner_card_dishes DROP COLUMN card_id;

ALTER TABLE partner_card_dishes ALTER COLUMN venue_id SET NOT NULL;
ALTER TABLE partner_card_dishes ADD CONSTRAINT partner_card_dishes_pkey
  PRIMARY KEY (venue_id, dish_id);
ALTER TABLE partner_card_dishes
  ADD CONSTRAINT partner_card_dishes_venue_id_owner_user_id_fkey
  FOREIGN KEY (venue_id, owner_user_id)
    REFERENCES partner_venues (id, owner_user_id) ON DELETE CASCADE;

COMMENT ON TABLE partner_card_dishes IS
  'I piatti del catalogo scelti per la scheda AllergiApp di un locale. Stanno sul locale e non sulla scheda (715): si preparano anche prima del claim, e compaiono in app solo se il locale ha una scheda pubblicata.';


-- ------------------------------------------------------------
-- 4. LE POLICY DI LETTURA PUBBLICA, stessa regola di prima
-- Pubblico è solo quello che sta su una scheda PUBBLICATA: una
-- scelta fatta prima del claim, o con l'abbonamento scaduto, resta
-- lavoro privato. Cambia solo il giro: dal locale alla sua scheda.
-- La policy del proprietario e quella admin non leggono card_id e
-- restano come sono.
-- ------------------------------------------------------------
CREATE POLICY partner_card_dishes_public_read ON partner_card_dishes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_cards c
    WHERE c.venue_id = partner_card_dishes.venue_id AND c.status = 'published'));

CREATE POLICY partner_dishes_public_read ON partner_dishes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_card_dishes cd
    JOIN partner_cards c ON c.venue_id = cd.venue_id
    WHERE cd.dish_id = partner_dishes.id AND c.status = 'published'));

CREATE POLICY partner_dish_translations_public_read ON partner_dish_translations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_card_dishes cd
    JOIN partner_cards c ON c.venue_id = cd.venue_id
    WHERE cd.dish_id = partner_dish_translations.dish_id AND c.status = 'published'));

COMMIT;


-- ============================================================
-- VERIFICA (da lanciare dopo, a mano)
--
-- Colonne: deve esserci venue_id e non più card_id
--   select column_name, is_nullable from information_schema.columns
--    where table_name = 'partner_card_dishes' order by ordinal_position;
--
-- Chiavi: pkey su (venue_id, dish_id) e la fkey verso partner_venues
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'partner_card_dishes'::regclass;
--
-- Policy: le tre public_read ci sono di nuovo, e parlano di venue_id
--   select tablename, policyname, qual from pg_policies
--    where policyname in ('partner_card_dishes_public_read',
--      'partner_dishes_public_read', 'partner_dish_translations_public_read');
-- ============================================================
