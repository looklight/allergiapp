-- ============================================================
-- 721_venue_restaurant_link.sql
-- STATO: DA APPLICARE via SQL editor. Tracking fermo alla 045: a mano,
-- MAI db push.
--
-- IL COLLEGAMENTO FRA LOCALE E RISTORANTE (parte 1 di 4: database).
-- Design chiuso il 2026-09-17, in MONETIZATION.md «Associazione locale ↔
-- ristorante». Dopo questa vengono il portale (2), l'admin (3) e l'app (4).
--
-- Al 18/09 sul database: 0 schede, 0 claim, 0 aziende, 0 righe di
-- registro. Nessuno fuori dal portale legge queste tabelle, e il portale
-- legge solo `partner_cards(id)` dei propri locali. Si cambia a costo zero,
-- ed è l'ultima volta: dal giorno che l'app legge le schede, ogni modifica
-- qui vuole un cambio coordinato con una build nativa.
--
-- ------------------------------------------------------------
-- IN SINTESI
--   1. partner_claims se ne va: doppione di partner_cards, mai usato.
--   2. partner_companies: via sede ed email di fatturazione (stanno a
--      Stripe), dentro nome e sede restituiti da VIES. Il gestore la
--      LEGGE e basta: la scrive la funzione sul server che parla con VIES.
--   3. partner_cards diventa il collegamento: cinque stati, lo storico
--      non si cancella, un solo collegamento vivo per ristorante E per
--      locale, l'azienda che l'ha dichiarato.
--   4. Il gestore non scrive più la riga: collega, mette in pausa,
--      riattiva, scollega e chiede un ristorante conteso da funzioni
--      che controllano. Chiude la falla della 703 (FOR ALL sul gestore,
--      che poteva scriversi 'published').
--   5. partner_card_requests: la strada per tutto quello che non fila
--      liscio — ristorante già gestito da un altro account, P.IVA che VIES
--      non conferma, ritorno dopo una revoca. Decide l'admin a mano.
--   6. Il registro lo scrive il DATABASE, con dei trigger: ogni cambio
--      di collegamenti, richieste e abbonamenti lascia la sua riga,
--      chiunque lo faccia (gestore, admin, webhook di Stripe).
--   7. «La scheda si vede?» ha una risposta sola: partner_card_visible().
--   8. Via le sei letture pubbliche sulle tabelle grezze: l'app leggerà
--      la scheda da una funzione sola, come il sito legge il menù.
--   9. Un ristorante con un collegamento in corso non si cancella.
--
-- ------------------------------------------------------------
-- L'ADMIN SCRIVE DIRETTAMENTE, come per gli abbonamenti (717): sospendere,
-- revocare, collegare per conto di qualcuno sono UPDATE e INSERT sotto la
-- sua policy. Il motivo obbligatorio lo impone un CHECK, il registro i
-- trigger: nessuna delle due cose dipende dal fatto che l'admin se ne
-- ricordi. L'unica funzione dell'admin è la decisione sulle richieste,
-- perché lì due scritture devono riuscire insieme o per niente — ed è
-- SECURITY INVOKER: gira coi permessi dell'admin, non ne aggiunge.
--
-- ⚠️ DOPO L'APPLICAZIONE, nell'admin (branch admin-prod): `registra()` in
-- partners/page.tsx inserisce da sé nel registro. Da qui la policy che
-- glielo permetteva non c'è più, quindi l'insert fallisce — in silenzio,
-- per scelta di chi l'ha scritta (console.error, il gesto va a buon fine).
-- Le stesse righe le scrive ora il trigger. Va tolta nella parte 3.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. VIA partner_claims
-- Nato nella 700 per dire «persona → azienda → ristorante», con gli
-- stati del contro-claim automatico. Nella 703 lo stesso mestiere l'ha
-- preso partner_cards, e il contro-claim automatico è stato sostituito
-- dalla decisione dell'admin (nodo 2). Vuoto, mai letto né scritto dal
-- codice: due tabelle che dicono quasi la stessa cosa sono la ricetta
-- per confondersi.
-- Prima la colonna del registro che lo referenzia, poi la tabella (che
-- si porta via policy, indici e trigger).
-- ============================================================
alter table partner_audit_log drop column claim_id;
drop table partner_claims;

-- Il vincolo porta ancora il nome della vetrina (700), sopravvissuto al
-- rename della 703: un nome che mente a chi legge lo schema.
alter table partner_audit_log
  rename constraint partner_audit_log_showcase_id_fkey to partner_audit_log_venue_id_fkey;


-- ============================================================
-- 2. L'AZIENDA
-- Chiesta al collegamento (sempre, anche con l'abbonamento regalato), una
-- volta per azienda e riusata sui locali successivi.
-- ============================================================

-- Sede ed email di fatturazione le raccoglie e le tiene Stripe al
-- checkout (deciso il 17/09): qui sarebbero una seconda copia destinata a
-- divergere. Il codice SdI e il cliente Stripe seguono la stessa strada:
-- il primo si decide con lo strumento di fatturazione (passo 4 del
-- piano), il secondo sta già su partner_subscriptions.
alter table partner_companies
  drop column address,
  drop column billing_email,
  drop column sdi_code,
  drop column stripe_customer_id;

-- Quello che VIES dice dell'azienda: in admin sta accanto al nome del
-- locale, ed è il modo più veloce di accorgersi che «Trattoria da Mario»
-- ha dichiarato la P.IVA di una ferramenta.
alter table partner_companies
  add column vies_name text,
  add column vies_address text;

-- ⚠️ «VIES NON LA TROVA» NON VUOL DIRE «NON ESISTE» (18/09, cambia la
-- regola del 17/09). In Italia una P.IVA entra in VIES solo se l'azienda
-- ha chiesto di fare scambi con altri paesi UE: la trattoria che compra e
-- vende in Italia di solito non l'ha fatto, e VIES la dà per non valida.
-- Stesso discorso in Spagna. Bloccare lì avrebbe lasciato fuori la
-- maggior parte dei ristoratori veri.
-- Quindi quattro esiti, e solo due fanno collegare da soli:
--   vies_valid      confermata da VIES                     → collega
--   admin_verified  controllata a mano dall'admin          → collega
--   vies_not_found  VIES non la conosce                    → richiesta all'admin
--   unverified      VIES non ha risposto, o azienda fuori UE → richiesta all'admin
-- Gli errori di battitura li ferma prima la funzione sul server, con la
-- cifra di controllo che la P.IVA italiana ha già: quella non chiede
-- niente a nessuno.
alter table partner_companies drop constraint partner_companies_vat_status_check;
alter table partner_companies add constraint partner_companies_vat_status_check
  check (vat_status in ('unverified', 'vies_valid', 'vies_not_found', 'admin_verified'));

-- La P.IVA si salva in una forma sola — maiuscole, niente spazi né
-- punteggiatura — o l'unicità qui sotto la aggira uno spazio. Il
-- prefisso del paese (che sta in country_code) lo toglie la funzione
-- VIES prima di scrivere: il vincolo non può controllarlo, perché non
-- sempre coincide col codice del paese (la Grecia è EL, non GR).
alter table partner_companies add constraint partner_companies_vat_normalized
  check (vat_number ~ '^[A-Z0-9]+$');

-- La stessa azienda, per lo stesso account, esiste una volta sola. NON
-- globale: due account che dichiarano la stessa P.IVA sono proprio il
-- segnale che l'admin deve vedere (700), non un errore da nascondere.
alter table partner_companies add constraint partner_companies_one_per_owner
  unique (owner_user_id, country_code, vat_number);

-- Coppia referenziabile: è quella che rende IMPOSSIBILE collegare un
-- locale a nome dell'azienda di un altro account, per vincolo e non per
-- controllo applicativo (stesso schema della 700 per i piatti).
alter table partner_companies add constraint partner_companies_id_owner_key
  unique (id, owner_user_id);

-- Il gestore legge, non scrive: con FOR ALL potrebbe segnarsi da solo
-- vat_status = 'vies_valid'. Scrive la funzione sul server che parla con
-- VIES (service role, fuori dalla RLS); corregge l'admin.
drop policy partner_companies_owner on partner_companies;
create policy partner_companies_owner_read on partner_companies
  for select using (owner_user_id = auth.uid());


-- ============================================================
-- 3. IL COLLEGAMENTO
-- partner_cards resta il nome: la riga è «la scheda di questo ristorante,
-- tenuta da questo locale». Quando si vede lo decide la sezione 7, non
-- una colonna.
-- ============================================================

drop policy partner_cards_owner on partner_cards;
drop policy partner_cards_public_read on partner_cards;

-- Gli stati. 'published' ed 'expired' spariscono: erano la visibilità
-- scritta a mano, che adesso si calcola (nodo 1). 'draft' pure: la scheda
-- si prepara sul locale (715), non c'è più niente da tenere in bozza qui.
--   active     collegato
--   paused     messo in pausa dal gestore (anche: menù appena cambiato)
--   suspended  sospeso dall'admin, con motivo (DSA art. 17)
--   revoked    tolto dall'admin, con motivo. Chiuso.
--   unlinked   scollegato (dal gestore o dall'admin). Chiuso.
-- Le righe chiuse NON si cancellano: sono lo storico, ed è anche quello
-- che fa ricomparire le risposte alle recensioni a chi ricollega lo
-- stesso ristorante.
alter table partner_cards drop constraint partner_cards_status_check;
alter table partner_cards alter column status set default 'active';
alter table partner_cards add constraint partner_cards_status_check
  check (status in ('active', 'paused', 'suspended', 'revoked', 'unlinked'));

-- La nota non è più solo della sospensione: accompagna ogni decisione
-- dell'admin, e il gestore la legge nel portale.
alter table partner_cards rename column suspension_note to status_note;

-- Sospendere e revocare senza dire perché non si può (DSA art. 17). Il
-- coalesce non è pedanteria: su NULL un CHECK passa.
alter table partner_cards add constraint partner_cards_note_on_admin_action
  check (status not in ('suspended', 'revoked')
         or coalesce(length(btrim(status_note)), 0) > 0);

-- L'azienda che ha dichiarato il collegamento. Obbligatoria, e dello
-- stesso account del locale (coppia della sezione 2). Nessun CASCADE:
-- un'azienda con collegamenti sopra non si cancella per sbaglio. Quando
-- se ne va l'intero account, locale e schede se ne vanno nella stessa
-- istruzione e il vincolo, controllato alla fine, è rispettato.
alter table partner_cards add column company_id uuid not null;
alter table partner_cards add constraint partner_cards_company_fkey
  foreign key (company_id, owner_user_id)
  references partner_companies (id, owner_user_id);

-- UN SOLO COLLEGAMENTO VIVO per ristorante (un gestore) e per locale (un
-- posto fisico è un ristorante; cambiare = scollegare e ricollegare).
-- Vivo = active, paused, suspended: un sospeso tiene il posto finché
-- l'admin non decide. Le righe chiuse coesistono senza limiti.
drop index partner_cards_one_per_restaurant;
create unique index partner_cards_one_live_per_restaurant
  on partner_cards (restaurant_id)
  where status in ('active', 'paused', 'suspended');
create unique index partner_cards_one_live_per_venue
  on partner_cards (venue_id)
  where status in ('active', 'paused', 'suspended');
-- Per lo storico di un ristorante (chi l'ha avuto, chi è stato revocato).
create index partner_cards_restaurant_idx on partner_cards (restaurant_id);

-- Serviva ai piatti accesi, che dalla 715 stanno sul locale.
alter table partner_cards drop constraint partner_cards_id_owner_key;

-- Il gestore vede i suoi, storico compreso (anche la nota dell'admin).
create policy partner_cards_owner_read on partner_cards
  for select using (owner_user_id = auth.uid());

-- LA RIGA NON CAMBIA IDENTITÀ, E UNA RIGA CHIUSA NON RIAPRE.
-- Cambiare ristorante, locale o azienda sarebbe un collegamento nuovo
-- travestito da vecchio, con lo storico che mente. Riaprire un 'revoked'
-- vorrebbe dire annullare una decisione senza lasciarne traccia: si apre
-- una riga nuova, e il registro lo racconta.
create function partner_cards_guard()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('revoked', 'unlinked') then
    raise exception 'card_closed'
      using hint = 'Un collegamento chiuso resta com''è: se ne apre uno nuovo.';
  end if;

  if (new.venue_id, new.owner_user_id, new.restaurant_id, new.company_id)
     is distinct from
     (old.venue_id, old.owner_user_id, old.restaurant_id, old.company_id) then
    raise exception 'card_identity_immutable';
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

create trigger partner_cards_guard
  before update on partner_cards
  for each row execute function partner_cards_guard();

-- UN RISTORANTE COLLEGATO NON SI CANCELLA. Chi l'ha aggiunto dall'app può
-- cancellarlo (policy «Users can delete restaurants they added»), e il
-- controllo dell'app guarda restaurants.owner_id, la colonna di marzo che
-- il collegamento non usa. Senza questo blocco: il cliente che l'ha
-- aggiunto toglie la sua recensione — spesso l'unica — poi il ristorante,
-- e il CASCADE si porta via il collegamento di chi paga, senza che nessuno
-- glielo dica. Vale anche per l'admin: prima si scollega con un motivo,
-- che il gestore legge, poi si cancella. Le righe chiuse no: quelle il
-- CASCADE le può portare via insieme al ristorante.
-- SECURITY DEFINER perché chi cancella dall'app partner_cards non la vede:
-- senza, l'exists qui sotto risponderebbe sempre «nessuno».
create function restaurants_guard_partner_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from partner_cards
             where restaurant_id = old.id
               and status in ('active', 'paused', 'suspended')) then
    raise exception 'restaurant_has_partner'
      using hint = 'Il ristorante è collegato a un locale partner: prima si scollega.';
  end if;
  return old;
end;
$$;

create trigger restaurants_guard_partner_link
  before delete on restaurants
  for each row execute function restaurants_guard_partner_link();


-- ============================================================
-- 4. LE RICHIESTE ALL'ADMIN
-- Tre casi, una strada: il ristorante è già gestito da un altro account
-- (nodo 2: il gestore attuale non è avvisato della richiesta, solo della
-- decisione), la P.IVA non è confermata (sezione 2), o il ristorante era
-- stato revocato proprio a chi chiede. Il motivo non si salva: si legge
-- dai dati, che l'admin ha davanti comunque.
-- Un'altra tabella e non uno stato in più su partner_cards:
-- una richiesta non è un collegamento, e non deve mai poter contare come
-- tale in un indice o in una lettura.
-- ============================================================
create table partner_card_requests (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null,
  owner_user_id uuid not null,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  company_id uuid not null,
  message text not null
    check (length(btrim(message)) between 1 and 2000),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  decision_note text,
  decided_by uuid references auth.users(id) on delete set null,
    -- auth.users e non partner_accounts: decide un admin (come nel registro)
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (venue_id, owner_user_id)
    references partner_venues (id, owner_user_id) on delete cascade,
  foreign key (company_id, owner_user_id)
    references partner_companies (id, owner_user_id),

  -- Una decisione senza motivo non si manda a nessuno.
  constraint partner_card_requests_decision check (
    status = 'pending'
    or (coalesce(length(btrim(decision_note)), 0) > 0 and decided_at is not null)
  )
);

-- Una richiesta aperta per locale: un locale vuole un ristorante solo.
create unique index partner_card_requests_one_open_per_venue
  on partner_card_requests (venue_id)
  where status = 'pending';
create index partner_card_requests_restaurant_idx
  on partner_card_requests (restaurant_id);

create trigger set_updated_at before update on partner_card_requests
  for each row execute function update_updated_at();

alter table partner_card_requests enable row level security;

create policy partner_card_requests_owner_read on partner_card_requests
  for select using (owner_user_id = auth.uid());
create policy partner_card_requests_admin on partner_card_requests
  for all using (is_admin()) with check (is_admin());


-- ============================================================
-- 5. IL REGISTRO LO SCRIVE IL DATABASE
-- Fino a oggi scriveva chi agiva, con una policy che lo lasciava fare a
-- qualunque utente autenticato — anche dell'app, anche su locali non
-- suoi. E un registro che dipende dal fatto che il codice si ricordi di
-- scriverlo manca proprio le righe che servono. Da qui: trigger, con
-- l'identità di chi ha fatto la modifica (NULL = il sistema, cioè il
-- webhook di Stripe o il giro notturno). Legge solo l'admin, come prima.
-- ============================================================
drop policy partner_audit_insert on partner_audit_log;

create index partner_audit_log_venue_idx on partner_audit_log (venue_id);

create function partner_audit_card()
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
    case tg_op when 'INSERT' then 'card_created' else 'card_status_changed' end,
    jsonb_build_object(
      'from', case when tg_op = 'UPDATE' then old.status end,
      'to', new.status,
      'note', new.status_note,
      'company_id', new.company_id,
      -- Il nome si fotografa adesso: se il ristorante sparisce dall'app,
      -- restaurant_id qui diventa NULL e resterebbe una riga muta.
      'restaurant_name', (select r.name from restaurants r where r.id = new.restaurant_id)
    )
  );
  return null;
end;
$$;

create trigger partner_cards_audit_insert
  after insert on partner_cards
  for each row execute function partner_audit_card();
create trigger partner_cards_audit_status
  after update on partner_cards
  for each row when (old.status is distinct from new.status)
  execute function partner_audit_card();

create function partner_audit_request()
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
    case tg_op when 'INSERT' then 'request_created' else 'request_decided' end,
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

create trigger partner_card_requests_audit_insert
  after insert on partner_card_requests
  for each row execute function partner_audit_request();
create trigger partner_card_requests_audit_status
  after update on partner_card_requests
  for each row when (old.status is distinct from new.status)
  execute function partner_audit_request();

-- GLI ABBONAMENTI, per la stessa ragione. Concessione e revoca dall'admin,
-- pagamento, rinnovo e disdetta dal webhook: tutto quello che cambia se,
-- fino a quando, o se è stato disdetto. Il rinnovo mensile lascia una riga
-- al mese per locale: è la storia dei pagamenti, non rumore.
create function partner_audit_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into partner_audit_log (actor_user_id, venue_id, action, details)
  values (
    auth.uid(),
    new.venue_id,
    case tg_op when 'INSERT' then 'subscription_created' else 'subscription_changed' end,
    jsonb_build_object(
      'subscription_id', new.id,
      'source', new.source,
      'plan', new.plan,
      'status', new.status,
      'ends_at', new.ends_at,
      'cancel_at_period_end', new.cancel_at_period_end,
      'note', new.note
    )
    || case when tg_op = 'UPDATE' then jsonb_build_object('from', jsonb_build_object(
         'status', old.status,
         'ends_at', old.ends_at,
         'cancel_at_period_end', old.cancel_at_period_end))
       else '{}'::jsonb end
  );
  return null;
end;
$$;

create trigger partner_subscriptions_audit_insert
  after insert on partner_subscriptions
  for each row execute function partner_audit_subscription();
create trigger partner_subscriptions_audit_change
  after update on partner_subscriptions
  for each row when (
    (old.status, old.ends_at, old.cancel_at_period_end)
    is distinct from
    (new.status, new.ends_at, new.cancel_at_period_end))
  execute function partner_audit_subscription();


-- ============================================================
-- 6. I GESTI DEL GESTORE
-- SECURITY DEFINER perché il gestore sulla tabella non scrive più: ogni
-- funzione controlla che locale e scheda siano suoi, e fa UNA cosa.
--
-- Gli errori sono chiavi stabili, non frasi: il portale le traduce.
--   not_owner              locale, azienda o scheda non sono suoi
--   subscription_required  il locale non ha un abbonamento attivo
--   venue_already_linked   il locale ha già un collegamento vivo
--   restaurant_taken       il ristorante è già gestito da un altro account
--   restaurant_yours       il ristorante è già collegato a un tuo locale
--   restaurant_revoked     il ristorante ti è stato revocato: serve l'admin
--   company_unverified     P.IVA non confermata: serve l'admin
--   no_request_needed      (richiesta) niente da chiedere: collegalo
--   request_open           c'è già una richiesta aperta per questo locale
--   invalid_state          il gesto non vale nello stato attuale
-- ============================================================

-- COLLEGARE. Prima l'abbonamento, poi il collegamento (deciso il 15/09):
-- senza questo controllo chiunque, anche gratis, potrebbe occupare un
-- ristorante e bloccarlo al vero titolare. Una volta collegato, il
-- collegamento resta anche se l'abbonamento finisce: sparisce solo la
-- scheda (sezione 7).
create function partner_link_restaurant(
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

  select owner_user_id into v_holder
    from partner_cards
   where restaurant_id = p_restaurant_id
     and status in ('active', 'paused', 'suspended');
  if v_holder = v_uid then
    raise exception 'restaurant_yours';
  elsif v_holder is not null then
    raise exception 'restaurant_taken';
  end if;

  -- Una revoca è una decisione dell'admin su QUESTO ristorante per QUESTO
  -- account: senza il blocco, basterebbe ricollegarlo un minuto dopo. Il
  -- ritorno passa da una richiesta, cioè di nuovo dall'admin.
  if exists (select 1 from partner_cards
             where restaurant_id = p_restaurant_id
               and owner_user_id = v_uid
               and status = 'revoked') then
    raise exception 'restaurant_revoked';
  end if;

  -- Per ultimo, così gli errori più precisi vengono prima: con la P.IVA
  -- non confermata si passa dall'admin (sezione 2).
  if not exists (select 1 from partner_companies
                 where id = p_company_id
                   and vat_status in ('vies_valid', 'admin_verified')) then
    raise exception 'company_unverified';
  end if;

  -- Gli indici parziali restano l'ultima parola: due collegamenti allo
  -- stesso ristorante nello stesso istante, uno solo passa.
  insert into partner_cards (venue_id, owner_user_id, restaurant_id, company_id)
  values (p_venue_id, v_uid, p_restaurant_id, p_company_id)
  returning id into v_card_id;

  return v_card_id;
end;
$$;

-- PAUSA E RIATTIVAZIONE. Solo fra active e paused: una sospensione la
-- toglie chi l'ha messa.
create function partner_set_card_paused(p_card_id uuid, p_paused boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from partner_cards
                 where id = p_card_id and owner_user_id = auth.uid()) then
    raise exception 'not_owner';
  end if;

  update partner_cards
     set status = case when p_paused then 'paused' else 'active' end
   where id = p_card_id
     and status = case when p_paused then 'active' else 'paused' end;

  if not found then
    raise exception 'invalid_state';
  end if;
end;
$$;

-- SCOLLEGARE. Da active o paused, non da suspended: altrimenti scollegare
-- e ricollegare azzererebbe la sospensione. Piatti, menù e abbonamento
-- restano sul locale.
create function partner_unlink_card(p_card_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from partner_cards
                 where id = p_card_id and owner_user_id = auth.uid()) then
    raise exception 'not_owner';
  end if;

  update partner_cards
     set status = 'unlinked'
   where id = p_card_id
     and status in ('active', 'paused');

  if not found then
    raise exception 'invalid_state';
  end if;
end;
$$;

-- LA RICHIESTA. Vale nei tre casi della sezione 4; negli altri il
-- ristorante si collega da sé, e una richiesta sarebbe solo attesa.
-- Stesse condizioni di un collegamento: abbonamento, e il locale libero.
create function partner_request_restaurant(
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
                          and status = 'revoked')
        and exists (select 1 from partner_companies
                    where id = p_company_id
                      and vat_status in ('vies_valid', 'admin_verified')) then
    raise exception 'no_request_needed';
  end if;

  insert into partner_card_requests
    (venue_id, owner_user_id, restaurant_id, company_id, message)
  values (p_venue_id, v_uid, p_restaurant_id, p_company_id, btrim(p_message))
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function partner_link_restaurant(uuid, uuid, uuid) from public;
revoke all on function partner_set_card_paused(uuid, boolean) from public;
revoke all on function partner_unlink_card(uuid) from public;
revoke all on function partner_request_restaurant(uuid, uuid, uuid, text) from public;
grant execute on function partner_link_restaurant(uuid, uuid, uuid) to authenticated;
grant execute on function partner_set_card_paused(uuid, boolean) to authenticated;
grant execute on function partner_unlink_card(uuid) to authenticated;
grant execute on function partner_request_restaurant(uuid, uuid, uuid, text) to authenticated;


-- ============================================================
-- 7. LA SCHEDA SI VEDE?
-- Nodo 1: nessuno scrive «pubblicata». Si vede se il collegamento è
-- attivo, il locale ha un abbonamento che vale e c'è almeno un piatto
-- scelto per la scheda. Stessa risposta per la scheda e per il contorno
-- del pin: chi legge (l'app, la mappa, il portale) passa da qui e non
-- rifà il conto, come per venue_subscription_active().
-- ============================================================
create function partner_card_visible(p_card_id uuid)
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
       and venue_subscription_active(c.venue_id)
       and exists (select 1 from partner_card_dishes d where d.venue_id = c.venue_id)
  );
$$;

revoke all on function partner_card_visible(uuid) from public;
grant execute on function partner_card_visible(uuid) to anon, authenticated;


-- ============================================================
-- 8. LA DECISIONE DELL'ADMIN SU UNA RICHIESTA
-- Accogliere = revocare il gestore attuale (se c'è) e collegare chi ha
-- chiesto, nello stesso istante: fatte dal browser in due passi, un
-- errore a metà lascerebbe il ristorante libero per chiunque. Il motivo
-- va a tutti e due (al vecchio gestore per DSA art. 17).
-- SECURITY INVOKER: gira coi permessi dell'admin e sotto le sue policy.
-- Non serve l'abbonamento di chi ha chiesto: l'admin può tutto.
-- Accogliere vuol dire anche aver guardato l'azienda: se la P.IVA non era
-- confermata diventa admin_verified, e i prossimi locali della stessa
-- azienda si collegano da soli.
-- ============================================================
create function admin_decide_card_request(
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

  if p_accept then
    update partner_cards
       set status = 'revoked', status_note = p_note
     where restaurant_id = r.restaurant_id
       and status in ('active', 'paused', 'suspended');

    insert into partner_cards (venue_id, owner_user_id, restaurant_id, company_id)
    values (r.venue_id, r.owner_user_id, r.restaurant_id, r.company_id);

    update partner_companies
       set vat_status = 'admin_verified', vat_checked_at = now()
     where id = r.company_id
       and vat_status not in ('vies_valid', 'admin_verified');
  end if;

  update partner_card_requests
     set status = case when p_accept then 'accepted' else 'rejected' end,
         decision_note = p_note,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_request_id;
end;
$$;

revoke all on function admin_decide_card_request(uuid, boolean, text) from public;
grant execute on function admin_decide_card_request(uuid, boolean, text) to authenticated;


-- ============================================================
-- 9. VIA LE LETTURE PUBBLICHE SULLE TABELLE GREZZE
-- Sei policy (703, 715) aprivano a chiunque — anche senza login — il
-- locale, i piatti, le loro traduzioni e i link di una scheda
-- 'published'. Il locale intero, cioè anche owner_user_id e lo scatto
-- del menù. Nessuno le usa (verificato il 18/09: app, sito e admin non
-- leggono queste tabelle; il sito passa da get_public_menu e
-- venue_public_links, che sono SECURITY DEFINER) e il valore su cui si
-- reggevano non esiste più. L'app leggerà la scheda da una funzione
-- sola (parte 4), che risponde con quello che serve e basta — come il
-- sito col menù al tavolo.
-- (partner_cards_public_read è già andata alla sezione 3.)
-- ============================================================
drop policy partner_venues_public_read on partner_venues;
drop policy partner_card_dishes_public_read on partner_card_dishes;
drop policy partner_dishes_public_read on partner_dishes;
drop policy partner_dish_translations_public_read on partner_dish_translations;
drop policy partner_links_public_read on partner_links;


COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--
-- partner_claims non c'è più, partner_card_requests sì:
--   select to_regclass('partner_claims'), to_regclass('partner_card_requests');
--
-- Nessuna lettura pubblica rimasta sulle tabelle partner:
--   select tablename, policyname from pg_policies
--    where tablename like 'partner_%' and policyname like '%public%';
--   (atteso: zero righe)
--
-- I trigger del registro:
--   select tgname from pg_trigger
--    where tgname like '%audit%' and not tgisinternal order by 1;
--   (attesi sei: card ×2, request ×2, subscription ×2)
--
-- Il blocco sulla cancellazione dei ristoranti:
--   select tgname from pg_trigger where tgname = 'restaurants_guard_partner_link';
-- ============================================================
