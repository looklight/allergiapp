-- ============================================================
-- 719_appearance_sweep.sql
-- STATO: BOZZA, da applicare a mano dal SQL editor.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- ANCHE GLI ABBONAMENTI OFFERTI, QUANDO SCADONO, PORTANO VIA L'ASPETTO.
--
-- La 718 toglie l'aspetto dalla sala con un trigger sulla riga
-- dell'abbonamento: funziona per le disdette e per i pagamenti falliti,
-- perché lì qualcuno la riga la tocca (il webhook). Ma una concessione di
-- tre mesi che arriva a scadenza non è un evento: nessuno scrive niente, e
-- l'aspetto sarebbe rimasto in sala a tempo indeterminato.
--
-- Regola scelta dall'utente (2026-09-16) e valida per tutti: **scade,
-- sparisce; ti abboni prima, resta**. Non ci sono due trattamenti a seconda
-- di come l'abbonamento era nato.
--
-- COME: un giro al giorno che rimette a posto gli scatti rimasti indietro.
-- Idempotente — su un locale già a posto non scrive niente, perché la
-- condizione confronta com'è e come dovrebbe essere.
--
-- 💡 Fa anche da rete per un caso diverso: un evento di Stripe perso o
-- arrivato quando il webhook era rotto. Il giorno dopo il giro sistema da
-- sé, senza che nessuno se ne accorga.
-- ============================================================

BEGIN;

create or replace function sweep_public_appearance()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  toccati integer;
begin
  with da_sistemare as (
    select v.id, venue_appearance_public(v.id) as giusto
      from partner_venues v
     where v.published_menu is not null
  ),
  -- Solo quelli davvero diversi: il confronto si fa sulle chiavi
  -- dell'aspetto, non sull'intero scatto (che contiene anche i piatti).
  fuori_posto as (
    select d.id, d.giusto
      from da_sistemare d
      join partner_venues v on v.id = d.id
     where (select jsonb_object_agg(k.key, v.published_menu -> k.key)
              from jsonb_each(venue_appearance_defaults()) k
             where v.published_menu ? k.key)
           is distinct from d.giusto
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
  'Rimette in pari l''aspetto degli scatti pubblicati: toglie le personalizzazioni ai locali senza abbonamento attivo (comprese le concessioni scadute per data, che nessun trigger intercetta) e le rimette a chi ce l''ha. Idempotente. Torna quante righe ha toccato.';

COMMIT;


-- ============================================================
-- IL GIRO QUOTIDIANO
-- ⚠️ DA ESEGUIRE A PARTE, dopo aver acceso pg_cron dalla dashboard
-- (Database → Extensions → pg_cron). Sta fuori dalla transazione qui sopra
-- perché è configurazione del progetto, non schema: se l'estensione non
-- c'è, il resto della migration deve passare lo stesso.
--
-- Le 3:15 UTC: nessun ristoratore sta pubblicando, e un menù che cambia
-- vestito mentre qualcuno lo guarda è comunque innocuo (il contenuto non si
-- muove). Una volta al giorno basta: la scadenza di una concessione di tre
-- mesi non è al minuto.
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
