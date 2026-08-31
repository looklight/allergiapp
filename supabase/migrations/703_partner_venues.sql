-- ============================================================
-- 703_partner_venues.sql
-- STATO: DA APPLICARE via SQL editor (tracking locale fermo alla
-- 045: questa, come tutte le 046+, va eseguita a mano — MAI db push).
--
-- VERIFICATA il 2026-08-31 eseguendola per intero sul database vero
-- con ROLLBACK al posto di COMMIT: gira fino in fondo e non lascia
-- niente dietro. Conteggi dentro la transazione: 1 locale, 0 schede
-- (nessun claim da cui nascere), 0 accostamenti, 1 link conservato.
--
-- La "vetrina" si spacca in due: il LOCALE e la SCHEDA AllergiApp.
-- Decisione e disegno in DIGITAL_MENU.md, Tema 16 (che supera il 14).
--
-- ------------------------------------------------------------
-- COS'ERA, E PERCHÉ NON REGGEVA
-- partner_showcases faceva due mestieri insieme:
--   1. teneva l'IDENTITÀ del posto (il nome), e
--   2. rappresentava la PRESENZA dentro AllergiApp (il claim al
--      ristorante, lo stato dell'abbonamento, la sospensione).
-- Finché l'unico prodotto era la scheda premium andava bene. Col
-- menù digitale no: chi vuole solo il QR sul tavolo si trovava a
-- dover creare una "vetrina" — una parola che parla di AllergiApp
-- — per fare una cosa che con AllergiApp non c'entra. Ed è l'attrito
-- che il Tema 10 aveva già denunciato ("il portale è costruito
-- attorno alla vetrina e il claim è il cancello di tutto").
--
-- Si vedeva anche a occhio nudo: nell'anteprima del menù, in cima
-- alla pagina che legge il cliente, compariva il venue_name — che
-- la 700 dichiara essere un appunto privato del partner ("NON è il
-- nome del locale"). Un'etichetta interna sullo schermo di un
-- cliente al tavolo.
--
-- ------------------------------------------------------------
-- COSA DIVENTA
--   partner_venues  il locale: nome, logo, colore. Esiste per
--                   tutti dal primo giorno, senza claim e senza
--                   abbonamento. È il genitore dei menù (704) e
--                   dei link.
--   partner_cards   la scheda AllergiApp: il claim a un ristorante
--                   e lo stato dell'abbonamento. Esiste SOLO dopo
--                   il claim — restaurant_id è NOT NULL, e non è
--                   un dettaglio: sparisce lo stato "bozza non
--                   ancora associata", che c'era solo perché prima
--                   non esisteva nessun altro posto dove mettere
--                   le cose.
--
-- I LINK restano al LOCALE e non passano alla scheda: il telefono
-- per prenotare è lo stesso ovunque compaia. Così domani li può
-- mostrare anche il menù al tavolo, dove un "Prenota" ci sta
-- benissimo, senza farglieli riscrivere.
--
-- ------------------------------------------------------------
-- PERCHÉ ADESSO
-- Verificato il 2026-08-31: fuori dal portale NESSUNO legge le
-- tabelle partner_* — né l'app né l'admin — e dentro c'è solo roba
-- di prova. Contato sul database lo stesso giorno: 1 partner,
-- 1 vetrina (SENZA claim), 2 piatti in catalogo, 2 accostamenti,
-- 1 link. Quindi in concreto questa migration non crea nessuna
-- scheda (nessun claim da cui nascere) e toglie i 2 accostamenti,
-- che puntavano a una vetrina mai associata: i piatti restano nel
-- catalogo, semplicemente non sono accesi da nessuna parte. Questa migration sposta quindi pochissimi dati, ed è
-- scritta per essere corretta anche se ce ne fossero. La finestra
-- si chiude appena l'app comincia a leggerle: da lì in poi la
-- stessa modifica vuole un cambio coordinato di app e portale.
--
-- ------------------------------------------------------------
-- COSA NON C'È QUI
-- Lo SLUG dell'indirizzo pubblico. Serve insieme alle sue regole —
-- quando si congela, la lista degli slug ritirati che non si
-- riciclano mai, le parole riservate — e quelle si decidono con la
-- pagina pubblica (Tema 13). Una colonna aggiunta adesso sarebbe
-- indovinata, e uno slug indovinato finisce stampato su un QR.
-- ============================================================


-- ============================================================
-- TUTTO O NIENTE. Qui si rinomina, si sposta e si cancella: un
-- errore a metà lascerebbe uno schema che non è né il vecchio né
-- il nuovo, con dei dati già spostati.
-- ============================================================
BEGIN;


-- ============================================================
-- 1. LA VETRINA DIVENTA IL LOCALE
-- Un rename e non una tabella nuova: le righe che ci sono già
-- SONO i locali: il nome ce l'hanno, e l'hanno scritto i loro
-- proprietari. Ricrearle da capo vorrebbe dire copiarle e poi
-- riagganciare piatti e link a mano, per ottenere le stesse righe.
-- ============================================================
ALTER TABLE partner_showcases RENAME TO partner_venues;

-- Il nome smette di essere un appunto privato e diventa il nome che
-- legge il cliente in cima al menù. È lo stesso dato, cambia chi lo
-- guarda: da qui in poi il portale deve chiederlo come tale.
ALTER TABLE partner_venues RENAME COLUMN venue_name TO name;

-- L'aspetto del menù pubblico (Tema 8): un logo e un colore fra
-- quelli che scegliamo noi. Stanno sul LOCALE e non sul menù,
-- perché al tavolo carta, pranzo e bevande sono linguette della
-- stessa pagina: un logo per menù darebbe tre intestazioni diverse
-- allo stesso ristorante nella stessa schermata.
ALTER TABLE partner_venues ADD COLUMN logo_url TEXT;
ALTER TABLE partner_venues ADD COLUMN accent TEXT NOT NULL DEFAULT 'charcoal';
  -- codice, non esadecimale: i colori sono un elenco chiuso deciso
  -- da noi (tutti scuri abbastanza da reggere il testo). Tenere qui
  -- il valore vorrebbe dire non poterli più ritoccare tutti insieme.

-- I nomi degli indici e dei vincoli sopravvivono al rename della
-- tabella, ma restano quelli vecchi: un indice che si chiama
-- "showcases" su una tabella che si chiama "venues" è una bugia
-- che il prossimo che legge lo schema si beve.
ALTER INDEX partner_showcases_owner_idx RENAME TO partner_venues_owner_idx;
ALTER TABLE partner_venues RENAME CONSTRAINT partner_showcases_id_owner_key
  TO partner_venues_id_owner_key;
ALTER TABLE partner_venues RENAME CONSTRAINT partner_showcases_pkey
  TO partner_venues_pkey;
ALTER TABLE partner_venues RENAME CONSTRAINT partner_showcases_owner_user_id_fkey
  TO partner_venues_owner_user_id_fkey;


-- ============================================================
-- 2. LA SCHEDA ALLERGIAPP ESCE DAL LOCALE
-- Quello che riguarda la presenza dentro l'app — il claim e lo
-- stato dell'abbonamento — si stacca e diventa una cosa sua,
-- accendibile e spegnibile senza toccare il locale.
-- ============================================================
CREATE TABLE partner_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    -- NOT NULL, ed è la differenza col vecchio modello: una scheda
    -- senza un ristorante a cui appartenere non vuol dire niente.
    -- Prima era nullable perché la vetrina doveva esistere anche
    -- prima del claim, per avere un posto dove tenere le cose.
    -- Adesso quel posto è il locale.
    -- CASCADE e non SET NULL: sparito il ristorante dalla community,
    -- sparisce la scheda — ma il locale, i piatti e i menù restano.
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',                -- compilata, non ancora pubblicata
      'published',            -- abbonamento attivo, visibile in app
      'expired',              -- abbonamento scaduto (win-back)
      'paused_by_partner',    -- pausa volontaria (anche sicurezza: menù cambiato)
      'suspended_by_admin',   -- sospensione motivata e replicabile (DSA art. 17)
      'claim_revoked'         -- associazione sciolta (gestore sbagliato/frode)
    )),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspension_note TEXT,       -- motivazione admin comunicata al partner (DSA art. 17)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (venue_id, owner_user_id)
    REFERENCES partner_venues (id, owner_user_id) ON DELETE CASCADE
);

-- Un solo gestore per locale ⇒ una sola scheda per ristorante.
-- Non più parziale: qui restaurant_id non è mai NULL.
CREATE UNIQUE INDEX partner_cards_one_per_restaurant
  ON partner_cards (restaurant_id);
CREATE INDEX partner_cards_venue_idx ON partner_cards (venue_id);
CREATE INDEX partner_cards_owner_idx ON partner_cards (owner_user_id);

-- Coppia referenziabile per i piatti accesi, come nella 700.
ALTER TABLE partner_cards ADD CONSTRAINT partner_cards_id_owner_key
  UNIQUE (id, owner_user_id);

-- Le vetrine già associate a un ristorante diventano schede, con lo
-- stato che avevano. Quelle senza claim non producono nessuna riga:
-- erano bozze private, e adesso quello che contenevano vive nel
-- locale, che è rimasto lo stesso identico record.
INSERT INTO partner_cards (venue_id, owner_user_id, restaurant_id, status, status_changed_at, suspension_note, created_at)
SELECT id, owner_user_id, restaurant_id, status, status_changed_at, suspension_note, created_at
FROM partner_venues
WHERE restaurant_id IS NOT NULL;


-- ============================================================
-- 3. I PIATTI ACCESI SEGUONO LA SCHEDA
-- "Quali piatti compaiono" è una domanda sulla scheda in app, non
-- sul locale: sul menù al tavolo i piatti li sceglie il menù.
-- Ed è la tabella che rende possibile la "massima flessibilità"
-- chiesta il 31/08 — nessuna riga qui = scheda con i soli link.
-- ============================================================
ALTER TABLE partner_showcase_dishes RENAME TO partner_card_dishes;
ALTER TABLE partner_card_dishes RENAME COLUMN showcase_id TO card_id;

-- Il vecchio vincolo puntava alla vetrina: adesso il bersaglio è la
-- scheda, e va rifatto (rinominare la colonna non cambia dove punta).
ALTER TABLE partner_card_dishes
  DROP CONSTRAINT partner_showcase_dishes_showcase_id_owner_user_id_fkey;

-- Le righe che puntavano a una vetrina senza claim non hanno una
-- scheda a cui agganciarsi: quei piatti restano nel catalogo, che è
-- dove vivono davvero, e semplicemente non sono accesi da nessuna
-- parte. Vanno tolte PRIMA di rimettere il vincolo, o lo violano.
DELETE FROM partner_card_dishes sd
WHERE NOT EXISTS (SELECT 1 FROM partner_cards c WHERE c.venue_id = sd.card_id);

-- …e quelle che ne avevano una vanno fatte puntare al suo id, che è
-- nuovo: prima la colonna conteneva l'id della vetrina.
UPDATE partner_card_dishes sd
SET card_id = c.id
FROM partner_cards c
WHERE c.venue_id = sd.card_id;

ALTER TABLE partner_card_dishes
  ADD CONSTRAINT partner_card_dishes_card_id_owner_user_id_fkey
  FOREIGN KEY (card_id, owner_user_id)
    REFERENCES partner_cards (id, owner_user_id) ON DELETE CASCADE;

ALTER INDEX partner_showcase_dishes_dish_idx RENAME TO partner_card_dishes_dish_idx;
ALTER TABLE partner_card_dishes RENAME CONSTRAINT partner_showcase_dishes_pkey
  TO partner_card_dishes_pkey;
ALTER TABLE partner_card_dishes RENAME CONSTRAINT partner_showcase_dishes_dish_id_owner_user_id_fkey
  TO partner_card_dishes_dish_id_owner_user_id_fkey;


-- ============================================================
-- 4. I LINK RESTANO AL LOCALE
-- Sono fatti del posto, non di un canale: il numero per prenotare
-- è lo stesso sulla scheda in app e sul menù al tavolo. Qui cambia
-- solo il nome della colonna — la tabella a cui punta è la stessa
-- riga di prima, che ora si chiama locale.
-- ============================================================
ALTER TABLE partner_links RENAME COLUMN showcase_id TO venue_id;
ALTER INDEX partner_links_showcase_idx RENAME TO partner_links_venue_idx;
ALTER TABLE partner_links RENAME CONSTRAINT partner_links_showcase_id_fkey
  TO partner_links_venue_id_fkey;


-- ============================================================
-- 5. AUDIT
-- La colonna diceva "vetrina": ora quelle righe parlano di locali.
-- Si aggiunge il riferimento alla scheda, che è l'oggetto su cui
-- cadono le azioni interessanti (pubblicazione, sospensione).
-- ============================================================
ALTER TABLE partner_audit_log RENAME COLUMN showcase_id TO venue_id;
ALTER TABLE partner_audit_log ADD COLUMN card_id UUID REFERENCES partner_cards(id) ON DELETE SET NULL;


-- ============================================================
-- 6. TRIGGER E RLS
-- Il trigger updated_at ha seguito il rename; alla tabella nuova
-- va messo. Le policy del locale sono sopravvissute al rename ma
-- portano il nome vecchio, e una di loro non ha più senso: il
-- locale non ha più uno stato "published" da mostrare in giro.
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER POLICY partner_showcases_owner ON partner_venues RENAME TO partner_venues_owner;
ALTER POLICY partner_showcases_admin ON partner_venues RENAME TO partner_venues_admin;

-- Il locale non è più la cosa pubblicata: lo è la scheda. Ma il
-- nome e il logo del locale li deve poter leggere chi guarda una
-- scheda pubblicata, quindi la lettura pubblica non sparisce —
-- cambia condizione, e passa dalla scheda.
DROP POLICY partner_showcases_public_read ON partner_venues;
CREATE POLICY partner_venues_public_read ON partner_venues
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_cards c
    WHERE c.venue_id = partner_venues.id AND c.status = 'published'));

ALTER TABLE partner_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY partner_cards_owner ON partner_cards
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY partner_cards_public_read ON partner_cards
  FOR SELECT USING (status = 'published');
CREATE POLICY partner_cards_admin ON partner_cards
  FOR ALL USING (is_admin());

-- Le policy delle tabelle rinominate al punto 3 e 4 guardavano la
-- vetrina per decidere cosa è pubblico. Ora quella condizione sta
-- sulla scheda, quindi vanno riscritte: senza, "pubblico" resterebbe
-- agganciato a una colonna che al punto 5 non esiste più.
ALTER POLICY partner_showcase_dishes_owner ON partner_card_dishes RENAME TO partner_card_dishes_owner;
ALTER POLICY partner_showcase_dishes_admin ON partner_card_dishes RENAME TO partner_card_dishes_admin;
DROP POLICY partner_showcase_dishes_public_read ON partner_card_dishes;
CREATE POLICY partner_card_dishes_public_read ON partner_card_dishes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_cards c
    WHERE c.id = card_id AND c.status = 'published'));

DROP POLICY partner_links_owner ON partner_links;
CREATE POLICY partner_links_owner ON partner_links
  FOR ALL USING (EXISTS (
    SELECT 1 FROM partner_venues v
    WHERE v.id = venue_id AND v.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM partner_venues v
    WHERE v.id = venue_id AND v.owner_user_id = auth.uid()));
DROP POLICY partner_links_public_read ON partner_links;
CREATE POLICY partner_links_public_read ON partner_links
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_cards c
    WHERE c.venue_id = partner_links.venue_id AND c.status = 'published'));

-- I piatti del catalogo sono pubblici solo se accesi in una scheda
-- pubblicata: stessa regola di prima, altro nome delle tabelle.
DROP POLICY partner_dishes_public_read ON partner_dishes;
CREATE POLICY partner_dishes_public_read ON partner_dishes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_card_dishes cd
    JOIN partner_cards c ON c.id = cd.card_id
    WHERE cd.dish_id = partner_dishes.id AND c.status = 'published'));

DROP POLICY partner_dish_translations_public_read ON partner_dish_translations;
CREATE POLICY partner_dish_translations_public_read ON partner_dish_translations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_card_dishes cd
    JOIN partner_cards c ON c.id = cd.card_id
    WHERE cd.dish_id = partner_dish_translations.dish_id AND c.status = 'published'));


-- ============================================================
-- 7. SOLO ADESSO IL LOCALE SI LIBERA DI QUELLO CHE STA SULLA SCHEDA
--
-- ⚠️ QUEST'ORDINE NON È ESTETICO, È OBBLIGATORIO — e ci ho sbagliato
-- una volta, con la 703 che si fermava qui:
--   ERROR: cannot drop column status of table partner_venues
--   because other objects depend on it
-- Cinque policy (su locale, piatti, accostamenti, traduzioni e link)
-- leggevano `status` per decidere cos'è pubblico. PostgreSQL non
-- lascia togliere una colonna sotto i piedi di chi la usa, e ha
-- ragione: con CASCADE — che è quello che suggerisce il messaggio —
-- sarebbero sparite cinque policy di lettura pubblica senza che
-- nessuno se ne accorgesse, cioè un buco di sicurezza al posto di un
-- errore. Quindi prima si riscrivono (punto 6), poi si cancella.
--
-- Vale anche per i dati: le colonne sono state copiate al punto 2 e
-- rilette al punto 3.
-- ============================================================
ALTER TABLE partner_venues DROP CONSTRAINT partner_showcases_restaurant_id_fkey;
DROP INDEX partner_showcases_one_per_restaurant;
ALTER TABLE partner_venues
  DROP COLUMN restaurant_id,
  DROP COLUMN status,
  DROP COLUMN status_changed_at,
  DROP COLUMN suspension_note;


COMMIT;


-- ============================================================
-- DOPO L'APPLICAZIONE
-- Il portale va aggiornato nello stesso giro: showcases.ts parla
-- ancora di partner_showcases, e le pagine dicono "vetrina".
-- Nessun'altra parte del progetto tocca queste tabelle (verificato
-- il 2026-08-31), quindi il coordinamento finisce qui.
-- ============================================================
