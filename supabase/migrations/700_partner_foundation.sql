-- ============================================================
-- 700_partner_foundation.sql
-- STATO: BOZZA (2026-07-27) — NON APPLICATA
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
-- ============================================================


-- ============================================================
-- TABELLA: partner_companies
-- Anagrafica aziendale al primo claim: 5 campi del form unico
-- mondiale. Chiesta una volta per azienda, riusata su tutti i
-- suoi locali e passata al checkout (mai doppio inserimento).
-- ============================================================
CREATE TABLE partner_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
  owner_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES partner_companies(id),
  first_name TEXT NOT NULL,             -- persona identificata (dichiarata;
  last_name TEXT NOT NULL,              --  l'email è già verificata dal login)
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
-- Piatti dichiarati dal ristoratore (la feature più forte).
-- declared_allergens = allergeni PRESENTI nel piatto (semantica
-- Reg. 1169/2011: si dichiarano i presenti — DA CONFERMARE
-- quando disegneremo il menù; il legacy usava "allergen_free").
-- Niente triplo stato tracce: disclaimer contaminazione a
-- livello locale, sempre visibile (vincolo di design).
-- ============================================================
CREATE TABLE partner_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showcase_id UUID NOT NULL REFERENCES partner_showcases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT
    CHECK (category IS NULL OR
           category IN ('starters', 'first_courses', 'second_courses',
                        'sides', 'pizza', 'desserts', 'drinks', 'other')),
    -- FACOLTATIVA (NULL = senza categoria, mostrati per primi); set fisso
    -- tradotto lato client (niente testo libero: i18n gratis, UI ordinata,
    -- zero moderazione); ampliabile in futuro senza dolore
  photo_url TEXT,
  declared_allergens TEXT[] NOT NULL DEFAULT '{}',  -- codici da allergens.code
  diet_tags TEXT[] NOT NULL DEFAULT '{}',
    -- compatibilità dichiarate (vegetarian/vegan/histamine/nickel/diabetes,
    -- stessa lista esigenze di constants/diets.ts dell'app). Checkbox
    -- strutturate, mai testo libero; wording per istamina/nichel/diabete
    -- da vagliare legalmente prima del lancio.
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- freschezza: timestamp visibile all'utente; senza riconferma
    -- entro X mesi il matching degrada a neutro (X da tarare)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX partner_dishes_showcase_idx ON partner_dishes (showcase_id);


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
  url TEXT NOT NULL,
  language TEXT,
    -- solo per kind='menu': più righe menu con lingue diverse; NULL =
    -- predefinito. L'app mostra il menù nella lingua dell'utente,
    -- fallback sul predefinito.
  label TEXT,
    -- per kind='delivery': nome del provider (più righe = più servizi;
    -- un link solo apre diretto, con più link l'app mostra un bottom
    -- sheet di scelta)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
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
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_showcases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_dishes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- RLS
-- Ruolo partner = derivato dalle righe (owner_user_id/user_id),
-- MAI dal campo profiles.role (niente role-escalation).
-- ============================================================
ALTER TABLE partner_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_claims    ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_dishes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_audit_log ENABLE ROW LEVEL SECURITY;

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

-- Piatti e link: seguono la vetrina
CREATE POLICY partner_dishes_owner ON partner_dishes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM partner_showcases s
    WHERE s.id = showcase_id AND s.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM partner_showcases s
    WHERE s.id = showcase_id AND s.owner_user_id = auth.uid()));
CREATE POLICY partner_dishes_public_read ON partner_dishes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM partner_showcases s
    WHERE s.id = showcase_id AND s.status = 'published'));
CREATE POLICY partner_dishes_admin ON partner_dishes
  FOR ALL USING (is_admin());

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
