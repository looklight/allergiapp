-- ============================================================
-- 704_partner_menus.sql
-- STATO: DA APPLICARE via SQL editor, DOPO la 703 (il tracking locale è fermo
-- alla 045: questa, come tutte le 046+, va eseguita a mano —
-- MAI db push).
--
-- VERIFICATA il 2026-08-31 eseguendola in fila alla 703 sul database
-- vero, con ROLLBACK al posto di COMMIT: girano entrambe fino in fondo
-- e non lasciano niente dietro.
--
-- Il menù digitale: la composizione che il ristoratore fa dei
-- piatti che ha già in catalogo. Direzione e decisioni in
-- DIGITAL_MENU.md; qui sotto si citano i Temi per numero.
--
-- ------------------------------------------------------------
-- CATALOGO E MENÙ SONO DUE COSE DIVERSE (Tema 3)
-- Il catalogo (partner_dishes) tiene i FATTI del piatto: nome,
-- allergeni, foto, traduzioni. Il menù è una COMPOSIZIONE:
-- quali piatti, in che sezioni, in che ordine, a che prezzo.
-- Un ristoratore ha più menù — carta, pranzo, bevande — e lo
-- stesso piatto compare in più d'uno senza duplicarsi.
--
-- È il motivo per cui IL PREZZO STA QUI e non su partner_dishes:
-- la stessa parmigiana costa dieci a pranzo e quattordici a
-- cena. La 700 lasciò apposta il piatto senza colonna prezzo.
--
-- ------------------------------------------------------------
-- IL MENÙ PENDE DAL LOCALE (Tema 16, che supera il Tema 14)
-- E non dalla scheda AllergiApp: chi usa solo il menù al tavolo
-- non farà mai il claim e di AllergiApp non gli importa niente.
-- Il locale (partner_venues, creato dalla 703) esiste per tutti
-- dal primo giorno, quindi anche il gratuito ha dove appendere
-- il suo menù — e domani il suo indirizzo pubblico.
--
-- PREREQUISITO: la 703 va applicata PRIMA di questa.
--
-- ------------------------------------------------------------
-- SEZIONI ≠ CATEGORIE (Tema 4), E SONO DEL MENÙ
-- Le otto categorie di partner_dishes (starters, first_courses…)
-- restano un set fisso uguale per tutti: sono il dato che rende
-- confrontabili i ristoranti dentro AllergiApp. Le SEZIONI sono
-- testo libero del ristoratore — "Le nostre paste fresche",
-- "Dalla brace" — e sono presentazione. Un piatto può essere
-- first_courses per l'app e stare sotto "Dalla brace" sulla
-- carta: è la differenza fra una classificazione e un indice.
--
-- Deciso il 2026-08-31: le sezioni APPARTENGONO AL MENÙ, non al
-- partner. Sezioni riusabili fra menù diversi pagherebbero solo
-- per chi ha più menù con la stessa struttura, e costerebbero
-- subito tre domande senza risposta ovvia (il nome è del menù o
-- globale? l'ordine di chi è? cancellarne una tocca menù che il
-- ristoratore non sta guardando?). Il caso vero — "il pranzo ha
-- la stessa struttura della carta" — si copre con un "duplica
-- menù" nel portale. Promuoverle a riusabili domani si può;
-- tornare indietro no.
--
-- ------------------------------------------------------------
-- UN PIATTO, UN PREZZO (deciso 2026-08-31)
-- Niente varianti (porzione piccola / grande): dentro un menù un
-- piatto compare una volta sola, ed è il vincolo UNIQUE più in
-- basso a dirlo.
--
-- La riga ha però un id suo invece della chiave composta
-- (menu_id, dish_id), e non è una complicazione gratuita: se un
-- domani le varianti servono davvero, si toglie un vincolo e si
-- aggiunge un'etichetta facoltativa — due righe dello stesso
-- piatto, "Piccola" e "Grande". Con la chiave composta bisognerebbe
-- invece rifare le chiavi e tutto il client che ci si appoggia.
-- Costa zero oggi, e toglie l'unica conseguenza spiacevole della
-- scelta semplice.
--
-- ------------------------------------------------------------
-- COSA NON C'È QUI, E NON È UNA DIMENTICANZA
-- Manca tutto ciò che riguarda la PUBBLICAZIONE: nessuno status
-- draft/published, nessun slug, nessun timestamp di
-- rigenerazione. La pagina pubblica (Temi 6, 11, 13) è la fase
-- successiva, e quei tre campi vanno pensati insieme quando si
-- sa come viene generata — in particolare la conferma "pagina
-- aggiornata alle 14:32", senza la quale la promessa dei dieci
-- secondi del Tema 7 si rompe in silenzio. Aggiungerli adesso
-- significherebbe indovinarli.
--
-- Per lo stesso motivo QUI NON C'È NESSUNA POLICY DI LETTURA
-- PUBBLICA, a differenza di tutte le altre tabelle partner: il
-- cliente al tavolo non interroga il database (Tema 12), legge
-- una pagina generata al salvataggio che si porta dentro solo i
-- campi che deve vedere. Se un domani qualcuno aggiunge un
-- "public read" qui, sta cambiando quella decisione: lo faccia
-- sapendolo.
-- ============================================================


-- ============================================================
-- TUTTO O NIENTE: anche il DDL è transazionale, e le chiavi
-- composte pretendono che le tabelle sopra esistano già.
-- ============================================================
BEGIN;


-- ============================================================
-- TABELLA: partner_menus
-- Un menù del locale: "Carta", "Pranzo", "Bevande".
--
-- owner_user_id è ridondante rispetto al locale, e ci sta di
-- proposito: è la colonna che permette la chiave composta con
-- cui il database — non una policy che si può dimenticare di
-- scrivere — rende IMPOSSIBILE appendere un menù al locale
-- di un altro. Stesso schema della 700.
-- ============================================================
CREATE TABLE partner_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  name TEXT NOT NULL,
    -- testo libero: è il nome che il cliente legge sulla linguetta
    -- ("Carta", "Pranzo"), non un codice da tradurre lato client
  currency TEXT NOT NULL DEFAULT 'EUR'
    CHECK (currency ~ '^[A-Z]{3}$'),
    -- ISO 4217. Sta sul MENÙ e non sulla singola riga: un menù con
    -- due valute dentro non esiste, e chiederla per piatto sarebbe
    -- quaranta volte la stessa risposta.
  sort_order INTEGER NOT NULL DEFAULT 0,
    -- ordine delle linguette nella pagina pubblica
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (venue_id, owner_user_id)
    REFERENCES partner_venues (id, owner_user_id) ON DELETE CASCADE
);

CREATE INDEX partner_menus_venue_idx ON partner_menus (venue_id);

-- Coppia referenziabile per le chiavi composte più in basso.
ALTER TABLE partner_menus ADD CONSTRAINT partner_menus_id_owner_key
  UNIQUE (id, owner_user_id);


-- ============================================================
-- TABELLA: partner_menu_sections
-- Gli intertitoli della carta, testo libero (v. Tema 4).
-- ============================================================
CREATE TABLE partner_menu_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (menu_id, owner_user_id)
    REFERENCES partner_menus (id, owner_user_id) ON DELETE CASCADE
);

CREATE INDEX partner_menu_sections_menu_idx ON partner_menu_sections (menu_id);

-- Coppia referenziabile per la riga del menù. È (id, menu_id) e non
-- (id, owner_user_id) di proposito: così il vincolo che ne nasce dice
-- una cosa più forte, cioè che la sezione di una riga è una sezione
-- DI QUEL MENÙ — e non una qualsiasi delle sezioni del ristoratore,
-- prese magari dal menù di pranzo mentre si compila la carta.
ALTER TABLE partner_menu_sections ADD CONSTRAINT partner_menu_sections_id_menu_key
  UNIQUE (id, menu_id);


-- ============================================================
-- TABELLA: partner_menu_items
-- L'accostamento piatto ↔ menù: dove il piatto del catalogo
-- diventa una riga della carta, con il suo prezzo.
-- ============================================================
CREATE TABLE partner_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL,
  section_id UUID,
    -- NULL = riga fuori sezione, in cima al menù. Come la categoria
    -- facoltativa dei piatti nella 700: un ristoratore che butta
    -- dentro dieci piatti prima di pensare agli intertitoli non deve
    -- essere fermato da un campo obbligatorio.
  dish_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  price_cents INTEGER
    CHECK (price_cents IS NULL OR price_cents >= 0),
    -- INTERI, mai virgola mobile: sui soldi 0.1 + 0.2 non fa 0.3, e
    -- un prezzo sbagliato sul menù è una discussione al tavolo (Tema 7).
    -- NULL = senza prezzo, ed è un caso vero: dentro un degustazione i
    -- piatti non hanno prezzo, ce l'ha il menù.
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un piatto, un prezzo: dentro un menù la parmigiana compare una
  -- volta sola. È il vincolo che si toglie il giorno che servono le
  -- varianti, e l'unico che va toccato.
  UNIQUE (menu_id, dish_id),

  FOREIGN KEY (menu_id, owner_user_id)
    REFERENCES partner_menus (id, owner_user_id) ON DELETE CASCADE,
  FOREIGN KEY (dish_id, owner_user_id)
    REFERENCES partner_dishes (id, owner_user_id) ON DELETE CASCADE,
  -- Eliminare una sezione NON porta via i piatti che conteneva: le
  -- righe risalgono in cima, fuori sezione, col loro prezzo. Perdere
  -- sei prezzi per aver rinominato male un intertitolo sarebbe un
  -- castigo sproporzionato, e silenzioso.
  -- La forma "SET NULL (section_id)" (PostgreSQL 15+, qui gira la 17)
  -- azzera SOLO quella colonna: senza l'elenco, il database proverebbe
  -- ad azzerare anche menu_id, che è NOT NULL, e la cancellazione di
  -- una sezione fallirebbe sempre.
  FOREIGN KEY (section_id, menu_id)
    REFERENCES partner_menu_sections (id, menu_id) ON DELETE SET NULL (section_id)
);

CREATE INDEX partner_menu_items_menu_idx ON partner_menu_items (menu_id);
CREATE INDEX partner_menu_items_section_idx ON partner_menu_items (section_id);
-- Serve a "in quanti menù sta questo piatto" nel gestionale del
-- catalogo, e alla cascata quando un piatto viene eliminato.
CREATE INDEX partner_menu_items_dish_idx ON partner_menu_items (dish_id);


-- ============================================================
-- TRIGGER updated_at (riusa update_updated_at() della 001)
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_menus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_menu_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- RLS
-- Solo il proprietario e l'admin. Nessuna lettura pubblica: v. la
-- nota "cosa non c'è qui" in testa al file.
-- Il ruolo partner resta DERIVATO dalle righe (owner_user_id), mai
-- dal campo profiles.role.
-- ============================================================
ALTER TABLE partner_menus          ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_menu_sections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_menu_items     ENABLE ROW LEVEL SECURITY;

CREATE POLICY partner_menus_owner ON partner_menus
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY partner_menus_admin ON partner_menus
  FOR ALL USING (is_admin());

CREATE POLICY partner_menu_sections_owner ON partner_menu_sections
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY partner_menu_sections_admin ON partner_menu_sections
  FOR ALL USING (is_admin());

CREATE POLICY partner_menu_items_owner ON partner_menu_items
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY partner_menu_items_admin ON partner_menu_items
  FOR ALL USING (is_admin());


COMMIT;
