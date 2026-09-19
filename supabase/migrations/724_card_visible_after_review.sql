-- ============================================================
-- 724_card_visible_after_review.sql
-- STATO: APPLICATA il 2026-09-19, rivista lo stesso giorno (punti 6-8) e
-- RILANCIATA INTERA: sul database c'è questa versione (verificata). Si può
-- rilanciare ancora — tutto è `create or replace`, con le stesse firme.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- LA SCHEDA COMPARE IN APP SOLO DOPO IL CONTROLLO DEL NOSTRO TEAM.
-- Deciso il 19/09, ragionando su cosa «certifica» davvero che un locale è di
-- chi lo prende. Nessun dato aziendale lo prova da solo: una P.IVA, anche
-- confermata da VIES, dice che l'azienda esiste, non che gestisce QUEL
-- locale. La serietà la danno insieme una persona identificata che DICHIARA
-- per un'azienda e ne risponde, l'abbonamento pagato con la fattura a quella
-- azienda, e l'occhio di una persona del nostro team. Il terzo diventa un
-- cancello: prima di lui in pubblico non esce niente.
--
-- COSA CAMBIA RISPETTO ALLA 721:
--   1. partner_card_visible(): oltre ad abbonamento, collegamento attivo e
--      almeno un piatto, serve reviewed_at (il «visto» dell'admin). I
--      collegamenti decisi dall'admin nascono già visti (trigger della 721).
--   2. partner_link_restaurant(): la P.IVA non confermata NON manda più alla
--      richiesta. Il ristorante si prenota subito — nessun altro lo prende
--      nel frattempo — e la scheda resta «in verifica» finché l'admin non
--      guarda. VIES resta, ma come aiuto ufficiale per l'admin, non come
--      cancello (v. supabase/functions/_shared/company.ts).
--   3. partner_request_restaurant(): di conseguenza la richiesta resta per
--      due soli motivi — ristorante di un altro account, ritorno dopo una
--      revoca.
--   4. Con una richiesta in attesa il locale non si collega ad altro
--      (`request_open`): altrimenti la richiesta restava appesa, e l'admin
--      che la accoglieva trovava il locale già occupato.
--   5. IL VISTO DELL'ADMIN, da dovunque arrivi (segnato su un collegamento
--      o dato nascendo, quando il collegamento lo crea l'admin):
--      - lascia la sua riga nel registro (`card_reviewed`). Le email al
--        ristoratore che arriveranno (passo 6 del piano: «in verifica», «la
--        scheda è pronta», «sospesa: motivo…», «richiesta accolta»)
--        partiranno dal registro, e questo era l'unico momento che non ci
--        finiva;
--      - verifica anche l'AZIENDA del collegamento, se non lo era già: il
--        controllo dell'admin comprende la P.IVA (è il suo scopo). Senza,
--        un'azienda che VIES non conosce restava «da verificare» per sempre,
--        anche dopo l'approvazione — e l'Account del ristoratore lo diceva.
--   6. NESSUNO APPROVA LA PROPRIA ASSOCIAZIONE, NEMMENO UN ADMIN (trovato
--      alla prima prova vera, 19/09): l'utente, che è admin, ha associato il
--      SUO locale dal portale e il collegamento è nato già visto. La regola
--      della 721 guardava solo chi scrive (is_admin()), non per chi. Adesso
--      nasce visto solo se chi lo crea è admin E non è il proprietario del
--      locale: l'admin che collega per conto di un ristoratore, o che
--      accoglie una richiesta. E non si approva nemmeno DOPO: dare il visto
--      al proprio collegamento è rifiutato (`own_review`). Dal SQL editor,
--      dove non c'è un utente, resta possibile: è la strada per le prove.
--   7. Per la stessa ragione un admin non decide una richiesta fatta da sé
--      (`own_request`).
--   8. Il visto su un collegamento già CHIUSO (la coda li comprende: chi
--      collega e scollega in fretta) vuol dire «l'ho guardato», non «questa
--      azienda è a posto»: lascia la riga nel registro ma non verifica
--      l'azienda.
-- Gli errori `company_unverified` non escono più da nessuna parte.
--
-- CREATE OR REPLACE con le stesse firme: i permessi restano quelli della
-- 721 e 723 (anon già tolto). Al 19/09 nessun collegamento sul database:
-- nessuna scheda cambia visibilità.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. LA SCHEDA SI VEDE? (sostituisce la sezione 7 della 721)
-- ------------------------------------------------------------
create or replace function partner_card_visible(p_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from partner_cards c
     where c.id = p_card_id
       and c.status = 'active'
       and c.reviewed_at is not null
       and venue_subscription_active(c.venue_id)
       and exists (select 1 from partner_card_dishes d where d.venue_id = c.venue_id)
  );
$$;


-- ------------------------------------------------------------
-- 2. COLLEGARE: senza il cancello sulla P.IVA
-- Il resto identico alla 721: proprietà, abbonamento, locale libero,
-- ristorante libero, revoca che tiene.
-- ------------------------------------------------------------
create or replace function partner_link_restaurant(
  p_venue_id uuid,
  p_restaurant_id uuid,
  p_company_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_card_id uuid;
  v_holder uuid;
begin
  if v_uid is null
     or not exists (select 1 from partner_venues
                    where id = p_venue_id and owner_user_id = v_uid)
     or not exists (select 1 from partner_companies
                    where id = p_company_id and owner_user_id = v_uid) then
    raise exception 'not_owner';
  end if;

  if not venue_subscription_active(p_venue_id) then
    raise exception 'subscription_required';
  end if;

  if exists (select 1 from partner_cards
             where venue_id = p_venue_id
               and status in ('active', 'paused', 'suspended')) then
    raise exception 'venue_already_linked';
  end if;

  -- Una richiesta in attesa tiene il locale: se ne decide prima.
  if exists (select 1 from partner_card_requests
             where venue_id = p_venue_id and status = 'pending') then
    raise exception 'request_open';
  end if;

  select owner_user_id into v_holder
    from partner_cards
   where restaurant_id = p_restaurant_id
     and status in ('active', 'paused', 'suspended');
  if v_holder = v_uid then
    raise exception 'restaurant_yours';
  elsif v_holder is not null then
    raise exception 'restaurant_taken';
  end if;

  if exists (select 1 from partner_cards
             where restaurant_id = p_restaurant_id
               and owner_user_id = v_uid
               and status = 'revoked') then
    raise exception 'restaurant_revoked';
  end if;

  -- Nasce «da controllare» (trigger della 721): la scheda non si vede finché
  -- l'admin non la segna come vista.
  insert into partner_cards (venue_id, owner_user_id, restaurant_id, company_id)
  values (p_venue_id, v_uid, p_restaurant_id, p_company_id)
  returning id into v_card_id;

  return v_card_id;
end;
$$;


-- ------------------------------------------------------------
-- 3. LA RICHIESTA: due motivi, non più tre
-- ------------------------------------------------------------
create or replace function partner_request_restaurant(
  p_venue_id uuid,
  p_restaurant_id uuid,
  p_company_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_holder uuid;
  v_request_id uuid;
begin
  if v_uid is null
     or not exists (select 1 from partner_venues
                    where id = p_venue_id and owner_user_id = v_uid)
     or not exists (select 1 from partner_companies
                    where id = p_company_id and owner_user_id = v_uid) then
    raise exception 'not_owner';
  end if;

  if not venue_subscription_active(p_venue_id) then
    raise exception 'subscription_required';
  end if;

  if exists (select 1 from partner_cards
             where venue_id = p_venue_id
               and status in ('active', 'paused', 'suspended')) then
    raise exception 'venue_already_linked';
  end if;

  if exists (select 1 from partner_card_requests
             where venue_id = p_venue_id and status = 'pending') then
    raise exception 'request_open';
  end if;

  select owner_user_id into v_holder
    from partner_cards
   where restaurant_id = p_restaurant_id
     and status in ('active', 'paused', 'suspended');
  if v_holder = v_uid then
    raise exception 'restaurant_yours';
  elsif v_holder is null
        and not exists (select 1 from partner_cards
                        where restaurant_id = p_restaurant_id
                          and owner_user_id = v_uid
                          and status = 'revoked') then
    raise exception 'no_request_needed';
  end if;

  insert into partner_card_requests
    (venue_id, owner_user_id, restaurant_id, company_id, message)
  values (p_venue_id, v_uid, p_restaurant_id, p_company_id, btrim(p_message))
  returning id into v_request_id;

  return v_request_id;
end;
$$;

-- ------------------------------------------------------------
-- 4. IL VISTO DELL'ADMIN: registro e azienda verificata
-- Stesso schema degli altri trigger della 721: scrive il database, con
-- l'identità di chi ha dato il visto. Due strade per lo stesso gesto: il
-- visto che arriva su un collegamento esistente (da vuoto a una data), o il
-- collegamento che nasce già visto perché l'ha creato l'admin.
-- ------------------------------------------------------------
create or replace function partner_card_reviewed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into partner_audit_log (actor_user_id, venue_id, restaurant_id, card_id, action, details)
  values (
    auth.uid(),
    new.venue_id,
    new.restaurant_id,
    new.id,
    'card_reviewed',
    jsonb_build_object(
      'status', new.status,
      'company_id', new.company_id,
      'restaurant_name', (select r.name from restaurants r where r.id = new.restaurant_id)
    )
  );

  -- Solo su un collegamento in corso (punto 8)
  if new.status in ('active', 'paused', 'suspended') then
    update partner_companies
       set vat_status = 'admin_verified', vat_checked_at = now()
     where id = new.company_id
       and vat_status not in ('vies_valid', 'admin_verified');
  end if;

  return null;
end;
$$;

create or replace trigger partner_cards_reviewed_on_insert
  after insert on partner_cards
  for each row when (new.reviewed_at is not null)
  execute function partner_card_reviewed();
create or replace trigger partner_cards_reviewed_on_update
  after update on partner_cards
  for each row when (old.reviewed_at is null and new.reviewed_at is not null)
  execute function partner_card_reviewed();


-- ------------------------------------------------------------
-- 5. CHI NASCE GIÀ VISTO (sostituisce il trigger della 721, punto 6 sopra)
-- ------------------------------------------------------------
create or replace function partner_cards_set_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() and auth.uid() is distinct from new.owner_user_id then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  else
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;


-- ------------------------------------------------------------
-- 6. LA GUARDIA DEL COLLEGAMENTO (sostituisce quella della 721): in più,
-- il visto non si dà al proprio collegamento. auth.uid() è vuoto nel SQL
-- editor e nel service role: lì passa.
-- ------------------------------------------------------------
create or replace function partner_cards_guard()
returns trigger
language plpgsql
as $$
begin
  -- L'unica cosa che su una riga chiusa si può ancora scrivere è il
  -- «visto» dell'admin: la coda comprende anche i collegamenti chiusi.
  if old.status in ('revoked', 'unlinked')
     and (to_jsonb(new) - 'reviewed_at' - 'reviewed_by' - 'updated_at')
         is distinct from
         (to_jsonb(old) - 'reviewed_at' - 'reviewed_by' - 'updated_at') then
    raise exception 'card_closed'
      using hint = 'Un collegamento chiuso resta com''è: se ne apre uno nuovo.';
  end if;

  if (new.venue_id, new.owner_user_id, new.restaurant_id, new.company_id)
     is distinct from
     (old.venue_id, old.owner_user_id, old.restaurant_id, old.company_id) then
    raise exception 'card_identity_immutable';
  end if;

  if old.reviewed_at is null and new.reviewed_at is not null
     and auth.uid() = new.owner_user_id then
    raise exception 'own_review'
      using hint = 'Il visto al proprio collegamento non si dà: lo dà un altro admin.';
  end if;

  if new.status is distinct from old.status then
    new.status_changed_at := now();
    -- La nota di una sospensione non deve sopravvivere alla riattivazione:
    -- se chi cambia stato non ne scrive una nuova, la vecchia se ne va.
    if new.status_note is not distinct from old.status_note then
      new.status_note := null;
    end if;
  end if;

  return new;
end;
$$;


-- ------------------------------------------------------------
-- 7. LA DECISIONE SU UNA RICHIESTA (sostituisce quella della 721): in più,
-- non sulla propria. E non verifica più l'azienda da sé: il collegamento
-- che crea nasce visto (punto 5), e il visto la verifica (punto 4) — un
-- posto solo invece di due.
-- ------------------------------------------------------------
create or replace function admin_decide_card_request(
  p_request_id uuid,
  p_accept boolean,
  p_note text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  r partner_card_requests;
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  select * into r
    from partner_card_requests
   where id = p_request_id and status = 'pending'
   for update;
  if not found then
    raise exception 'invalid_state';
  end if;

  if r.owner_user_id = auth.uid() then
    raise exception 'own_request';
  end if;

  if p_accept then
    update partner_cards
       set status = 'revoked', status_note = p_note
     where restaurant_id = r.restaurant_id
       and status in ('active', 'paused', 'suspended');

    insert into partner_cards (venue_id, owner_user_id, restaurant_id, company_id)
    values (r.venue_id, r.owner_user_id, r.restaurant_id, r.company_id);
  end if;

  update partner_card_requests
     set status = case when p_accept then 'accepted' else 'rejected' end,
         decision_note = p_note,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_request_id;
end;
$$;

COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select position('reviewed_at' in prosrc) > 0 from pg_proc
--    where proname = 'partner_card_visible';                     -- true
--   select position('company_unverified' in prosrc) > 0 from pg_proc
--    where proname = 'partner_link_restaurant';                  -- false
--   select proname, proacl from pg_proc
--    where proname in ('partner_link_restaurant', 'partner_request_restaurant',
--                      'partner_card_visible');                  -- anon solo su visible
--   select tgname from pg_trigger where tgname like 'partner_cards_reviewed%';  -- due
--   select position('owner_user_id' in prosrc) > 0 from pg_proc
--    where proname = 'partner_cards_set_review';                 -- true
-- ============================================================
