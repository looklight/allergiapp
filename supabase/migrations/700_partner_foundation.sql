-- ============================================================
-- 700_partner_foundation.sql
-- STATO: BOZZA (2026-07-27, rivista 2026-08-30) — NON APPLICATA
-- Da rivedere insieme prima di applicare via SQL editor.
--
-- Fondazioni del portale partner (fase 1: claim self-service +
-- dashboard compilabile come bozza privata).
-- Serie 7xx = portale partner (app = numeri bassi, admin = 5xx).
-- Riferimenti: MONETIZATION.md — claim v3, premium-only,
-- vetrina spegnibile con motivo, un solo gestore per locale.
--
-- NOTA: sostituisce concettualmente il design di marzo 2026
-- (restaurant_claims / restaurant_dishes / restaurant_allergens
-- della 001) che resta nel DB ma è SUPERATO — v. sezione
-- "Pulizie legacy" in fondo.
--
-- ------------------------------------------------------------
-- IL CATALOGO È DEL PARTNER, NON DELLA VETRINA (deciso 2026-08-30)
-- Revisione della bozza dopo il lavoro sul portale.
-- Un ristoratore con due locali riusa gli stessi piatti: se i
-- piatti pendessero dalla vetrina, la stessa carbonara sarebbe
-- due righe diverse, con due liste di allergeni da tenere
-- allineate a mano. Quindi:
--   1. partner_dishes pende da partner_accounts — è il catalogo
--      del ristoratore, non il contenuto di un locale;
--   2. partner_showcase_dishes dice quali piatti sono ACCESI in
--      quale vetrina, ed è l'unico stato di disponibilità che
--      esiste: spegnere un piatto in un locale non lo tocca
--      nell'altro e non lo toglie dal catalogo;
--   3. eliminare una vetrina non porta via i piatti, che restano
--      del partner (il portale lo dice già a chi cancella).
-- NIENTE IMPORTAZIONE dal prototipo (deciso 2026-08-30): quello
-- che oggi sta nel localStorage del portale sono prove, non dati
-- da salvare. Al passaggio al database il catalogo riparte
-- vuoto, e non va scritto nessun importatore.
--
-- Conseguenza sul menù digitale (fase futura): il prezzo NON
-- starà su partner_dishes ma sull'accostamento piatto↔menù. È il
-- motivo per cui qui una colonna prezzo non c'è: lo stesso piatto
-- costa diverso a pranzo e a cena, e dentro un degustazione non
-- ha prezzo affatto.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- SEPARAZIONE UTENTE / PARTNER (deciso 2026-08-22)
-- Utenti dell'app e partner sono DUE ENTITÀ DIVERSE, con due
-- percorsi di iscrizione diversi (modello Uber utente/driver):
--   * la credenziale (auth.users) è UNA — la stessa email può
--     servire entrambi i mondi, con una sola password;
--   * il profilo utente (profiles) e il profilo partner
--     (partner_accounts) nascono da due atti distinti e non si
--     implicano a vicenda.
-- Conseguenze applicate qui:
--   1. le FK partner NON puntano più a profiles(id): un partner
--      può esistere senza essere utente dell'app;
--   2. tutto il contenuto partner pende da partner_accounts, che
--      è il cancello strutturale: niente profilo partner ⇒
--      niente vetrine, per vincolo di database e non per
--      controllo applicativo;
--   3. nome e cognome salgono dal claim al profilo partner (il
--      claim resta un modulo puramente aziendale).
-- Da fare quando questa migration verrà applicata: guardia in
-- supabase/functions/delete-account (oggi fa auth.admin.deleteUser,
-- che porterebbe via anche il mondo partner della stessa persona).
-- ============================================================


-- ============================================================
-- TUTTO O NIENTE
-- In PostgreSQL anche il DDL è transazionale: se una delle
-- istruzioni qui sotto fallisce, il ROLLBACK riporta il
-- database esattamente com'era. Senza, un errore a metà
-- lascerebbe nove tabelle create a pezzi da smontare a mano
-- capendo quali sono passate e quali no.
-- Va eseguita TUTTA D'UN PEZZO: le chiavi composte
-- dell'accostamento pretendono che vetrine e piatti esistano già.
-- ============================================================
BEGIN;


-- ============================================================
-- TABELLA: partner_accounts
-- IL PROFILO PARTNER: l'entità "ristoratore", distinta dal
-- profilo utente dell'app (profiles). Nasce SOLO da un atto
-- deliberato sul portale — non esiste "utente promosso a
-- partner", non c'è nessun ponte dall'app.
--
-- Perché la chiave è auth.users e non profiles: la credenziale
-- è condivisa (stessa email per entrambi i mondi), l'entità no.
-- Chi si iscrive dal portale senza aver mai usato l'app NON ha
-- una riga in profiles: non esiste nella community, non compare
-- in classifiche o conteggi.
--
-- L'iscrizione partner chiede più dell'email: la persona si
-- presenta (nome, cognome, contatto). I dati AZIENDALI non
-- stanno qui — arrivano al primo claim (partner_companies).
-- Tabella volutamente estendibile: altri campi del modulo di
-- iscrizione si aggiungono qui senza rotture.
-- ============================================================
CREATE TABLE partner_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,                           -- contatto operativo, non di fatturazione
  preferred_language TEXT,              -- 'it' | 'en' (portale i18n dal giorno 1)
  terms_accepted_at TIMESTAMPTZ,        -- accettazione condizioni portale (P2B/ToS)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- TABELLA: partner_companies
-- Anagrafica aziendale al primo claim: 5 campi del form unico
-- mondiale. Chiesta una volta per azienda, riusata su tutti i
-- suoi locali e passata al checkout (mai doppio inserimento).
-- ============================================================
CREATE TABLE partner_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES partner_accounts(user_id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,           -- ISO 3166-1 alpha-2
  legal_name TEXT NOT NULL,             -- denominazione/ragione sociale
  vat_number TEXT NOT NULL,             -- P.IVA/VAT: identificativo universale
  vat_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (vat_status IN ('unverified', 'vies_valid', 'vies_invalid', 'manual')),
  vat_checked_at TIMESTAMPTZ,           -- ultimo check VIES (UE) / best-effort
  address TEXT NOT NULL,                -- sede legale (testo libero, non geocodata)
  billing_email TEXT NOT NULL,
  sdi_code TEXT,                        -- solo Italia, facoltativo (senza: 0000000 → cassetto fiscale)
  stripe_customer_id TEXT,              -- un Customer Stripe per azienda (si popola in fase 4)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NIENTE UNIQUE su (country_code, vat_number): il contro-claim
-- legittimo dichiara la stessa azienda da un altro account.
-- P.IVA duplicata = segnale nel pannello admin, non un errore.


-- ============================================================
-- TABELLA: partner_showcases
-- La "vetrina": contenitore dei contenuti partner di un locale.
-- Nasce come BOZZA PRIVATA legata all'account (restaurant_id
-- NULL, nulla visibile in app), si aggancia alla scheda col
-- claim, diventa visibile solo con status = 'published'
-- (abbonamento attivo). Lo status è l'interruttore unico con
-- motivo (scadenza / pausa / sospensione / revoca): contenuti
-- MAI cancellati, downgrade morbido.
-- ============================================================
CREATE TABLE partner_showcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES partner_accounts(user_id) ON DELETE CASCADE,
  venue_name TEXT,
    -- Nome che il partner dà alla vetrina per riconoscerla nella sua lista.
    -- NON è il nome del locale: quello arriva dalla scheda con il claim.
    -- Prima del claim è l'unica etichetta che ha; dopo resta un suo appunto.
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    -- NULL = bozza non ancora associata (pre-claim).
    -- SET NULL: se la scheda community sparisce il lavoro resta.
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',                -- bozza privata, mai pubblicata
      'published',            -- abbonamento attivo, vetrina live in app
      'expired',              -- abbonamento scaduto (win-back: tutto pronto al rinnovo)
      'paused_by_partner',    -- pausa volontaria (anche feature di sicurezza: menù cambiato)
      'suspended_by_admin',   -- sospensione con motivazione e replica (DSA art. 17)
      'claim_revoked'         -- associazione sciolta (gestore sbagliato/frode)
    )),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspension_note TEXT,                 -- motivazione admin comunicata al partner (DSA art. 17)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un solo gestore per locale ⇒ una sola vetrina per locale.
CREATE UNIQUE INDEX partner_showcases_one_per_restaurant
  ON partner_showcases (restaurant_id)
  WHERE restaurant_id IS NOT NULL;

CREATE INDEX partner_showcases_owner_idx ON partner_showcases (owner_user_id);

-- Serve alla chiave composta di partner_showcase_dishes: è quella che rende
-- IMPOSSIBILE accendere il piatto di un partner nella vetrina di un altro,
-- per vincolo di database e non per controllo applicativo.
ALTER TABLE partner_showcases ADD CONSTRAINT partner_showcases_id_owner_key
  UNIQUE (id, owner_user_id);


-- ============================================================
-- TABELLA: partner_claims
-- Il collegamento dichiarato persona → azienda → locale.
-- Self-service: nasce 'active' senza approvazione preventiva
-- (i cancelli sono anagrafica tracciabile + carta + moderazione
-- a valle). Stati e timestamp dal giorno 1 per revoca,
-- decadenza e contro-claim senza migrazioni dolorose.
-- ============================================================
CREATE TABLE partner_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES partner_accounts(user_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES partner_companies(id),
  -- La persona NON si ridichiara qui: nome e cognome stanno in
  -- partner_accounts (raccolti all'iscrizione partner, 2026-08-22),
  -- l'email è già verificata dal login. Il claim è il modulo
  -- puramente aziendale: azienda ↔ locale.
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN (
      'active',      -- claim in essere (unico per locale)
      'pending',     -- contro-claim in attesa di ri-verifica/decisione admin
      'superseded',  -- sostituito da un contro-claim andato a buon fine
      'revoked',     -- revocato dall'admin (frode/gestore sbagliato)
      'lapsed'       -- decaduto per inattività (zero contenuti e zero accessi)
    )),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),  -- per la decadenza "use it or lose it"
  resolved_at TIMESTAMPTZ,              -- quando lo stato è diventato terminale
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un solo gestore per locale (deciso 2026-07-27): unicità sul
-- claim ATTIVO; le righe pending/storiche coesistono (serve al
-- contro-claim).
CREATE UNIQUE INDEX partner_claims_one_active_per_restaurant
  ON partner_claims (restaurant_id)
  WHERE status = 'active';

-- Lo stesso utente non accumula più claim aperti sullo stesso locale.
CREATE UNIQUE INDEX partner_claims_one_open_per_user
  ON partner_claims (restaurant_id, user_id)
  WHERE status IN ('active', 'pending');

CREATE INDEX partner_claims_user_idx ON partner_claims (user_id);


-- ============================================================
-- TABELLA: partner_dishes
-- IL CATALOGO del ristoratore: i piatti come fatti, non come
-- contenuto di un locale. Pende da partner_accounts, così chi
-- gestisce due locali scrive la carbonara una volta sola.
-- Dove appare lo dice partner_showcase_dishes, qui sotto.
--
-- declared_allergens = allergeni PRESENTI nel piatto (semantica
-- Reg. 1169/2011: si dichiarano i presenti; il legacy usava
-- "allergen_free"). Niente triplo stato tracce: il disclaimer
-- contaminazione sta a livello locale ed è sempre visibile.
--
-- NIENTE COLONNA PREZZO, e non è una dimenticanza: v. la nota
-- sul menù digitale in testa al file.
-- ============================================================
CREATE TABLE partner_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES partner_accounts(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
    -- l'ORIGINALE: c'è sempre, ed è il ripiego di ogni traduzione
  description TEXT,
  category TEXT
    CHECK (category IS NULL OR
           category IN ('starters', 'first_courses', 'second_courses',
                        'sides', 'pizza', 'desserts', 'drinks', 'other')),
    -- FACOLTATIVA (NULL = senza categoria, mostrati per primi); set fisso
    -- tradotto lato client (niente testo libero: i18n gratis, UI ordinata,
    -- zero moderazione); ampliabile in futuro senza dolore.
    -- ATTENZIONE alla mappatura col portale, che usa stringa vuota per
    -- "senza categoria": '' lato client ⇄ NULL qui.
    -- Resta il set di AllergiApp, quello che rende confrontabili i
    -- ristoranti fra loro. Le SEZIONI del menù digitale (testo libero,
    -- "Le nostre paste fresche") saranno un'altra cosa, in un'altra
    -- tabella: una classificazione e un indice non sono la stessa cosa.
  photo_url TEXT,
    -- Supabase Storage. Il portale oggi tiene data-URL nel browser:
    -- al passaggio al database vanno caricate come file.
  declared_allergens TEXT[] NOT NULL DEFAULT '{}',  -- codici da allergens.code
  diet_tags TEXT[] NOT NULL DEFAULT '{}',
    -- compatibilità dichiarate (vegetarian/vegan/histamine/nickel/diabetes,
    -- stessa lista esigenze di constants/diets.ts dell'app). Checkbox
    -- strutturate, mai testo libero; wording per istamina/nichel/diabete
    -- da vagliare legalmente prima del lancio.
  sort_order INTEGER NOT NULL DEFAULT 0,
    -- ordine del catalogo, che è anche quello con cui l'app mostra i
    -- piatti: non esiste un ordinamento per vetrina
  last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- freschezza: timestamp visibile all'utente; senza riconferma
    -- entro X mesi il matching degrada a neutro (X da tarare)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX partner_dishes_owner_idx ON partner_dishes (owner_user_id);

-- Coppia referenziabile, come per le vetrine: serve all'accostamento.
ALTER TABLE partner_dishes ADD CONSTRAINT partner_dishes_id_owner_key
  UNIQUE (id, owner_user_id);


-- ============================================================
-- TABELLA: partner_showcase_dishes
-- Quali piatti del catalogo sono ACCESI in quale vetrina.
-- La riga c'è = il piatto compare in quella scheda. Non c'è =
-- resta nel catalogo, spento lì. È l'unico stato di
-- disponibilità del sistema: niente colonna "available" sul
-- piatto, che sarebbe globale e spegnerebbe la carbonara in
-- tutti i locali insieme.
--
-- Le due chiavi composte con owner_user_id rendono impossibile
-- accendere il piatto di un partner nella vetrina di un altro:
-- è un vincolo del database, non una policy che si può
-- dimenticare di scrivere.
-- ============================================================
CREATE TABLE partner_showcase_dishes (
  showcase_id UUID NOT NULL,
  dish_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (showcase_id, dish_id),
  FOREIGN KEY (showcase_id, owner_user_id)
    REFERENCES partner_showcases (id, owner_user_id) ON DELETE CASCADE,
  FOREIGN KEY (dish_id, owner_user_id)
    REFERENCES partner_dishes (id, owner_user_id) ON DELETE CASCADE
);

CREATE INDEX partner_showcase_dishes_dish_idx ON partner_showcase_dishes (dish_id);


-- ============================================================
-- TABELLA: partner_dish_translations
-- Nome e descrizione in un'altra lingua. Campi FACOLTATIVI uno
-- per uno: il caso normale è tradurre la descrizione e lasciare
-- il nome com'è — "Carbonara" resta "Carbonara", ed è anche la
-- parola che serve al cliente per dirla al cameriere.
-- Vuoto o assente ⇒ si legge l'originale su partner_dishes,
-- campo per campo. Un campo vuoto non è un buco: è una scelta.
--
-- Tabella e non colonna JSONB perché la pagina pubblica del
-- menù (fase futura) leggerà una lingua sola.
-- ============================================================
CREATE TABLE partner_dish_translations (
  dish_id UUID NOT NULL REFERENCES partner_dishes(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language ~ '^[a-z]{2}$'),
    -- codice ISO 639-1. Nessun CHECK sull'elenco: le lingue offerte dal
    -- portale (oggi 15) crescono senza dover migrare il database.
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (dish_id, language)
);


-- ============================================================
-- TABELLA: partner_links
-- Link della vetrina (prenotazione, delivery, menù, sito).
-- I link sono l'unico vettore di phishing del portale: le
-- modifiche subito dopo un claim sono un segnale admin (audit).
-- ============================================================
CREATE TABLE partner_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showcase_id UUID NOT NULL REFERENCES partner_showcases(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('booking', 'delivery', 'menu', 'website', 'other')),
  url TEXT,
  phone TEXT,
    -- solo per kind='booking': c'è chi prende le prenotazioni solo al
    -- telefono, chi solo online e chi in tutti e due i modi. Nessuna
    -- validazione sul numero: i formati veri sono troppo vari e un falso
    -- errore blocca il ristoratore su un dato che è suo.
  language TEXT,
    -- solo per kind='menu': più righe menu con lingue diverse; NULL =
    -- predefinito. L'app mostra il menù nella lingua dell'utente,
    -- fallback sul predefinito.
  provider TEXT,
    -- solo per kind='delivery': codice del servizio (deliveroo, glovo…)
    -- oppure 'other'. Serve a mostrare il logo giusto in app.
  label TEXT,
    -- nome scritto a mano del servizio quando provider = 'other'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Una riga vale qualcosa solo se porta da qualche parte: un indirizzo,
  -- oppure un numero se è una prenotazione. Il vincolo ha un nome perché
  -- l'errore lo dica in chiaro invece di citare una sigla generata.
  CONSTRAINT partner_links_has_target
    CHECK (url IS NOT NULL OR (kind = 'booking' AND phone IS NOT NULL))
);

CREATE INDEX partner_links_showcase_idx ON partner_links (showcase_id);


-- ============================================================
-- TABELLA: partner_audit_log
-- Audit dal giorno 1: claim, cambi stato vetrina, modifiche
-- link. Base per i "segnali in admin, non burocrazia in
-- ingresso" (rate limit, pattern sospetti).
-- ============================================================
CREATE TABLE partner_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    -- auth.users e non partner_accounts: qui agiscono anche gli
    -- admin, che sono utenti dell'app e non partner

  claim_id UUID REFERENCES partner_claims(id) ON DELETE SET NULL,
  showcase_id UUID REFERENCES partner_showcases(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  action TEXT NOT NULL,   -- es. claim_created, claim_revoked, showcase_published,
                          --     showcase_paused, link_changed, dish_confirmed…
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX partner_audit_log_restaurant_idx ON partner_audit_log (restaurant_id);
CREATE INDEX partner_audit_log_actor_idx ON partner_audit_log (actor_user_id);


-- ============================================================
-- TRIGGER updated_at (riusa update_updated_at() della 001)
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_showcases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_dishes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_dish_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- partner_showcase_dishes non ha updated_at: la riga o c'è o non c'è.


-- ============================================================
-- RLS
-- Ruolo partner = derivato dalle righe (owner_user_id/user_id),
-- MAI dal campo profiles.role (niente role-escalation).
-- ============================================================
ALTER TABLE partner_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_claims    ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_dishes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_showcase_dishes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_dish_translations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_audit_log ENABLE ROW LEVEL SECURITY;

-- Profilo partner: ognuno vede e gestisce solo il proprio.
-- L'iscrizione è self-service (INSERT della propria riga), ma
-- resta un atto esplicito: nessuna riga nasce da sola, e senza
-- questa riga le FK impediscono qualunque contenuto partner.
-- NOTA: il cancello è QUESTA tabella, mai raw_user_meta_data —
-- i metadata dell'utente sono modificabili dal client con la
-- anon key e non valgono nulla come controllo di sicurezza.
CREATE POLICY partner_accounts_own ON partner_accounts
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY partner_accounts_admin ON partner_accounts
  FOR ALL USING (is_admin());

-- Aziende: solo il proprietario (e l'admin)
CREATE POLICY partner_companies_owner ON partner_companies
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY partner_companies_admin ON partner_companies
  FOR ALL USING (is_admin());

-- Vetrine: il proprietario gestisce le sue; l'app legge SOLO le pubblicate
CREATE POLICY partner_showcases_owner ON partner_showcases
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY partner_showcases_public_read ON partner_showcases
  FOR SELECT USING (status = 'published');
CREATE POLICY partner_showcases_admin ON partner_showcases
  FOR ALL USING (is_admin());

-- Il catalogo è del partner: si legge e si scrive per proprietario, non
-- passando dalla vetrina. Pubblico invece è solo il piatto ACCESO in una
-- vetrina pubblicata: il resto del catalogo è lavoro privato e non deve
-- uscire (comprese le bozze dei piatti non ancora messi in scheda).
CREATE POLICY partner_dishes_owner ON partner_dishes
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY partner_dishes_public_read ON partner_dishes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_showcase_dishes sd
    JOIN partner_showcases s ON s.id = sd.showcase_id
    WHERE sd.dish_id = partner_dishes.id AND s.status = 'published'));
CREATE POLICY partner_dishes_admin ON partner_dishes
  FOR ALL USING (is_admin());

-- Accostamento: il proprietario accende e spegne i suoi. In lettura
-- pubblica passa solo l'accostamento a una vetrina pubblicata — è la riga
-- che dice all'app quali piatti mostrare in quella scheda.
CREATE POLICY partner_showcase_dishes_owner ON partner_showcase_dishes
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY partner_showcase_dishes_public_read ON partner_showcase_dishes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_showcases s
    WHERE s.id = showcase_id AND s.status = 'published'));
CREATE POLICY partner_showcase_dishes_admin ON partner_showcase_dishes
  FOR ALL USING (is_admin());

-- Traduzioni: seguono il piatto, in scrittura come in lettura
CREATE POLICY partner_dish_translations_owner ON partner_dish_translations
  FOR ALL USING (EXISTS (
    SELECT 1 FROM partner_dishes d
    WHERE d.id = dish_id AND d.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM partner_dishes d
    WHERE d.id = dish_id AND d.owner_user_id = auth.uid()));
CREATE POLICY partner_dish_translations_public_read ON partner_dish_translations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_showcase_dishes sd
    JOIN partner_showcases s ON s.id = sd.showcase_id
    WHERE sd.dish_id = partner_dish_translations.dish_id AND s.status = 'published'));
CREATE POLICY partner_dish_translations_admin ON partner_dish_translations
  FOR ALL USING (is_admin());

-- I link seguono la vetrina

CREATE POLICY partner_links_owner ON partner_links
  FOR ALL USING (EXISTS (
    SELECT 1 FROM partner_showcases s
    WHERE s.id = showcase_id AND s.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM partner_showcases s
    WHERE s.id = showcase_id AND s.owner_user_id = auth.uid()));
CREATE POLICY partner_links_public_read ON partner_links
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_showcases s
    WHERE s.id = showcase_id AND s.status = 'published'));
CREATE POLICY partner_links_admin ON partner_links
  FOR ALL USING (is_admin());

-- Claim: il partner vede e crea i propri; stati cambiati solo dall'admin
-- (pausa/riattivazione vetrina passano da partner_showcases, non da qui)
CREATE POLICY partner_claims_own_read ON partner_claims
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY partner_claims_own_insert ON partner_claims
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY partner_claims_admin ON partner_claims
  FOR ALL USING (is_admin());

-- Audit: scrive chi agisce (con la propria identità), legge solo l'admin
CREATE POLICY partner_audit_insert ON partner_audit_log
  FOR INSERT WITH CHECK (actor_user_id = auth.uid());
CREATE POLICY partner_audit_admin_read ON partner_audit_log
  FOR SELECT USING (is_admin());


COMMIT;


-- ============================================================
-- LEGACY (design marzo 2026) — DECISIONE 2026-07-27: NON si
-- cancella nulla, le strutture restano nel DB (potrebbero
-- tornare utili). restaurant_claims, restaurant_allergens,
-- restaurant_dishes e le colonne owner_id / is_premium /
-- subscription_* su restaurants semplicemente non vengono
-- usate dal nuovo design.
--
-- UNICO prerequisito PRIMA del primo abbonamento vero (non è
-- una cancellazione): neutralizzare "ORDER BY r.is_premium
-- DESC" negli RPC live (ultima definizione in 068) — oggi
-- inerte (is_premium sempre false), al primo premium
-- diventerebbe ranking a pagamento, violazione del principio
-- guida.
-- ============================================================
