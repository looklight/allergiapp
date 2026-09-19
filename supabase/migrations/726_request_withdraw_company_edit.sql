-- ============================================================
-- 726_request_withdraw_company_edit.sql
-- STATO: APPLICATA il 2026-09-19 e verificata (funzione di ritiro, quarto
-- stato, trigger sulle aziende, registro). Tracking fermo alla 045: a mano,
-- MAI db push.
--
-- DUE PEZZI CHE CHIUDONO IL GIRO DEL PORTALE (19/09), prima della prova con
-- un secondo account e prima della scheda nell'app.
--
--   A. RITIRARE UNA RICHIESTA. Chi chiedeva al nostro team un ristorante
--      già gestito (o il ritorno dopo una revoca) poteva solo aspettare la
--      decisione: una richiesta in attesa tiene il locale (724), quindi
--      anche un ripensamento restava bloccato fino a noi.
--
--   B. MODIFICARE I DATI AZIENDALI. La scrittura resta della funzione sul
--      server (il ristoratore la tabella la legge soltanto, 721), che rifà
--      i controlli. Qui le conseguenze, dove devono stare perché valgano
--      comunque si arrivi alla modifica:
--      - ogni modifica lascia la sua riga nel registro, sul locale di ogni
--        associazione in corso di quell'azienda (lo storico dell'admin è
--        per locale);
--      - se cambiano P.IVA o paese, le associazioni in corso di
--        quell'azienda TORNANO DA APPROVARE, e quindi non si vedono finché
--        l'admin non le riguarda. Senza, ci si farebbe approvare con una
--        P.IVA vera e poi la si cambierebbe. La ragione sociale no: si
--        corregge (un refuso, una forma giuridica) senza fermare niente.
-- ============================================================

BEGIN;

-- ============================================================
-- A. RITIRARE UNA RICHIESTA
-- ============================================================

-- Un quarto stato. Ritirata non ha bisogno di motivo: la decisione è di chi
-- l'aveva chiesta, e una riga «perché ho cambiato idea» non la legge
-- nessuno. decided_at segna comunque quando è finita.
alter table partner_card_requests drop constraint partner_card_requests_status_check;
alter table partner_card_requests add constraint partner_card_requests_status_check
  check (status in ('pending', 'accepted', 'rejected', 'withdrawn'));

alter table partner_card_requests drop constraint partner_card_requests_decision;
alter table partner_card_requests add constraint partner_card_requests_decision check (
  status = 'pending'
  or (status = 'withdrawn' and decided_at is not null)
  or (coalesce(length(btrim(decision_note)), 0) > 0 and decided_at is not null)
);

-- Solo la propria, solo se ancora in attesa. Da lì il locale è libero:
-- può associarsi a un altro ristorante o chiedere di nuovo.
create function partner_withdraw_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update partner_card_requests
     set status = 'withdrawn', decided_at = now()
   where id = p_request_id
     and owner_user_id = auth.uid()
     and status = 'pending';

  if not found then
    raise exception 'invalid_state';
  end if;
end;
$$;

revoke all on function partner_withdraw_request(uuid) from public, anon;
grant execute on function partner_withdraw_request(uuid) to authenticated;

-- Il registro distingue il ritiro dalla decisione dell'admin (sostituisce
-- la funzione della 721): sono due gesti di due persone diverse, e le email
-- future (passo 6) partiranno solo dal secondo.
create or replace function partner_audit_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into partner_audit_log (actor_user_id, venue_id, restaurant_id, action, details)
  values (
    auth.uid(),
    new.venue_id,
    new.restaurant_id,
    case
      when tg_op = 'INSERT' then 'request_created'
      when new.status = 'withdrawn' then 'request_withdrawn'
      else 'request_decided'
    end,
    jsonb_build_object(
      'request_id', new.id,
      'status', new.status,
      'decision_note', new.decision_note,
      'company_id', new.company_id,
      'restaurant_name', (select r.name from restaurants r where r.id = new.restaurant_id)
    )
  );
  return null;
end;
$$;


-- ============================================================
-- B. QUANDO CAMBIANO I DATI DI UN'AZIENDA
-- ============================================================
create function partner_company_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identita boolean :=
    (new.country_code, new.vat_number) is distinct from (old.country_code, old.vat_number);
begin
  -- Una riga per ogni associazione in corso: lo storico dell'admin si
  -- guarda per locale, e la stessa azienda può tenerne più d'uno.
  insert into partner_audit_log (actor_user_id, venue_id, restaurant_id, card_id, action, details)
  select auth.uid(),
         c.venue_id,
         c.restaurant_id,
         c.id,
         'company_changed',
         jsonb_build_object(
           'company_id', new.id,
           'from', jsonb_build_object(
             'legal_name', old.legal_name,
             'vat', old.country_code || ' ' || old.vat_number),
           'to', jsonb_build_object(
             'legal_name', new.legal_name,
             'vat', new.country_code || ' ' || new.vat_number),
           'back_to_review', v_identita,
           'restaurant_name', (select r.name from restaurants r where r.id = c.restaurant_id)
         )
    from partner_cards c
   where c.company_id = new.id
     and c.status in ('active', 'paused', 'suspended');

  -- P.IVA o paese diversi: un'azienda diversa agli occhi del controllo, e
  -- l'approvazione di prima non vale più.
  if v_identita then
    update partner_cards
       set reviewed_at = null, reviewed_by = null
     where company_id = new.id
       and status in ('active', 'paused', 'suspended')
       and reviewed_at is not null;
  end if;

  return null;
end;
$$;

create trigger partner_companies_changed
  after update on partner_companies
  for each row when (
    (old.legal_name, old.country_code, old.vat_number)
    is distinct from
    (new.legal_name, new.country_code, new.vat_number))
  execute function partner_company_changed();

COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select to_regprocedure('partner_withdraw_request(uuid)');
--   select tgname from pg_trigger where tgname = 'partner_companies_changed';
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conname = 'partner_card_requests_status_check';   -- con 'withdrawn'
-- ============================================================
