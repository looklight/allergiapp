-- ============================================================
-- 730_admin_venue_tools.sql
-- STATO: APPLICATA il 2026-09-20 e verificata (una sola firma della
-- funzione, con le due date; tre comandi nuovi, chiusi agli anonimi).
-- Provata prima in transazione annullata.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- QUELLO CHE SERVE ALL'ADMIN QUANDO UN RISTORATORE MOLLA (20/09).
-- Ne arriveranno tanti che provano il menù e spariscono: bisogna
-- riconoscerli e poter liberare quello che hanno occupato.
--
--   A. CHI È ANCORA VIVO. Due date in più nella pagina Partner: l'ultimo
--      ACCESSO al portale (lo registra l'autenticazione) e l'ultima
--      MODIFICA a questo locale (nome, menù, sezioni, righe). Chi non entra
--      da mesi e non ha mai pubblicato ha abbandonato.
--      ⚠️ Non contiamo le aperture del menù dei clienti: l'informativa dice
--      che non contiamo le scansioni del QR. Quello è un altro discorso, da
--      fare insieme alle statistiche.
--
--   B. DUE COMANDI. Ritirare dal web un menù abbandonato, e liberare
--      l'indirizzo che teneva occupato. Passano da due funzioni e non da
--      una scrittura diretta perché il trigger della 722 impedisce a
--      chiunque sia «authenticated» — admin compreso — di toccare
--      published_at, e perché ogni gesto dell'admin deve lasciare la sua
--      riga nel registro, col motivo (DSA art. 17 quando riguarda il
--      ristoratore).
--      L'indirizzo liberato passa dai ritirati come un cambio qualunque
--      (729): 30 giorni e poi è di tutti.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- A. LE DUE DATE NELLA PAGINA PARTNER
-- ------------------------------------------------------------

drop function get_partner_venues_admin(text);

create function get_partner_venues_admin(search_query text default null)
returns table (
  venue_id uuid, venue_name text, slug text, created_at timestamptz,
  owner_user_id uuid, first_name text, last_name text, email varchar,
  signed_up_at timestamptz, menus_total bigint, published_at timestamptz,
  dishes_total bigint, card_dishes_total bigint, card_id uuid,
  sub_id uuid, sub_source text, sub_status text, sub_plan text,
  sub_started_at timestamptz, sub_ends_at timestamptz,
  sub_cancel_at_period_end boolean, sub_note text, sub_customer_id text,
  past_subs bigint, ex_canceled_at timestamptz, ex_source text,
  ex_started_at timestamptz, ex_ends_at timestamptz,
  -- none · requested · review · suspended · paused · live · expired
  card_state text,
  -- Chi è ancora vivo: l'ultimo accesso al portale e l'ultima volta che ha
  -- toccato questo locale (20/09). Senza, un locale abbandonato e uno
  -- appena creato si somigliano.
  last_sign_in_at timestamptz,
  last_edit_at timestamptz
)
language sql
security definer
set search_path = public
as $$
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
    -- quelli che l'app mostra: i pubblicati (728), non la bozza
    (SELECT count(*) FROM partner_card_dishes_published cd WHERE cd.venue_id = v.id),
    c.id,
    s.id,
    s.source,
    s.status,
    s.plan,
    s.started_at,
    s.ends_at,
    s.cancel_at_period_end,
    s.note,
    s.stripe_customer_id,
    (SELECT count(*) FROM partner_subscriptions p
      WHERE p.venue_id = v.id AND p.status = 'canceled'),
    ex.canceled_at,
    ex.source,
    ex.started_at,
    ex.ends_at,
    -- Lo stesso ordine di cardState() nel portale: si dice la cosa che conta
    -- per prima
    CASE
      WHEN c.id IS NULL THEN
        CASE WHEN EXISTS (SELECT 1 FROM partner_card_requests r
                           WHERE r.venue_id = v.id AND r.status = 'pending')
             THEN 'requested' ELSE 'none' END
      WHEN c.status = 'suspended' THEN 'suspended'
      WHEN c.reviewed_at IS NULL THEN 'review'
      WHEN c.status = 'paused' THEN 'paused'
      WHEN partner_card_visible(c.id) THEN 'live'
      ELSE 'expired'
    END,
    u.last_sign_in_at,
    greatest(
      v.updated_at,
      coalesce((SELECT max(m.updated_at) FROM partner_menus m WHERE m.venue_id = v.id), 'epoch'),
      coalesce((SELECT max(s2.updated_at) FROM partner_menu_sections s2
                 JOIN partner_menus m2 ON m2.id = s2.menu_id WHERE m2.venue_id = v.id), 'epoch'),
      coalesce((SELECT max(i2.updated_at) FROM partner_menu_items i2
                 JOIN partner_menus m3 ON m3.id = i2.menu_id WHERE m3.venue_id = v.id), 'epoch')
    )
  FROM partner_venues v
  JOIN partner_accounts a ON a.user_id = v.owner_user_id
  JOIN auth.users u ON u.id = v.owner_user_id
  -- L'associazione IN CORSO (al massimo una per locale, 721); prima era la
  -- prima trovata, anche se chiusa
  LEFT JOIN LATERAL (
    SELECT c2.id, c2.status, c2.reviewed_at
    FROM partner_cards c2
    WHERE c2.venue_id = v.id
      AND c2.status IN ('active', 'paused', 'suspended')
    LIMIT 1
  ) c ON true
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
  -- L'ULTIMO ABBONAMENTO CHIUSO, che c'è anche quando ce n'è uno vivo (chi ha
  -- disdetto e poi è tornato). Si ordina per la data della disdetta, con la
  -- scadenza come ripiego: una riga chiusa da un pagamento fallito la
  -- canceled_at ce l'ha, una scaduta e basta no.
  LEFT JOIN LATERAL (
    SELECT s3.canceled_at, s3.source, s3.started_at, s3.ends_at
    FROM partner_subscriptions s3
    WHERE s3.venue_id = v.id AND s3.status = 'canceled'
    ORDER BY coalesce(s3.canceled_at, s3.ends_at) DESC NULLS LAST
    LIMIT 1
  ) ex ON true
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

revoke all on function get_partner_venues_admin(text) from public, anon;
grant execute on function get_partner_venues_admin(text) to authenticated;


-- ------------------------------------------------------------
-- B. RITIRARE DAL WEB E LIBERARE L'INDIRIZZO
-- ------------------------------------------------------------

-- La riga nel registro: la scrivono tutte e due le funzioni qui sotto
create function admin_log_venue(p_venue_id uuid, p_action text, p_note text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into partner_audit_log (actor_user_id, venue_id, action, details)
  values (auth.uid(), p_venue_id, p_action, jsonb_build_object('note', p_note));
$$;

revoke all on function admin_log_venue(uuid, text, text) from public, anon, authenticated;

create function admin_unpublish_menu(p_venue_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;
  if coalesce(length(btrim(p_note)), 0) = 0 then
    raise exception 'note_required';
  end if;

  update partner_venues set published_at = null
   where id = p_venue_id and published_at is not null;
  if not found then
    raise exception 'not_online';
  end if;

  perform admin_log_venue(p_venue_id, 'venue_unpublished', btrim(p_note));
end;
$$;

revoke all on function admin_unpublish_menu(uuid, text) from public, anon;
grant execute on function admin_unpublish_menu(uuid, text) to authenticated;

-- L'indirizzo si libera solo a menù già ritirato: il vincolo della 729 non
-- ammette un menù online senza indirizzo, e toglierlo mentre i clienti lo
-- stanno usando sarebbe comunque il gesto sbagliato.
create function admin_release_slug(p_venue_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;
  if coalesce(length(btrim(p_note)), 0) = 0 then
    raise exception 'note_required';
  end if;

  select slug into v_slug from partner_venues
   where id = p_venue_id and published_at is null
     for update;
  if not found then
    raise exception 'still_online';
  end if;
  if v_slug is null then
    raise exception 'no_slug';
  end if;

  -- Il trigger della 729 lo mette fra i ritirati: 30 giorni e poi è libero
  update partner_venues set slug = null where id = p_venue_id;

  perform admin_log_venue(p_venue_id, 'slug_released', btrim(p_note));
end;
$$;

revoke all on function admin_release_slug(uuid, text) from public, anon;
grant execute on function admin_release_slug(uuid, text) to authenticated;

COMMIT;


-- ============================================================
-- NOTA — LE STATISTICHE, QUANDO SARÀ IL MOMENTO (20/09, idea dell'utente)
--
-- Quello che un abbonato Pro vorrebbe sapere del suo menù:
--   - quante volte è stato APERTO (e quando: sere, giorni, stagioni);
--   - quali ALLERGIE E INTOLLERANZE selezionano i clienti con il filtro;
--   - quali piatti si aprono di più, e quanti trovano poco da mangiare.
-- Per noi è anche l'unica voce del listino che dà un motivo per pagare OGNI
-- MESE (MONETIZATION.md): l'estetica si sceglie una volta e poi non ci si
-- pensa più.
--
-- ⚠️ PRIMA DEL CODICE VANNO SCIOLTI TRE NODI, e sono di parola data, non
-- tecnici:
--   1. L'INFORMATIVA DICE IL CONTRARIO. Oggi promette «non contiamo le
--      scansioni del QR» e «il ristorante non riceve da noi nessun dato
--      sulle persone che aprono il suo menù». Contare vuol dire riscrivere
--      quelle righe e dire cosa contiamo — non aggiungere una tabella di
--      nascosto.
--   2. LE ALLERGENIE SONO DATI SANITARI (GDPR art. 9). Oggi il filtro gira
--      DENTRO il telefono del cliente e non ce lo manda nessuno: è il motivo
--      per cui quella pagina non ha cookie né analytics. Mandarci anche solo
--      «qualcuno ha filtrato glutine» significa raccogliere una categoria
--      particolare da una persona che non ha un account e non ci ha detto
--      niente. Se si farà: mai righe individuali, solo conteggi aggregati
--      per locale e per periodo, con una soglia sotto la quale non si mostra
--      niente (in una trattoria con tre clienti a sera, «una persona ha
--      filtrato glutine» è una persona sola).
--   3. IL RISTORATORE NON DEVE POTER RISALIRE A NESSUNO. Vale anche per noi:
--      i numeri servono a decidere il menù, non a riconoscere chi è entrato.
--
-- Gli altri nodi (cosa è gratis e cosa Pro, dove si guardano, come si
-- contano le aperture senza rallentare la pagina al tavolo) stanno in
-- DIGITAL_MENU.md, «Statistiche». Finché non si decide, in admin ci si
-- regola con l'ultimo accesso e l'ultima modifica, qui sopra.
-- ============================================================


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select oid::regprocedure from pg_proc
--    where proname = 'get_partner_venues_admin';   -- UNA riga
--   select venue_name, last_sign_in_at, last_edit_at
--     from get_partner_venues_admin(null);          -- da admin, date piene
--   select proname, has_function_privilege('anon', oid, 'execute')
--     from pg_proc where proname in ('admin_unpublish_menu', 'admin_release_slug');
--     -- false, false
-- ============================================================
