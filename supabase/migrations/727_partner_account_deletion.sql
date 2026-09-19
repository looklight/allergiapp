-- ============================================================
-- 727_partner_account_deletion.sql
-- STATO: APPLICATA il 2026-09-19 e verificata (funzioni, trigger, vincoli,
-- tabella, registro compilato). Provata prima sul database vero con
-- annullamento finale. Tracking fermo alla 045: a mano, MAI db push.
--
-- ELIMINARE UN RISTORATORE SENZA LASCIARE NIENTE IN GIRO (19/09).
--
-- Il principio: tutto quello che riguarda un ristoratore pende dal suo
-- account. Si elimina l'account (auth.users) e il database porta via il
-- resto a catena — nessuna lista di tabelle da ricordare, nessun passaggio a
-- mano. La funzione `delete-account` fa prima le due cose che il database
-- non vede (chiudere Stripe, cancellare le foto), poi elimina l'account.
--
-- Prima di questa migration tre punti non rispettavano il principio:
--
--   A. ABBONAMENTI. La 716 li legava al locale con RESTRICT per non
--      cancellare un locale che Stripe continua a far pagare, ma il blocco
--      scattava anche sugli abbonamenti CHIUSI: un locale che ne aveva avuto
--      uno, anche disdetto o regalato e scaduto, non si eliminava più — né
--      dal portale né, con l'account, dall'admin. Ora si cancellano col
--      locale, e il blocco resta solo dove serviva: nel portale, finché
--      l'abbonamento è attivo. Stesso difetto fra azienda e
--      associazioni: un account con un locale associato non si eliminava.
--
--   B. REGISTRO. Le righe di partner_audit_log non sapevano di chi
--      parlano: eliminato il locale, restavano con dentro ragione sociale e
--      P.IVA (company_changed) senza più modo di trovarle. Ora ogni riga
--      porta il ristoratore a cui si riferisce, e se ne va con lui.
--
--   C. INDIRIZZI RITIRATI. L'indirizzo di un menù eliminato resta bloccato
--      (un QR stampato non deve portare al menù di un altro), ma restava
--      anche il riferimento all'account. Ora l'indirizzo resta e il
--      riferimento si svuota: nessuno potrà più riprenderlo.
--
--   D. LA PROVA. Una riga senza dati personali per ogni eliminazione: il
--      GDPR chiede di poter dimostrare di aver risposto (art. 5.2). Le
--      fatture non stanno qui: le tengono Stripe e lo strumento SdI, per
--      gli obblighi fiscali.
--
--   E. Una lettura per la scheda utente in admin, che per chi usa solo il
--      portale diceva «Utente non trovato» (non ha una riga in `profiles`).
-- ============================================================

BEGIN;

-- ============================================================
-- A. ABBONAMENTI: si cancellano col locale
-- ============================================================

alter table partner_subscriptions
  drop constraint partner_subscriptions_venue_id_owner_user_id_fkey;
alter table partner_subscriptions
  add constraint partner_subscriptions_venue_id_owner_user_id_fkey
  foreign key (venue_id, owner_user_id)
  references partner_venues (id, owner_user_id) on delete cascade;

-- Il blocco che la RESTRICT voleva essere: un locale con l'abbonamento
-- ATTIVO (pagato o regalato, anche già disdetto ma non ancora scaduto) non si
-- elimina dal portale — la regola decisa con la 716, che il portale dice con
-- una frase. Scaduto o chiuso, se ne va col locale.
--
-- Vale solo per chi agisce dal portale (e dall'admin nel browser):
-- l'eliminazione dell'account passa da `delete-account`, che chiude Stripe
-- PRIMA e poi elimina come servizio.
create function partner_venues_guard_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and venue_subscription_active(old.id) then
    raise exception 'venue_has_subscription'
      using hint = 'Un locale con l''abbonamento attivo non si elimina: prima deve finire.';
  end if;
  return old;
end;
$$;

create trigger partner_venues_guard_delete
  before delete on partner_venues
  for each row execute function partner_venues_guard_delete();

-- AZIENDA E ASSOCIAZIONI SI TENEVANO A VICENDA (trovato provando questa
-- migration). Eliminando l'account, la catena cancella l'azienda e — per
-- un'altra strada, dal locale — le associazioni e le richieste che la
-- citano. Ma il controllo di questi due vincoli scattava appena cancellata
-- l'azienda, prima che la catena arrivasse alle associazioni: un account con
-- un locale associato non si eliminava. Il vincolo resta lo stesso (un'azienda
-- in uso non si cancella da sola); cambia solo QUANDO si controlla, a fine
-- transazione, quando la catena ha finito.
alter table partner_cards
  alter constraint partner_cards_company_fkey deferrable initially deferred;
alter table partner_card_requests
  alter constraint partner_card_requests_company_id_owner_user_id_fkey deferrable initially deferred;


-- ============================================================
-- B. REGISTRO: ogni riga sa di chi parla
-- ============================================================

alter table partner_audit_log
  add column subject_user_id uuid references auth.users (id) on delete cascade;

create index partner_audit_log_subject_idx on partner_audit_log (subject_user_id);

-- Il ristoratore di una riga, da quello che la riga già porta. Le quattro
-- funzioni che scrivono nel registro restano com'erano: lo ricava questo
-- trigger all'inserimento, e la stessa funzione riempie le righe di prima.
-- NULL = una riga che non riguarda un ristoratore; resta.
create function partner_audit_subject(p_venue_id uuid, p_card_id uuid, p_details jsonb)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select owner_user_id from partner_venues where id = p_venue_id),
    (select owner_user_id from partner_cards where id = p_card_id),
    (select owner_user_id from partner_companies
      where id = (p_details->>'company_id')::uuid),
    (select owner_user_id from partner_card_requests
      where id = (p_details->>'request_id')::uuid),
    (select owner_user_id from partner_subscriptions
      where id = (p_details->>'subscription_id')::uuid)
  );
$$;

create function partner_audit_set_subject()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subject_user_id is null then
    new.subject_user_id := partner_audit_subject(new.venue_id, new.card_id, new.details);
  end if;
  return new;
end;
$$;

create trigger partner_audit_set_subject
  before insert on partner_audit_log
  for each row execute function partner_audit_set_subject();

update partner_audit_log
   set subject_user_id = partner_audit_subject(venue_id, card_id, details)
 where subject_user_id is null;

revoke all on function partner_audit_subject(uuid, uuid, jsonb) from public, anon, authenticated;


-- ============================================================
-- C. INDIRIZZI RITIRATI: l'indirizzo resta, il riferimento no
-- ============================================================

alter table partner_retired_slugs
  add constraint partner_retired_slugs_owner_user_id_fkey
  foreign key (owner_user_id) references auth.users (id) on delete set null;

-- Come nella 720, con una differenza: se il locale se ne va perché se ne va
-- l'account, il proprietario non c'è più e l'indirizzo si ritira senza.
-- Senza questo controllo la riga nuova punterebbe a un account appena
-- eliminato e il vincolo qui sopra fermerebbe l'eliminazione intera.
create or replace function retire_venue_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.slug is not null then
    insert into partner_retired_slugs (slug, owner_user_id)
    values (
      old.slug,
      case when exists (select 1 from auth.users u where u.id = old.owner_user_id)
           then old.owner_user_id end
    )
    on conflict (slug) do nothing;
  end if;
  return old;
end;
$$;


-- ============================================================
-- D. LA PROVA DELL'ELIMINAZIONE
-- ============================================================

-- Nessun dato della persona eliminata: né id, né email, né nome. Dice che
-- un'eliminazione c'è stata, quando, da dove e chi l'ha eseguita. La scrive
-- solo `delete-account` (chiave di servizio): nessuna policy di scrittura.
create table account_deletions (
  id uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now(),
  -- 'app' = l'utente dall'app; 'admin' = il nostro team su richiesta
  requested_via text not null check (requested_via in ('app', 'admin')),
  deleted_by uuid references auth.users (id) on delete set null,
  had_partner_profile boolean not null,
  stripe_customers_deleted integer not null default 0
);

alter table account_deletions enable row level security;

create policy account_deletions_admin_read on account_deletions
  for select using (is_admin());


-- ============================================================
-- E. LA SCHEDA UTENTE IN ADMIN
-- ============================================================

-- Una riga se l'account ha un profilo partner, nessuna altrimenti. L'email
-- sta in auth.users, che il browser non legge: per questo una funzione.
create function get_partner_account_admin(p_user_id uuid)
returns table (
  first_name text,
  last_name text,
  email text,
  created_at timestamptz,
  venues integer,
  renewing_subscriptions integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select a.first_name,
         a.last_name,
         u.email::text,
         a.created_at,
         (select count(*)::integer from partner_venues v where v.owner_user_id = a.user_id),
         (select count(*)::integer from partner_subscriptions s
           where s.owner_user_id = a.user_id
             and s.source = 'stripe'
             and s.status in ('active', 'past_due')
             and not s.cancel_at_period_end)
    from partner_accounts a
    join auth.users u on u.id = a.user_id
   where a.user_id = p_user_id;
end;
$$;

revoke all on function get_partner_account_admin(uuid) from public, anon;
grant execute on function get_partner_account_admin(uuid) to authenticated;

COMMIT;
