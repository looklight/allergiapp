-- Migration 709: ritirare il menù dalla sala
--
-- STATO: DA APPLICARE via SQL editor, DOPO la 708 (il tracking locale è
-- fermo alla 045: questa, come tutte le 046+, va eseguita a mano — MAI
-- db push).
--
-- ------------------------------------------------------------
-- LA VIA D'USCITA CHE IL TEMA 20 AVEVA PREVISTO
-- La pubblicazione resta uno stato che va in avanti: si pubblica
-- con un gesto deliberato, e il QR sul tavolo continua a
-- funzionare. Ma una via d'uscita serve — il locale chiude,
-- cambia gestione, smette di usarci — e finora non esisteva.
--
-- ⚠️ RITIRARE NON È FAR SPARIRE. Il QR è plastificato sul tavolo
-- e appiccicato alla vetrina: quando qualcuno lo inquadra dopo il
-- ritiro deve leggere che il menù non è al momento disponibile,
-- non un errore del browser. Chi tocca questa parte non la
-- trasformi in un 404 secco: la pagina pubblica ha già la sua
-- schermata di cortesia, ed è lì che si finisce.
--
-- LO SCATTO NON SI CANCELLA, si stacca soltanto: published_at
-- torna NULL e published_menu resta dov'è. Due motivi. Il primo è
-- che le foto dei piatti sono protette dalla cancellazione finché
-- uno scatto le referenzia (photo_in_published_menu, 708):
-- buttando via lo scatto, la prima sostituzione di una foto
-- porterebbe via il file, e riattivando il menù resterebbero
-- immagini rotte. Il secondo è che così si sa sempre cosa c'era
-- in sala l'ultima volta.
--
-- RIATTIVARE si fa con publish_menu(), non rimettendo la data:
-- nel frattempo la bozza è andata avanti, e tornare in sala con
-- lo scatto di sei mesi fa vorrebbe dire pubblicare prezzi vecchi
-- senza che nessuno l'abbia chiesto.

BEGIN;

create or replace function unpublish_menu(p_venue_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  fatto boolean;
begin
  update partner_venues
     set published_at = null
   where id = p_venue_id
     and owner_user_id = auth.uid()
     and published_at is not null
  returning true into fatto;

  return coalesce(fatto, false);
end;
$$;

-- Il controllo del proprietario è scritto a mano dentro la funzione, come
-- in publish_menu: SECURITY DEFINER scavalca le RLS, e senza quel `where`
-- chiunque potrebbe ritirare il menù di un altro.
revoke all on function unpublish_menu(uuid) from public;
grant execute on function unpublish_menu(uuid) to authenticated;

comment on function unpublish_menu(uuid) is
  'Stacca il menù dalla sala: published_at torna NULL, lo scatto resta. Riattivare si fa con publish_menu(), che ne prende uno nuovo.';

COMMIT;
