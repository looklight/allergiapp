-- ============================================================
-- 732_partner_save_links.sql
-- STATO: APPLICATA il 2026-09-21 (success dal SQL editor), portale online
-- dopo. Si può rilanciare: `create or replace` con la stessa firma,
-- permessi idempotenti.
-- Tracking fermo alla 045: a mano dal SQL editor, MAI db push.
--
-- SALVARE I LINK NON DEVE POTER LASCIARE UN LOCALE SENZA LINK.
--
-- Fino a qui il portale faceva due viaggi: prima cancellava tutti i link del
-- locale, poi riscriveva quelli della bozza. Due viaggi vogliono dire due
-- transazioni, e fra l'una e l'altra c'è un istante in cui quel locale non ha
-- più niente. Se il secondo viaggio non arriva — la rete che cade, un vincolo
-- che rifiuta la riga, il browser chiuso — l'istante diventa lo stato finale:
-- prenotazione, delivery, menù e sito spariti tutti insieme.
--
-- Non è teoria: è successo oggi, 21/09. Una riga senza `sort_order` in una
-- scrittura multipla veniva rifiutata (PostgREST mette insieme le colonne di
-- tutte le righe e ci infila NULL dove manca il campo, invece del valore di
-- partenza della colonna), e la cancellazione era già passata.
--
-- Qui i due gesti diventano UNO. Una funzione è una transazione: o il locale
-- ha i link nuovi, o ha ancora quelli di prima. Non esiste il mezzo.
--
-- E si porta via anche la trappola che ha scatenato il guaio: le colonne le
-- scrive questa, una per una, quindi nessuna riga può più arrivare monca
-- perché un'altra riga aveva un campo in più.
--
-- SECURITY INVOKER (cioè: nessun SECURITY DEFINER). La regola di chi può
-- toccare cosa sta già nella policy `partner_links_owner` (703) e continua a
-- valere qui dentro: la funzione non presta i suoi poteri a nessuno. Il
-- controllo sul proprietario in cima non è la difesa — è solo per rispondere
-- «not_owner» invece di cancellare zero righe in silenzio.
-- ============================================================

BEGIN;

create or replace function partner_save_links(p_venue_id uuid, p_links jsonb)
returns void
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from partner_venues
     where id = p_venue_id and owner_user_id = auth.uid()
  ) then
    raise exception 'not_owner';
  end if;

  delete from partner_links where venue_id = p_venue_id;

  -- I campi che non valgono per quel tipo di link restano NULL: la
  -- prenotazione non ha una lingua, il menù non ha un servizio. `sort_order`
  -- invece un valore ce l'ha sempre, e dove non conta è zero.
  insert into partner_links (venue_id, kind, url, phone, language, provider, label, sort_order)
  select p_venue_id,
         l->>'kind',
         nullif(l->>'url', ''),
         nullif(l->>'phone', ''),
         nullif(l->>'language', ''),
         nullif(l->>'provider', ''),
         nullif(l->>'label', ''),
         coalesce((l->>'sort_order')::int, 0)
    from jsonb_array_elements(coalesce(p_links, '[]'::jsonb)) l;
end;
$$;

-- Solo chi ha fatto l'accesso (e dentro, solo il proprietario del locale).
-- `from public, anon` e non solo `from public`: su Supabase i privilegi di
-- partenza danno EXECUTE ad `anon` per nome (lezione della 723).
revoke all on function partner_save_links(uuid, jsonb) from public, anon;
grant execute on function partner_save_links(uuid, jsonb) to authenticated;

comment on function partner_save_links(uuid, jsonb) is
  'Riscrive in un colpo solo i link di un locale: o ci sono tutti i nuovi, o restano quelli di prima. Chiamata dal portale al posto di cancella-e-riscrivi.';

COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select to_regprocedure('partner_save_links(uuid, jsonb)');
--   select proacl, prosecdef from pg_proc where proname = 'partner_save_links';
--   -- prosecdef deve essere false: la funzione NON presta poteri
--
--   -- dal portale: salvare insieme prenotazione + delivery + sito.
--   -- Poi, per vedere che non lascia buchi, chiamarla con una riga
--   -- impossibile (né url né telefono): deve fallire E lasciare i link
--   -- di prima al loro posto.
--   select partner_save_links('<venue>', '[{"kind":"website"}]'::jsonb);
--   select kind, url from partner_links where venue_id = '<venue>';
-- ============================================================
