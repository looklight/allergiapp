-- Migration 709: ritirare il menù dalla sala, e tre manopole d'aspetto
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

-- ------------------------------------------------------------
-- LA COPERTINA DEL MENÙ
-- Un'immagine dietro l'intestazione, al posto del colore pieno.
-- La colonna si aggiunge ADESSO perché costa una riga e la
-- migration è già aperta; la FUNZIONE — caricamento, ritaglio
-- largo, velatura — è lavoro di interfaccia e non chiederà altre
-- migration (DIGITAL_MENU.md, punto aperto del 2026-09-02).
--
-- Come il logo (703) è solo un indirizzo su Storage: l'immagine
-- si carica una volta e sta nel bucket 'partner'. NULL = nessuna
-- copertina, e resta il colore scelto — che è il caso di tutti i
-- locali che esistono oggi.
--
-- ⚠️ QUANDO SI IMPLEMENTA, tre cose che il Tema 8 non lascia
-- negoziare, scritte qui perché è il posto che si rilegge:
--   * il nome del locale sopra una foto qualsiasi diventa
--     illeggibile: serve una velatura scura SEMPRE, non
--     facoltativa;
--   * il ritaglio va largo e basso, mentre PhotoCropDialog
--     oggi sa fare solo quadrati: si insegna una proporzione
--     diversa alla stessa finestra, non se ne fa una seconda;
--   * è l'immagine più grande della pagina ed è la prima a
--     caricarsi, cioè la voce che il Tema 11 indica come il costo
--     dell'intera fase gratuita.
alter table partner_venues
  add column cover_url text;

comment on column partner_venues.cover_url is
  'Immagine di copertina del menù al tavolo, su Storage. NULL = nessuna, resta il colore del locale.';

-- ------------------------------------------------------------
-- IL CARATTERE DELLE INTESTAZIONI
-- Un CODICE, non il nome di un file: 'modern' (quello di oggi),
-- 'classic', 'bold', 'light'. Il file lo decide chi rende la
-- pagina, e cambiarlo un domani non tocca il database.
--
-- ⚠️ VALE SOLO SULLE INTESTAZIONI — nome del locale e titoli
-- delle sezioni. Nome del piatto, prezzo, descrizione e
-- soprattutto la riga degli ALLERGENI restano nel carattere di
-- sistema, che è il più leggibile che esista su ogni telefono.
-- È la stessa ragione per cui le tinte le scegliamo noi (Tema 8):
-- quella riga la legge una persona con un'allergia, in una sala
-- poco illuminata, mentre qualcuno le chiede cosa ordina. Chi
-- estende questa colonna al corpo del menù la sta usando contro
-- il prodotto.
--
-- E POCHI, decisi da noi, non un elenco da cui scegliere: sono
-- tre voci della stessa lingua — raffinata, marcata, sottile —
-- provate da noi a quelle dimensioni.
--
-- I FILE SI OSPITANO CON IL SITO, mai da Google Fonts: quel file
-- arriverebbe dai server di Google a ogni scansione, cioè
-- manderemmo l'indirizzo IP del cliente seduto al tavolo a un
-- terzo senza che nessuno gliel'abbia chiesto. In Europa è un
-- problema vero, e va nella direzione opposta a quella presa con
-- Firebase.
alter table partner_venues
  add column heading_font text not null default 'modern'
    check (heading_font in ('modern', 'classic', 'bold', 'light'));

comment on column partner_venues.heading_font is
  'Carattere delle INTESTAZIONI del menù (nome del locale, titoli delle sezioni). Il corpo e la riga degli allergeni restano di sistema. Candidato premium.';

-- ------------------------------------------------------------
-- LO STILE DELLE SEZIONI
-- Come si vede il titolo di una sezione dentro il menù:
--
--   underline   maiuscoletto piccolo nel colore del locale, con il
--               filetto sotto. È quello di oggi: sobrio, da carta.
--   banner      fascia piena col colore scelto, testo bianco.
--               Forte, e soprattutto si TROVA scorrendo: su un menù
--               lungo è quello che aiuta di più a orientarsi.
--   plain       solo testo, più grande e scuro. Niente colore,
--               niente filetto.
--
-- La fascia si può offrire SOLO perché le tinte le scegliamo noi
-- (Tema 8): sono tutte scure abbastanza da reggere il bianco
-- sopra. Chi un domani aprisse la scelta del colore renderebbe
-- illeggibile questo stile, e se ne accorgerebbe dai clienti —
-- non da qui.
alter table partner_venues
  add column section_style text not null default 'underline'
    check (section_style in ('underline', 'banner', 'plain'));

comment on column partner_venues.section_style is
  'Come si vedono i titoli delle sezioni nel menù al tavolo. La fascia colorata regge perché le tinte sono scelte da noi (Tema 8). Candidato premium.';

-- Esce anche nello scatto pubblicato, altrimenti la copertina
-- resterebbe una cosa che si vede solo nell'anteprima del
-- portale. Le pagine già pubblicate non ce l'hanno dentro: chi
-- rende la pagina deve reggere il campo mancante, che è la
-- ragione per cui la pagina pubblica legge tutto con un ripiego.
create or replace function build_public_menu(p_venue_id uuid)
returns jsonb
language sql
stable
as $$
  with locale as (
    select v.id, v.name, v.slug, v.logo_url, v.accent, v.cover_url, v.heading_font,
           v.section_style, v.table_conditions, v.show_dish_photos,
           v.show_dish_descriptions
      from partner_venues v
     where v.id = p_venue_id
  ),
  menu as (
    select m.id, m.name, m.description, m.currency
      from partner_menus m
      join locale l on l.id = m.venue_id
     order by m.sort_order, m.created_at
     limit 1
  ),
  righe as (
    select i.section_id,
           i.sort_order,
           jsonb_build_object(
             'id', i.id,
             'name', d.name,
             'description', coalesce(d.description, ''),
             'priceCents', i.price_cents,
             'highlighted', i.highlighted,
             'highlightNote', coalesce(i.highlight_note, ''),
             'allergens', to_jsonb(d.declared_allergens),
             'diets', to_jsonb(d.diet_tags),
             'thumbUrl', coalesce(d.photo_thumb_url, d.photo_url, ''),
             'photoUrl', coalesce(d.photo_url, ''),
             'i18n', coalesce(
               (select jsonb_object_agg(
                         tr.language,
                         jsonb_build_object(
                           'name', coalesce(tr.name, ''),
                           'description', coalesce(tr.description, '')
                         ))
                  from partner_dish_translations tr
                 where tr.dish_id = d.id),
               '{}'::jsonb)
           ) as riga
      from partner_menu_items i
      join menu on menu.id = i.menu_id
      join partner_dishes d on d.id = i.dish_id
  ),
  fuori as (
    select jsonb_build_object(
             'kind', 'section',
             'name', '',
             'description', '',
             'items', jsonb_agg(riga order by sort_order)
           ) as gruppo
      from righe
     where section_id is null
    having count(*) > 0
  ),
  sezioni as (
    select jsonb_build_object(
             'kind', s.kind,
             'name', s.name,
             'description', coalesce(s.description, ''),
             'items', coalesce(
               (select jsonb_agg(r.riga order by r.sort_order)
                  from righe r where r.section_id = s.id),
               '[]'::jsonb)
           ) as gruppo,
           s.sort_order
      from partner_menu_sections s
      join menu on menu.id = s.menu_id
  ),
  gruppi as (
    select gruppo, -1 as ordine from fuori
    union all
    select gruppo, sort_order from sezioni
  )
  select case when (select count(*) from menu) = 0 then null else
    jsonb_build_object(
      'slug', (select slug from locale),
      'venueName', (select name from locale),
      'logoUrl', coalesce((select logo_url from locale), ''),
      'accent', (select accent from locale),
      'coverUrl', coalesce((select cover_url from locale), ''),
      'headingFont', (select heading_font from locale),
      'sectionStyle', (select section_style from locale),
      'tableConditions', coalesce((select table_conditions from locale), ''),
      'showPhotos', (select show_dish_photos from locale),
      'showDescriptions', (select show_dish_descriptions from locale),
      'menu', jsonb_build_object(
        'name', (select name from menu),
        'description', coalesce((select description from menu), ''),
        'currency', (select currency from menu),
        'groups', coalesce((select jsonb_agg(gruppo order by ordine) from gruppi), '[]'::jsonb)
      )
    )
  end;
$$;

-- ------------------------------------------------------------
-- RITIRARE IL MENÙ DALLA SALA
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
