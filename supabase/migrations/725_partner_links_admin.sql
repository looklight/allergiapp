-- ============================================================
-- 725_partner_links_admin.sql
-- STATO: APPLICATA il 2026-09-19 e RILANCIATA INTERA lo stesso giorno con la
-- sezione 3 (gli iscritti senza locale): sul database c'è questa versione
-- (verificata). Si può rilanciare — tutto è `create or replace`.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- QUELLO CHE L'ADMIN DEVE VEDERE PER DECIDERE (parte 3 del collegamento:
-- la pagina «Associazioni» della dashboard, branch admin-prod).
--
-- Due funzioni di SOLA LETTURA, sul modello di get_partner_venues_admin
-- (717), e per le stesse ragioni: l'email del ristoratore sta in auth.users
-- e dal browser non si legge; e quello che serve a decidere sta in cinque
-- tabelle (collegamento, locale, iscritto, azienda, ristorante), che dal
-- browser vorrebbero dire cinque interrogazioni e le cuciture a mano.
--
-- I GESTI no: dare il visto, sospendere, revocare, scollegare sono scritture
-- normali su partner_cards, che la policy admin della 721 consente e che i
-- trigger controllano (motivo obbligatorio, nessuna autoapprovazione) e
-- registrano. Decidere una richiesta passa da admin_decide_card_request
-- (721, 724). Una funzione che scrive col permesso del definitore sarebbe
-- una porta in più da sorvegliare (stessa scelta della 717).
--
-- Il registro per locale si legge direttamente: partner_audit_log ha già la
-- sua policy di lettura per l'admin.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. I COLLEGAMENTI, tutti: quelli da controllare, quelli in corso, lo
-- storico. Uno per riga, il più recente in cima; filtra la pagina.
-- ------------------------------------------------------------
create or replace function get_partner_cards_admin()
returns table (
  card_id uuid,
  status text,
  status_note text,
  status_changed_at timestamptz,
  created_at timestamptz,
  reviewed_at timestamptz,
  -- Si vede nell'app adesso? (partner_card_visible: abbonamento, visto,
  -- almeno un piatto). Per l'admin che si chiede «è online?».
  visible boolean,
  subscription_active boolean,
  card_dishes_total bigint,
  venue_id uuid,
  venue_name text,
  owner_user_id uuid,
  first_name text,
  last_name text,
  email varchar,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_slug text,
  restaurant_address text,
  company_id uuid,
  legal_name text,
  country_code text,
  vat_number text,
  vat_status text,
  vies_name text,
  -- ⚠️ Per una ditta individuale è spesso la casa del titolare: si mostra
  -- solo qui, non si esporta (MONETIZATION.md, 19/09).
  vies_address text,
  vat_checked_at timestamptz,
  -- IL SEGNALE: quanti ALTRI account hanno dichiarato la stessa P.IVA. Non
  -- è un errore (titolare e gestore, due sedi), ma va guardato (700, 721).
  same_vat_other_accounts bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.status,
    c.status_note,
    c.status_changed_at,
    c.created_at,
    c.reviewed_at,
    partner_card_visible(c.id),
    venue_subscription_active(c.venue_id),
    (select count(*) from partner_card_dishes cd where cd.venue_id = c.venue_id),
    v.id,
    v.name,
    c.owner_user_id,
    a.first_name,
    a.last_name,
    u.email::varchar,
    r.id,
    r.name,
    r.slug,
    r.address,
    co.id,
    co.legal_name,
    co.country_code,
    co.vat_number,
    co.vat_status,
    co.vies_name,
    co.vies_address,
    co.vat_checked_at,
    (select count(distinct o.owner_user_id)
       from partner_companies o
      where o.country_code = co.country_code
        and o.vat_number = co.vat_number
        and o.owner_user_id <> co.owner_user_id)
  from partner_cards c
  join partner_venues v on v.id = c.venue_id
  join partner_accounts a on a.user_id = c.owner_user_id
  join auth.users u on u.id = c.owner_user_id
  join restaurants r on r.id = c.restaurant_id
  join partner_companies co on co.id = c.company_id
  where is_admin()
  order by c.created_at desc;
$$;


-- ------------------------------------------------------------
-- 2. LE RICHIESTE, con accanto chi tiene oggi il ristorante: la decisione
-- è un confronto fra due aziende (nodo 2), e le due vanno viste insieme.
-- Chi le tiene NON è stato avvisato della richiesta (nodo 2): questa
-- pagina è l'unico posto dove i due nomi stanno vicini.
-- ------------------------------------------------------------
create or replace function get_partner_requests_admin()
returns table (
  request_id uuid,
  status text,
  message text,
  decision_note text,
  created_at timestamptz,
  decided_at timestamptz,
  venue_id uuid,
  venue_name text,
  owner_user_id uuid,
  first_name text,
  last_name text,
  email varchar,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_slug text,
  restaurant_address text,
  legal_name text,
  country_code text,
  vat_number text,
  vat_status text,
  vies_name text,
  vies_address text,
  -- Il motivo della richiesta, detto dal database e non indovinato dalla
  -- pagina: 'taken' se il ristorante ha un gestore in corso, altrimenti
  -- 'revoked' (era stato tolto proprio a chi chiede).
  reason text,
  holder_venue_name text,
  holder_first_name text,
  holder_last_name text,
  holder_email varchar,
  holder_legal_name text,
  holder_vat_number text,
  holder_since timestamptz,
  holder_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id,
    q.status,
    q.message,
    q.decision_note,
    q.created_at,
    q.decided_at,
    v.id,
    v.name,
    q.owner_user_id,
    a.first_name,
    a.last_name,
    u.email::varchar,
    r.id,
    r.name,
    r.slug,
    r.address,
    co.legal_name,
    co.country_code,
    co.vat_number,
    co.vat_status,
    co.vies_name,
    co.vies_address,
    case when h.id is not null then 'taken' else 'revoked' end,
    hv.name,
    ha.first_name,
    ha.last_name,
    hu.email::varchar,
    hc.legal_name,
    hc.vat_number,
    h.created_at,
    h.status
  from partner_card_requests q
  join partner_venues v on v.id = q.venue_id
  join partner_accounts a on a.user_id = q.owner_user_id
  join auth.users u on u.id = q.owner_user_id
  join restaurants r on r.id = q.restaurant_id
  join partner_companies co on co.id = q.company_id
  -- Il gestore IN CORSO del ristorante, se c'è (uno solo: indice della 721)
  left join partner_cards h
    on h.restaurant_id = q.restaurant_id
   and h.status in ('active', 'paused', 'suspended')
  left join partner_venues hv on hv.id = h.venue_id
  left join partner_accounts ha on ha.user_id = h.owner_user_id
  left join auth.users hu on hu.id = h.owner_user_id
  left join partner_companies hc on hc.id = h.company_id
  where is_admin()
  order by (q.status = 'pending') desc, q.created_at desc;
$$;



-- ------------------------------------------------------------
-- 3. GLI ISCRITTI SENZA NEMMENO UN LOCALE (richiesta dell'utente, 19/09).
-- La pagina Partner ha una riga per locale (717), e chi si è fermato al
-- primo passo lì compariva solo come numero. Sono le persone più utili da
-- ricontattare: si sono iscritte e non hanno cominciato.
-- ------------------------------------------------------------
create or replace function get_partner_accounts_without_venue_admin()
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  email varchar,
  phone text,
  signed_up_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.user_id, a.first_name, a.last_name, u.email::varchar, a.phone, a.created_at
    from partner_accounts a
    join auth.users u on u.id = a.user_id
   where is_admin()
     and not exists (select 1 from partner_venues v where v.owner_user_id = a.user_id)
   order by a.created_at desc;
$$;

-- Su Supabase «from public» non basta: anon ha EXECUTE per nome (723).
revoke all on function get_partner_cards_admin() from public, anon;
revoke all on function get_partner_requests_admin() from public, anon;
revoke all on function get_partner_accounts_without_venue_admin() from public, anon;
grant execute on function get_partner_cards_admin() to authenticated;
grant execute on function get_partner_requests_admin() to authenticated;
grant execute on function get_partner_accounts_without_venue_admin() to authenticated;

COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select to_regprocedure('get_partner_cards_admin()'),
--          to_regprocedure('get_partner_requests_admin()'),
--          to_regprocedure('get_partner_accounts_without_venue_admin()');
-- Dall'admin: la pagina Associazioni mostra il collegamento di prova.
-- ============================================================
