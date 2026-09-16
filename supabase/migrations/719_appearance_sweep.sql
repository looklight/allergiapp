-- ============================================================
-- 719_appearance_sweep.sql
-- STATO: BOZZA, da applicare a mano dal SQL editor.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- IL SEGUITO DELLA 718, dopo aver ripercorso tutti i flussi (16/09).
-- Cinque cose, e tre sono difetti veri della 718 trovati guardando i
-- passaggi uno per uno.
--
--   1. Scadenza per data: nessun evento, nessun trigger. Serve un giro.
--   2. Dal regalo al pagato il locale restava scoperto per un istante, e
--      l'aspetto spariva proprio quando il ristoratore cominciava a pagare.
--   3. Il trigger della 718 toccava NEW e OLD in modo che su una
--      cancellazione di riga può rompersi.
--   4. Togliendo l'aspetto si pubblicavano anche foto e descrizioni non
--      ancora pubblicate.
--   5. Il giro, scritto come stava, avrebbe PUBBLICATO l'aspetto degli
--      abbonati al posto loro.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. UN ABBONAMENTO APERTO PER LOCALE **E PER PROVENIENZA**
--
-- Il difetto: con un solo abbonamento aperto per locale, il webhook doveva
-- chiudere il regalo PRIMA di scrivere il pagato. Fra le due scritture il
-- locale risultava scoperto — e in quell'istante il trigger della 718 faceva
-- il suo mestiere, togliendo l'aspetto dalla sala. Poi arrivava il pagato, il
-- trigger vedeva che era coperto e non faceva niente, perché in salita non
-- pubblica nulla di sua iniziativa. Risultato: il menù diventava sobrio
-- ESATTAMENTE quando il ristoratore cominciava a pagare.
--
-- Così invece il pagato nasce mentre il regalo è ancora vivo, e il regalo si
-- chiude dopo: mai un istante senza copertura.
--
-- Resta impossibile quello che conta: due PAGATI aperti sullo stesso locale,
-- cioè il doppio addebito. Un regalo e un pagato insieme sono uno stato
-- legittimo — è il passaggio — e a «ha diritto all'aspetto?»
-- venue_subscription_active risponde sì se ne trova almeno uno valido.
-- ------------------------------------------------------------
drop index if exists partner_subscriptions_one_open_per_venue;

create unique index if not exists partner_subscriptions_one_open_per_venue_source
  on partner_subscriptions (venue_id, source)
  where status in ('active', 'past_due');

comment on index partner_subscriptions_one_open_per_venue_source is
  'Un abbonamento aperto per locale e per provenienza: due pagati sullo stesso locale restano impossibili (doppio addebito), mentre un regalo e un pagato convivono per il tempo del passaggio.';


-- ------------------------------------------------------------
-- 2. COSA VUOL DIRE «TOGLIERE L'ASPETTO DALLA SALA», in un posto solo
--
-- ⚠️ CORREGGE LA 718. Là si scriveva `venue_appearance_public(id)`, che per
-- le due chiavi gratuite (foto e descrizioni dei piatti) prende i valori DI
-- ADESSO del locale. Se il ristoratore aveva spento le descrizioni senza
-- pubblicare, la fine dell'abbonamento gliele avrebbe pubblicate — cioè
-- avrebbe portato al tavolo una modifica al CONTENUTO che non aveva scelto
-- di pubblicare. Qui invece le due chiavi si rileggono DALLO SCATTO: restano
-- quelle che i clienti stanno già vedendo.
-- ------------------------------------------------------------
create or replace function published_appearance_without_premium(p_venue_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select venue_appearance_defaults()
         || jsonb_build_object(
              'showPhotos', coalesce(
                v.published_menu -> 'showPhotos',
                venue_appearance_defaults() -> 'showPhotos'),
              'showDescriptions', coalesce(
                v.published_menu -> 'showDescriptions',
                venue_appearance_defaults() -> 'showDescriptions')
            )
    from partner_venues v
   where v.id = p_venue_id;
$$;

comment on function published_appearance_without_premium(uuid) is
  'L''aspetto dello scatto ripulito delle personalizzazioni a pagamento, tenendo però foto e descrizioni COM''ERANO NELLO SCATTO: sono contenuto, e toglierle o aggiungerle qui vorrebbe dire pubblicare una modifica che il ristoratore non ha scelto.';


-- ------------------------------------------------------------
-- 3. IL TRIGGER, RISCRITTO
--
-- ⚠️ CORREGGE LA 718 su due punti:
--   a) leggeva `new.venue_id` e `old.venue_id` insieme. In un trigger di
--      cancellazione NEW non c'è (e in uno di inserimento non c'è OLD): a
--      seconda dei casi si prende un errore invece di una riga sistemata.
--      Adesso si guarda TG_OP, che è il modo giusto di chiederlo.
--   b) toglieva l'aspetto scrivendo i valori di adesso anche per foto e
--      descrizioni (v. punto 2).
-- ------------------------------------------------------------
create or replace function sync_public_appearance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  v_id := case when tg_op = 'DELETE' then old.venue_id else new.venue_id end;

  -- In salita non si tocca niente: è il ristoratore a decidere quando
  -- cambia il menù che i suoi clienti stanno leggendo.
  if venue_subscription_active(v_id) then
    return null;
  end if;

  update partner_venues v
     set published_menu = v.published_menu || published_appearance_without_premium(v.id)
   where v.id = v_id
     and v.published_menu is not null;

  return null;   -- trigger AFTER: il valore di ritorno non serve a nessuno
end;
$$;


-- ------------------------------------------------------------
-- 4. IL GIRO QUOTIDIANO, per le scadenze che non sono un evento
--
-- Una concessione di tre mesi che arriva a scadenza non fa scattare niente:
-- nessuno tocca la riga. Senza questo giro, l'aspetto sarebbe rimasto in
-- sala a tempo indeterminato — mentre la regola è una sola per tutti:
-- **scade, sparisce; ti abboni prima, resta** (decisione dell'utente, 16/09).
--
-- ⚠️ SOLO IN DISCESA, e questo era il quinto difetto: scritto senza la
-- condizione qui sotto, il giro avrebbe fatto anche il contrario — visto uno
-- scatto sobrio di un locale abbonato che non ha ancora premuto Pubblica,
-- gli avrebbe pubblicato l'aspetto al posto suo, di notte. Pubblicare è un
-- gesto del ristoratore, sempre.
--
-- 💡 Fa anche da rete per un evento di Stripe perso o arrivato mentre il
-- webhook era rotto: il giorno dopo il giro sistema da sé.
-- ------------------------------------------------------------
create or replace function sweep_public_appearance()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  toccati integer;
begin
  with fuori_posto as (
    select v.id, published_appearance_without_premium(v.id) as giusto
      from partner_venues v
     where v.published_menu is not null
       and not venue_subscription_active(v.id)
       -- Solo quelli davvero diversi: il confronto guarda le chiavi
       -- dell'aspetto, non l'intero scatto (che contiene anche i piatti).
       and (select jsonb_object_agg(k.key, v.published_menu -> k.key)
              from jsonb_each(venue_appearance_defaults()) k
             where v.published_menu ? k.key)
           is distinct from published_appearance_without_premium(v.id)
  )
  update partner_venues v
     set published_menu = v.published_menu || f.giusto
    from fuori_posto f
   where v.id = f.id;

  get diagnostics toccati = row_count;
  return toccati;
end;
$$;

comment on function sweep_public_appearance() is
  'Toglie dagli scatti pubblicati le personalizzazioni dei locali senza abbonamento attivo, comprese le concessioni scadute per data che nessun trigger intercetta. Non fa il contrario: pubblicare è un gesto del ristoratore. Idempotente; torna quante righe ha toccato.';

COMMIT;


-- ============================================================
-- 5. LA PIANIFICAZIONE DEL GIRO
-- ⚠️ DA ESEGUIRE A PARTE, dopo aver acceso pg_cron dalla dashboard
-- (Database → Extensions → pg_cron). Sta fuori dalla transazione perché è
-- configurazione del progetto, non schema: se l'estensione non c'è, il resto
-- della migration deve passare lo stesso.
--
-- Le 3:15 UTC: nessuno sta pubblicando, e un menù che cambia vestito mentre
-- qualcuno lo guarda è comunque innocuo — il contenuto non si muove. Una
-- volta al giorno basta: la scadenza di una concessione non è al minuto.
--
--   select cron.schedule(
--     'sweep_public_appearance',
--     '15 3 * * *',
--     $$select sweep_public_appearance()$$
--   );
--
-- Per vedere i giri fatti:
--   select * from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'sweep_public_appearance')
--    order by start_time desc limit 10;
--
-- Per toglierlo:
--   select cron.unschedule('sweep_public_appearance');
-- ============================================================
