-- Migration 707: l'indirizzo pubblico del menù (lo slug del locale)
--
-- STATO: DA APPLICARE via SQL editor (il tracking locale è fermo alla 045:
-- questa, come tutte le 046+, va eseguita a mano — MAI db push).
--
-- ------------------------------------------------------------
-- UNA COLONNA, E BASTA (DIGITAL_MENU.md, Temi 13 e 17)
-- Il menù al tavolo si aprirà su allergiapp.com/menu/<slug>. Lo
-- slug appartiene al LOCALE e non alla scheda AllergiApp: chi
-- resta gratuito non farà mai il claim, e se l'indirizzo
-- dipendesse da `restaurants` il gratuito non potrebbe averlo.
--
-- ⚠️ QUI NON C'È NESSUNO STORICO, ed è una decisione, non una
-- dimenticanza (2026-09-01, Tema 17 riscritto). Il Tema 13
-- diceva "i vecchi indirizzi reindirizzano per sempre e non si
-- riciclano mai": un locale ha UN indirizzo alla volta, e
-- cambiandolo il precedente torna libero.
--
-- Cosa si perde: un QR già stampato smette di funzionare quando
-- il ristoratore cambia indirizzo. Ma a romperlo è LUI, con un
-- gesto suo — non un terzo che gli soffia il nome — e un gesto
-- si copre con un avviso al momento giusto (il portale lo dà
-- quando il menù è già pubblicato), non con una tabella che
-- nessuno poi ripulisce.
--
-- Cosa si guadagna: nessuna coda di slug da liberare a mano,
-- nessun secondo concetto da spiegare, e il ristoratore che
-- torna dopo sei mesi si riprende il suo nome da solo. Se un
-- giorno i reindirizzamenti servissero davvero, si aggiungono
-- senza disfare niente: questa colonna resta com'è.
--
-- ------------------------------------------------------------
-- LA FORMA DELLO SLUG
-- Minuscolo, lettere e cifre ASCII e trattini, niente trattini
-- doppi né in testa o in coda. Da 3 a 60 caratteri: sotto i tre
-- non identifica niente, sopra i sessanta non sta su una
-- locandina. Il CHECK vale solo quando c'è: NULL = questo locale
-- un indirizzo non ce l'ha ancora, ed è lo stato di partenza di
-- tutti quelli che esistono oggi.
--
-- L'unicità è GLOBALE e non per proprietario: due ristoratori
-- diversi non possono avere lo stesso indirizzo, che è
-- esattamente il punto. NULL non conta nell'indice unico di
-- PostgreSQL, quindi i locali senza slug non si pestano i piedi.
BEGIN;

alter table partner_venues
  add column slug text,
  add constraint partner_venues_slug_format check (
    slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  add constraint partner_venues_slug_length check (
    slug is null or char_length(slug) between 3 and 60
  );

create unique index partner_venues_slug_key on partner_venues (slug);

-- ------------------------------------------------------------
-- CHI PUÒ VEDERE UNO SLUG DI UN ALTRO
-- Le RLS della 703 lasciano leggere a ogni partner solo i propri
-- locali, e va benissimo — ma il portale deve poter dire "questo
-- indirizzo è già preso" PRIMA di far salvare, e quel controllo
-- guarda per forza le righe di altri.
--
-- Questa funzione risponde SÌ/NO e nient'altro: non dice di chi
-- sia lo slug né restituisce una riga. È il minimo che serve al
-- controllo di disponibilità, e non apre l'elenco dei locali
-- altrui a nessuno.
create or replace function partner_slug_taken(candidate text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from partner_venues where slug = candidate);
$$;

revoke all on function partner_slug_taken(text) from public;
grant execute on function partner_slug_taken(text) to authenticated;

comment on function partner_slug_taken(text) is
  'Dice solo se un indirizzo di menù è già occupato. Non rivela da chi.';

COMMIT;
