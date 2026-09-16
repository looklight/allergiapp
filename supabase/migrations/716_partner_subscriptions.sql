-- ============================================================
-- 716_partner_subscriptions.sql
-- STATO: APPLICATA il 2026-09-16 e verificata (16 colonne,
-- l'indice parziale, venue_subscription_active, 2 policy).
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- L'ABBONAMENTO, SUL LOCALE.
--
-- Ordine deciso dall'utente il 2026-09-15: prima l'abbonamento,
-- poi l'associazione a un ristorante dell'app. Per questo la riga
-- si appende a partner_venues e non a partner_cards: la scheda
-- nasce solo con l'associazione (restaurant_id NOT NULL, 703), e
-- l'abbonamento deve esistere prima di lei.
--
-- DUE PROVENIENZE, UNA TABELLA:
--   stripe  pagato dal ristoratore. La riga la scrive SOLO il
--           webhook (service role), mai il portale.
--   manual  concesso dall'admin, per qualunque motivo (non
--           "fondatori": decisione dell'utente, 15/09) — il motivo
--           sta nella nota, la scadenza è facoltativa.
--
-- Chi legge "questo locale ha un abbonamento" passa da
-- venue_subscription_active(), non rifà il conto a mano: le regole
-- (scadenza, pagamento in ritardo) stanno in un posto solo.
--
-- ⚠️ NON TOCCA ANCORA LA PUBBLICAZIONE. partner_cards.status resta
-- com'è: come l'abbonamento accende la scheda si decide insieme
-- all'associazione, che oggi non esiste (al 15/09 nessuna riga in
-- partner_cards). Vedi la nota in fondo sulla policy del gestore.
--
-- Listino di partenza (15/09): 7,99 €/mese, 60 €/anno. I prezzi
-- NON stanno qui: vivono in Stripe, qui c'è solo quale dei due.
-- ============================================================

BEGIN;

CREATE TABLE partner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  owner_user_id UUID NOT NULL,

  source TEXT NOT NULL CHECK (source IN ('stripe', 'manual')),
  plan TEXT CHECK (plan IN ('monthly', 'yearly')),
    -- NULL per le concessioni manuali: non c'è un listino dietro.

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN (
      'active',     -- vale
      'past_due',   -- Stripe sta ritentando il pagamento: vale ancora
      'canceled'    -- chiuso (disdetto, revocato, pagamento fallito)
    )),
    -- Niente 'expired': una scadenza passata si legge da ends_at,
    -- così nessun lavoro notturno deve ricordarsi di cambiare stato.

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
    -- stripe: fine del periodo pagato, aggiornata a ogni rinnovo.
    -- manual: scadenza scelta dall'admin, NULL = senza scadenza.
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    -- disdetto ma pagato fino a ends_at: il portale lo dice.
  canceled_at TIMESTAMPTZ,

  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,

  note TEXT,                  -- motivo della concessione manuale
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    -- l'admin che l'ha concesso: auth.users, come nell'audit

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- RESTRICT e non CASCADE: un locale con un abbonamento Stripe
  -- vivo non si cancella, o si continua a pagare per una cosa che
  -- non c'è più. Prima si disdice, poi si cancella.
  FOREIGN KEY (venue_id, owner_user_id)
    REFERENCES partner_venues (id, owner_user_id) ON DELETE RESTRICT,

  CONSTRAINT partner_subscriptions_source_fields CHECK (
    (source = 'stripe' AND stripe_subscription_id IS NOT NULL AND plan IS NOT NULL)
    OR
    (source = 'manual' AND stripe_subscription_id IS NULL)
  )
);

-- Un solo abbonamento aperto per locale. Lo storico (chiusi)
-- resta accanto. ⚠️ Una concessione manuale scaduta per data è
-- ancora 'active': chi ne apre una nuova sullo stesso locale (il
-- webhook al primo pagamento, l'admin che rinnova) chiude prima
-- la vecchia.
CREATE UNIQUE INDEX partner_subscriptions_one_open_per_venue
  ON partner_subscriptions (venue_id)
  WHERE status IN ('active', 'past_due');

CREATE INDEX partner_subscriptions_owner_idx ON partner_subscriptions (owner_user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- LA DOMANDA UNICA: questo locale ha un abbonamento che vale?
-- SECURITY DEFINER perché servirà dentro altre policy e dentro
-- build_public_menu, dove chi chiede non vede questa tabella.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION venue_subscription_active(p_venue_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM partner_subscriptions s
    WHERE s.venue_id = p_venue_id
      AND s.status IN ('active', 'past_due')
      AND (s.ends_at IS NULL OR s.ends_at > now())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;


-- ------------------------------------------------------------
-- RLS
-- Il gestore LEGGE i suoi, non scrive: se potesse, si
-- regalerebbe l'abbonamento da PostgREST col proprio token.
-- Scrivono l'admin (concessioni) e il service role (webhook,
-- che la RLS la scavalca).
-- ------------------------------------------------------------
ALTER TABLE partner_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY partner_subscriptions_owner_read ON partner_subscriptions
  FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY partner_subscriptions_admin ON partner_subscriptions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

COMMIT;


-- ============================================================
-- ⚠️ DA CHIUDERE PRIMA CHE L'ABBONAMENTO VALGA QUALCOSA
-- partner_cards_owner (703) è FOR ALL sul gestore: oggi può
-- scriversi da solo status = 'published' su una scheda, senza
-- pagare. Innocuo al 15/09 (nessuna scheda, e l'app non legge le
-- tabelle partner), ma è la porta accanto a questa: va chiusa
-- nella migration dell'associazione, quando si decide come
-- l'abbonamento accende la scheda.
-- ============================================================
