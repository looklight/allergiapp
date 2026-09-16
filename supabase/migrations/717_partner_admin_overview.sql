-- ============================================================
-- 717_partner_admin_overview.sql
-- STATO: BOZZA, da applicare a mano dal SQL editor.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- QUELLO CHE L'ADMIN DEVE VEDERE DEI PARTNER, in una riga per locale.
--
-- Perché una funzione e non quattro query dal browser: l'email
-- dell'iscritto sta in `auth.users`, che dal client non si legge (stessa
-- ragione per cui esiste `get_profiles_with_email`, migration 016). E
-- perché contare menù e abbonamenti locale per locale dal browser vorrebbe
-- dire scaricare tutte le righe per fare delle somme.
--
-- La riga è il LOCALE e non l'iscritto, perché è il locale che si abbona
-- (1 abbonamento = 1 locale) ed è lì che cade il gesto dell'admin.
--
-- ⚠️ SOLO LETTURA. Concedere e revocare restano scritture normali su
-- partner_subscriptions, che le policy della 716 già consentono all'admin:
-- una funzione che scrive col permesso del definitore sarebbe una porta in
-- più da sorvegliare, per risparmiare una insert.
-- ============================================================

CREATE OR REPLACE FUNCTION get_partner_venues_admin(
  search_query text DEFAULT NULL
)
RETURNS TABLE (
  venue_id uuid,
  venue_name text,
  slug text,
  created_at timestamptz,
  owner_user_id uuid,
  first_name text,
  last_name text,
  email varchar,
  signed_up_at timestamptz,
  menus_total bigint,
  published_at timestamptz,
  card_id uuid,
  sub_id uuid,
  sub_source text,
  sub_status text,
  sub_plan text,
  sub_ends_at timestamptz,
  sub_cancel_at_period_end boolean,
  sub_note text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    v.name,
    v.slug,
    v.created_at,
    v.owner_user_id,
    a.first_name,
    a.last_name,
    u.email::varchar,
    a.created_at,
    (SELECT count(*) FROM partner_menus m WHERE m.venue_id = v.id),
    -- ⚠️ La pubblicazione sta sul LOCALE e non sul singolo menù (708): lo
    -- scatto in sala è uno solo e contiene tutte le carte attive. Una data
    -- qui vuol dire che il QR di quel locale è davvero in giro.
    v.published_at,
    (SELECT c.id FROM partner_cards c WHERE c.venue_id = v.id LIMIT 1),
    s.id,
    s.source,
    s.status,
    s.plan,
    s.ends_at,
    s.cancel_at_period_end,
    s.note
  FROM partner_venues v
  JOIN partner_accounts a ON a.user_id = v.owner_user_id
  JOIN auth.users u ON u.id = v.owner_user_id
  -- L'abbonamento APERTO del locale, se c'è: ce n'è al massimo uno (indice
  -- parziale della 716). I chiusi restano storia e non devono comparire al
  -- posto del vivo.
  LEFT JOIN LATERAL (
    SELECT s2.*
    FROM partner_subscriptions s2
    WHERE s2.venue_id = v.id
      AND s2.status IN ('active', 'past_due')
      AND (s2.ends_at IS NULL OR s2.ends_at > now())
    ORDER BY s2.created_at DESC
    LIMIT 1
  ) s ON true
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
  AND (
    search_query IS NULL
    OR v.name ILIKE '%' || search_query || '%'
    OR a.first_name ILIKE '%' || search_query || '%'
    OR a.last_name ILIKE '%' || search_query || '%'
    OR u.email::text ILIKE '%' || search_query || '%'
  )
  ORDER BY v.created_at DESC;
$$;


-- ------------------------------------------------------------
-- I NUMERI IN CIMA, in una riga sola.
-- Gli iscritti senza nemmeno un locale non compaiono nella lista qui sopra
-- (è una lista di locali): è proprio il primo gradino del percorso, e senza
-- questo conteggio non si vedrebbe.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_partner_stats_admin()
RETURNS TABLE (
  accounts bigint,
  accounts_with_venue bigint,
  venues bigint,
  venues_published bigint,
  subs_paid bigint,
  subs_granted bigint,
  subs_past_due bigint,
  -- Ricavo mensile ricorrente in centesimi: l'annuale diviso dodici, o un
  -- mese con molti annuali sembrerebbe un colpo di fortuna.
  mrr_cents bigint,
  expiring_30d bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH vive AS (
    SELECT s.*
    FROM partner_subscriptions s
    WHERE s.status IN ('active', 'past_due')
      AND (s.ends_at IS NULL OR s.ends_at > now())
  )
  SELECT
    (SELECT count(*) FROM partner_accounts),
    (SELECT count(DISTINCT owner_user_id) FROM partner_venues),
    (SELECT count(*) FROM partner_venues),
    (SELECT count(*) FROM partner_venues WHERE published_at IS NOT NULL),
    (SELECT count(*) FROM vive WHERE source = 'stripe'),
    (SELECT count(*) FROM vive WHERE source = 'manual'),
    (SELECT count(*) FROM vive WHERE status = 'past_due'),
    -- ⚠️ I prezzi sono scritti qui come sono in Stripe (799 e 6000 centesimi):
    -- il database non li conosce, li conosce Stripe. Cambiando listino va
    -- cambiata anche questa riga, o il conto racconta il passato.
    (SELECT coalesce(sum(CASE WHEN plan = 'yearly' THEN 6000 / 12 ELSE 799 END), 0)
       FROM vive WHERE source = 'stripe'),
    (SELECT count(*) FROM vive WHERE ends_at IS NOT NULL AND ends_at < now() + interval '30 days')
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
