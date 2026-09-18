-- ============================================================
-- 722_published_menu_guard.sql
-- STATO: APPLICATA il 2026-09-18 (verificata: trigger presente).
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- IL MENÙ PUBBLICATO CAMBIA SOLO DAL PULSANTE «PUBBLICA».
--
-- La falla, trovata il 18/09 rivedendo la 721: `partner_venues_owner` è
-- FOR ALL sul gestore, e i permessi di colonna sono quelli di partenza di
-- Supabase (UPDATE su tutto). Quindi il gestore, col proprio token e una
-- chiamata diretta all'API, può scrivere da sé `published_menu` e
-- `published_at`:
--   - aggira il muro sull'aspetto (718), che vive in build_public_menu:
--     colori, copertina e caratteri al tavolo senza abbonamento, e il
--     giro notturno (719) li toglie solo fino alla chiamata successiva;
--   - mette al tavolo un contenuto che il portale non avrebbe mai
--     prodotto (link a foto esterne, campi inventati).
-- Serve competenza tecnica e oggi non ci sono abbonati veri: rischio
-- basso, ma è la stessa porta che la 721 chiude sulle schede.
--
-- LA CORREZIONE: un trigger che rifiuta le modifiche a quelle due colonne
-- quando arrivano dal client (ruoli `authenticated` e `anon`). Tutte le
-- funzioni che le scrivono davvero — publish_menu, unpublish_menu,
-- revert_appearance, sweep_public_appearance, sync_public_appearance —
-- sono SECURITY DEFINER di `postgres` (verificato il 18/09 sul database),
-- quindi al loro interno current_user è `postgres` e passano. Il resto
-- del locale (nome, logo, manopole dell'aspetto) resta scrivibile come
-- prima: è la bozza, ed è giusto che si salvi da sola.
--
-- Perché un trigger e non i permessi di colonna: revocare UPDATE su una
-- colonna non basta dove c'è UPDATE sull'intera tabella, e rifare i
-- permessi colonna per colonna vorrebbe dire ricordarsi di aggiornarli a
-- ogni colonna nuova del locale — che sono arrivate a una al giorno.
-- ============================================================

BEGIN;

create function partner_venues_guard_published()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (tg_op = 'INSERT' and (new.published_menu is not null or new.published_at is not null)
          or tg_op = 'UPDATE' and (new.published_menu is distinct from old.published_menu
                                   or new.published_at is distinct from old.published_at)) then
    raise exception 'published_menu_readonly'
      using hint = 'Il menù pubblicato cambia solo da publish_menu() e unpublish_menu().';
  end if;
  return new;
end;
$$;

-- ⚠️ SECURITY INVOKER di proposito (è il default): il controllo su
-- current_user funziona solo se la funzione gira col ruolo di chi scrive.

create trigger partner_venues_guard_published
  before insert or update on partner_venues
  for each row execute function partner_venues_guard_published();

COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select tgname from pg_trigger where tgname = 'partner_venues_guard_published';
-- E dal portale: «Pubblica le modifiche» deve continuare a funzionare.
-- ============================================================
