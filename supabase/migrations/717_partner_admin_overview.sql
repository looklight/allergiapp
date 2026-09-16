-- ============================================================
-- 717_partner_admin_overview.sql
-- STATO: APPLICATA il 2026-09-16 dal SQL editor, poi RIVISTA e DA
-- RIESEGUIRE INTERA lo stesso giorno (aggiunta `sub_started_at`).
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- ⚠️ SI RIESEGUE TUTTA, e il file comincia con un DROP: cambiando l'elenco
-- delle colonne restituite, PostgreSQL non lascia sostituire la funzione con
-- un semplice CREATE OR REPLACE. Il DROP qui è innocuo (la legge solo la
-- pagina Partner dell'admin, e per un istante), ma va eseguito FUORI da
-- BEGIN/COMMIT: nel SQL editor un DROP+CREATE dentro una transazione
-- risponde «success» senza installare niente (TODO.md, lezione del
-- 2026-09-05). Dopo, confermare che la funzione viva sia quella nuova:
--   SELECT pg_get_functiondef(p.oid) LIKE '%started_at%'
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'get_partner_venues_admin';
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

DROP FUNCTION IF EXISTS get_partner_venues_admin(text);

CREATE FUNCTION get_partner_venues_admin(
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
  -- Il catalogo è dell'ISCRITTO, non del locale (700): con due locali lo
  -- stesso numero compare su tutt'e due le righe, ed è giusto così.
  dishes_total bigint,
  -- I piatti scelti per la scheda AllergiApp di QUESTO locale (715): dicono
  -- se la scheda è stata davvero preparata, non solo aperta.
  card_dishes_total bigint,
  card_id uuid,
  sub_id uuid,
  sub_source text,
  sub_status text,
  sub_plan text,
  -- DA QUANDO dura questo abbonamento: senza, guardando la tabella non si
  -- capisce se un ristoratore è con noi da una settimana o da un anno, che è
  -- la domanda sulla permanenza.
  -- ⚠️ È l'inizio della riga CORRENTE, non della storia del locale: chi
  -- disdice e torna riparte da capo, e un offerto che poi paga comincia il
  -- giorno del primo pagamento. Per la permanenza vera servirà guardare anche
  -- le righe chiuse, il giorno che ce ne saranno.
  sub_started_at timestamptz,
  sub_ends_at timestamptz,
  sub_cancel_at_period_end boolean,
  sub_note text,
  -- Serve solo a costruire il link al cliente sulla dashboard di Stripe
  sub_customer_id text
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
    (SELECT count(*) FROM partner_dishes dd WHERE dd.owner_user_id = v.owner_user_id),
    (SELECT count(*) FROM partner_card_dishes cd WHERE cd.venue_id = v.id),
    (SELECT c.id FROM partner_cards c WHERE c.venue_id = v.id LIMIT 1),
    s.id,
    s.source,
    s.status,
    s.plan,
    s.started_at,
    s.ends_at,
    s.cancel_at_period_end,
    s.note,
    s.stripe_customer_id
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
  expiring_30d bigint,
  -- IL MOVIMENTO DEGLI ULTIMI 30 GIORNI. Nella pagina queste tre caselle si
  -- mostrano solo quando hanno qualcosa da dire: una fila di zeri fissi
  -- smette di essere letta, e si porta dietro le caselle accanto.
  new_accounts_30d bigint,
  new_subs_30d bigint,
  canceled_subs_30d bigint
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
    (SELECT count(*) FROM vive WHERE ends_at IS NOT NULL AND ends_at < now() + interval '30 days'),
    (SELECT count(*) FROM partner_accounts WHERE created_at > now() - interval '30 days'),
    (SELECT count(*) FROM partner_subscriptions WHERE created_at > now() - interval '30 days'),
    -- ⚠️ Qui si guardano anche le righe CHIUSE, che `vive` esclude: è l'unico
    -- posto in cui l'abbonamento finito conta. La disdetta col preavviso
    -- (cancel_at_period_end) porta canceled_at alla richiesta, non alla fine:
    -- è il momento in cui il ristoratore ha deciso, che è quello che interessa.
    (SELECT count(*) FROM partner_subscriptions
      WHERE canceled_at IS NOT NULL AND canceled_at > now() - interval '30 days')
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
