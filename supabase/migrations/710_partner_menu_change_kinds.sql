-- Migration 710: che GENERE di modifiche non sono ancora in sala
--                (e la colonna della grandezza dei testi)
--
-- STATO: DA APPLICARE a mano nel SQL editor, dopo la 709 (il
-- tracking locale è fermo alla 045: questa, come tutte le 046+, va
-- eseguita a mano — MAI db push).
--
-- ------------------------------------------------------------
-- PERCHÉ NON BASTA PIÙ "CI SONO MODIFICHE"
-- Finora menu_publish_state() rispondeva sì o no. Bastava finché
-- pubblicare era un gesto solo e sempre concesso.
--
-- Due cose lo rendono insufficiente. La prima è che l'ASPETTO è
-- un candidato premium (Tema 25: copertina, carattere, stile
-- delle sezioni), e il giorno in cui una di quelle manopole sta
-- dietro un muro il portale deve poter dire QUALE modifica non
-- passa — non lasciare il ristoratore davanti a un bottone che
-- non fa quello che dice. La seconda è che senza distinguere non
-- si può offrire un ANNULLA: annullare il contenuto e annullare
-- l'aspetto sono due gesti con rischi diversissimi, e un solo
-- bottone che li faccia entrambi sarebbe il più pericoloso del
-- portale (v. in fondo).
--
-- Quindi lo stato adesso dice tre cose invece di una:
--
--   contentChanged      piatti, prezzi, sezioni, ordine, il nome
--                       del locale, le condizioni al tavolo
--   appearanceChanged   colore, logo, copertina, carattere, stile
--                       delle sezioni, le due manopole
--   allergensChanged    come prima: dentro il contenuto, ma
--                       nominato a parte perché è l'unico che
--                       riguarda la salute di chi legge
--
-- `hasChanges` resta, ed è la somma dei primi due: il portale la
-- usa in tre punti e non c'è motivo di romperli tutti oggi.
--
-- ------------------------------------------------------------
-- L'ASPETTO SI SCRIVE IN UN POSTO SOLO
-- La manopola successiva è già annunciata (la grandezza dei
-- testi, 2026-09-02), e ce ne saranno altre. Se l'elenco dei
-- campi d'aspetto stesse scritto tre volte — nello scatto, nel
-- confronto, nell'annulla — ogni aggiunta sarebbe tre modifiche
-- in tre posti, e la seconda volta che qualcuno se ne dimentica
-- una il confronto comincia a mentire in silenzio.
--
-- Perciò l'elenco sta in venue_appearance(), e da lì lo leggono
-- tutti. Aggiungere una manopola d'aspetto, da oggi in avanti:
--   1. una colonna su partner_venues
--   2. una riga in venue_appearance()
--   3. una riga in venue_appearance_defaults()
--   4. una riga nell'UPDATE di revert_appearance()
-- e da lì in poi lo scatto pubblicato e il confronto "cosa non è
-- ancora in sala" se ne occupano da soli. Nel portale la stessa
-- voce va in VenueAppearance (src/lib/venues.ts), che è l'altra
-- metà dello stesso elenco.
--
-- La PRIMA a passare da questa strada è la grandezza dei testi,
-- qui sotto: la colonna entra adesso, la scatola nel portale
-- arriva quando arriva, e non servirà un'altra migration.
BEGIN;

-- ------------------------------------------------------------
-- 0. LA GRANDEZZA DEI TESTI
-- La colonna si aggiunge ADESSO perché costa una riga e la
-- migration è già aperta; la FUNZIONE — la scatola nel portale,
-- le misure nella pagina al tavolo — è lavoro di interfaccia e
-- non chiederà altre migration. È lo stesso ragionamento con cui
-- la 709 ha aggiunto cover_url, e stavolta vale doppio: con
-- l'aspetto letto da venue_appearance() qui sotto, la colonna è
-- già dentro lo scatto, dentro il confronto e dentro
-- l'annullamento dal primo giorno.
--
-- UN CODICE, non una misura: 'normal' (quello di oggi),
-- 'compact', 'roomy'. Come i caratteri (Tema 25) sono POCHI e
-- decisi da noi, non un cursore — e per la stessa ragione. Un
-- cursore libero finirebbe a rimpicciolire tutto per far stare la
-- carta in una schermata, e la prima riga a diventare illeggibile
-- sarebbe quella degli allergeni.
--
-- ⚠️ QUANDO SI IMPLEMENTA, la cosa che non si negozia: la riga
-- degli allergeni e il motivo dell'esclusione hanno un PAVIMENTO
-- e 'compact' non lo sfonda. Vale già per i pacchetti Classico e
-- Sottile, che compensano quella riga di un punto e di un grigio
-- più scuro: qui è la stessa regola, scritta prima invece che
-- dopo. Chi la toglie si tiene la responsabilità di quella riga,
-- che è letta da una persona con un'allergia, in una sala poco
-- illuminata, mentre qualcuno le chiede cosa ordina.
alter table partner_venues
  add column text_scale text not null default 'normal'
  check (text_scale in ('normal', 'compact', 'roomy'));

comment on column partner_venues.text_scale is
  'Quanto sono grandi i testi del menù al tavolo: normal, compact, roomy. Elenco chiuso come i caratteri (Tema 25). La riga degli allergeni ha un pavimento che compact non sfonda.';

-- ------------------------------------------------------------
-- 1. COS'È L'ASPETTO
-- Le chiavi escono PIATTE come sono sempre state nello scatto —
-- 'accent', 'logoUrl', … — e non annidate sotto un 'appearance':
-- annidarle avrebbe voluto dire cambiare la pagina pubblica e,
-- peggio, lasciare gli scatti già pubblicati in una forma che
-- quella pagina non sa più leggere.
--
-- ⚠️ COSA NON È ASPETTO, e non va spostato qui in un momento di
-- riordino: il nome del locale, lo slug e le condizioni al
-- tavolo. Stanno sulla stessa riga di database e sembrano
-- parenti, ma sono TESTO CHE IL CLIENTE LEGGE — le condizioni al
-- tavolo dicono cosa il locale può garantire su una
-- contaminazione. Finiscono nel contenuto, che non si venderà mai
-- (Tema 23), e un annulla dell'aspetto non deve poterle toccare.
create or replace function venue_appearance(p_venue_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
           'logoUrl', coalesce(v.logo_url, ''),
           'accent', v.accent,
           'coverUrl', coalesce(v.cover_url, ''),
           'headingFont', v.heading_font,
           'sectionStyle', v.section_style,
           'showPhotos', v.show_dish_photos,
           'showDescriptions', v.show_dish_descriptions,
           'textScale', v.text_scale
         )
    from partner_venues v
   where v.id = p_venue_id;
$$;

-- Non è SECURITY DEFINER: chi la chiama vede quello che le RLS gli
-- lasciano vedere, cioè i propri locali. Fuori dal login non serve a
-- nessuno — la pagina pubblica legge lo scatto, non questa — e senza
-- il revoke PostgREST la esporrebbe anche ad anon.
revoke all on function venue_appearance(uuid) from public;
grant execute on function venue_appearance(uuid) to authenticated;

comment on function venue_appearance(uuid) is
  'I campi d''aspetto del menù al tavolo, nella forma piatta dello scatto. È l''elenco canonico: lo leggono build_public_menu, menu_publish_state e l''annullamento nel portale.';

-- QUELLO CHE LA PAGINA PUBBLICA RENDE QUANDO LA CHIAVE NON C'È.
-- Serve per gli scatti presi PRIMA che una manopola esistesse: là
-- dentro 'headingFont' non c'è, e il cliente al tavolo sta
-- leggendo il carattere di sistema, cioè 'modern'. Senza questo
-- ripiego il confronto direbbe "hai cambiato il carattere" a
-- ristoratori che non hanno toccato niente, il primo giorno, e
-- l'avviso in cima all'editor perderebbe credibilità proprio
-- mentre serve a dire che un allergene non è arrivato in sala.
--
-- I valori sono i DEFAULT delle colonne (703, 709): se si cambia
-- un default là, si cambia qui.
create or replace function venue_appearance_defaults()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
           'logoUrl', '',
           'accent', 'charcoal',
           'coverUrl', '',
           'headingFont', 'modern',
           'sectionStyle', 'underline',
           'showPhotos', true,
           'showDescriptions', false,
           'textScale', 'normal'
         );
$$;

revoke all on function venue_appearance_defaults() from public;
grant execute on function venue_appearance_defaults() to authenticated;

-- ------------------------------------------------------------
-- 2. LO SCATTO PRENDE L'ASPETTO DA LÌ
-- Stesso risultato di prima, chiave per chiave: cambia solo da
-- dove arrivano quelle sette voci. Il resto della funzione è
-- identico alla 709.
--
-- ⚠️ QUI SI FERMERÀ IL MURO DEL PREMIUM, quando ci sarà: non sul
-- bottone "Pubblica". Un gate sul bottone terrebbe fermo TUTTO —
-- compreso un allergene corretto — perché il ristoratore ha
-- provato un carattere che non ha pagato. La forma giusta è che
-- qui, per un piano che non copre l'aspetto, si prendano le
-- sette voci dallo scatto precedente invece che dalla riga: il
-- contenuto nuovo va in sala lo stesso, l'aspetto no. Quello che
-- il cliente al tavolo usa non si vende (Tema 23).
create or replace function build_public_menu(p_venue_id uuid)
returns jsonb
language sql
stable
as $$
  with locale as (
    select v.id, v.name, v.slug, v.table_conditions
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
      'tableConditions', coalesce((select table_conditions from locale), ''),
      'menu', jsonb_build_object(
        'name', (select name from menu),
        'description', coalesce((select description from menu), ''),
        'currency', (select currency from menu),
        'groups', coalesce((select jsonb_agg(gruppo order by ordine) from gruppi), '[]'::jsonb)
      )
    ) || venue_appearance(p_venue_id)
  end;
$$;

-- ------------------------------------------------------------
-- 3. LO STATO, ADESSO IN DUE PARTI
-- L'aspetto si confronta CAMPO PER CAMPO contro lo scatto, non
-- con le date. Non è un dettaglio: partner_venues.updated_at si
-- muove per qualunque cosa succeda su quella riga, quindi con le
-- date "cambiare colore" e "correggere le condizioni al tavolo"
-- sarebbero indistinguibili — ed era anche il motivo per cui,
-- fino a ieri, scegliere una tinta accendeva l'avviso esattamente
-- come cambiare un prezzo.
--
-- Il contenuto resta sulle date dove le date bastano (menù,
-- sezioni, righe, piatti del catalogo) e passa al confronto sui
-- valori per le tre voci che stanno sul locale: nome, slug,
-- condizioni. Così updated_at del locale non entra più nel conto,
-- e nessuno dei due generi eredita le modifiche dell'altro.
create or replace function menu_publish_state(p_venue_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with locale as (
    select v.id, v.name, v.slug, v.table_conditions, v.published_at, v.published_menu
      from partner_venues v
     where v.id = p_venue_id
       and v.owner_user_id = auth.uid()
  ),
  menu as (
    select m.id, m.updated_at
      from partner_menus m
      join locale l on l.id = m.venue_id
     order by m.sort_order, m.created_at
     limit 1
  ),
  -- L'ultima modifica della PARTE DEL MENÙ: il menù, le sezioni, le
  -- righe, e i PIATTI del catalogo che questo menù usa — un piatto
  -- corretto da /piatti cambia il menù senza che il menù sia stato
  -- toccato.
  ultima as (
    select greatest(
             (select updated_at from menu),
             coalesce((select max(s.updated_at) from partner_menu_sections s
                        join menu on menu.id = s.menu_id), 'epoch'::timestamptz),
             coalesce((select max(i.updated_at) from partner_menu_items i
                        join menu on menu.id = i.menu_id), 'epoch'::timestamptz),
             coalesce((select max(d.updated_at) from partner_dishes d
                        join partner_menu_items i on i.dish_id = d.id
                        join menu on menu.id = i.menu_id), 'epoch'::timestamptz)
           ) as quando
  ),
  -- L'aspetto di adesso contro quello in sala. Lo scatto si NORMALIZZA
  -- prima: si parte dai default e si sovrascrive con le chiavi che
  -- quello scatto ha davvero, così una manopola nata dopo non risulta
  -- "cambiata" solo perché nello scatto vecchio non c'era.
  aspetto as (
    select venue_appearance(l.id) as adesso,
           venue_appearance_defaults() || coalesce(
             (select jsonb_object_agg(k.key, l.published_menu -> k.key)
                from jsonb_each(venue_appearance_defaults()) k
               where l.published_menu ? k.key),
             '{}'::jsonb) as in_sala
      from locale l
  ),
  -- Le tre voci di contenuto che vivono sul locale.
  testi as (
    select (l.name is distinct from l.published_menu->>'venueName')
        or (l.slug is distinct from l.published_menu->>'slug')
        or (coalesce(l.table_conditions, '')
              is distinct from coalesce(l.published_menu->>'tableConditions', '')) as cambiati
      from locale l
  ),
  allergeni as (
    select bool_or(
             coalesce(to_jsonb(d.declared_allergens), '[]'::jsonb)
               is distinct from coalesce(scatto.riga->'allergens', '[]'::jsonb)
           ) as cambiati
      from partner_menu_items i
      join menu on menu.id = i.menu_id
      join partner_dishes d on d.id = i.dish_id
      left join lateral (
        select riga
          from jsonb_array_elements(
                 coalesce((select published_menu->'menu'->'groups' from locale), '[]'::jsonb)
               ) g,
               jsonb_array_elements(g->'items') riga
         where riga->>'id' = i.id::text
      ) scatto on true
  ),
  -- Mai pubblicato: TUTTO è da pubblicare, e si chiama contenuto. Non
  -- perché l'aspetto non conti, ma perché "modifiche all'aspetto non
  -- ancora in sala" presuppone una sala: senza uno scatto non c'è un
  -- prima a cui tornare, e il bottone che annulla punterebbe al vuoto.
  stato as (
    select (select published_at from locale) as quando,
           (select published_at from locale) is null as mai
  )
  select jsonb_build_object(
    'publishedAt', (select quando from stato),
    'contentChanged', (select mai from stato)
                      or (select quando from ultima) > (select quando from stato)
                      or coalesce((select cambiati from testi), false),
    'appearanceChanged', not (select mai from stato)
                         and (select adesso from aspetto)
                               is distinct from (select in_sala from aspetto),
    'hasChanges', (select mai from stato)
                  or (select quando from ultima) > (select quando from stato)
                  or coalesce((select cambiati from testi), false)
                  or (select adesso from aspetto)
                       is distinct from (select in_sala from aspetto),
    'allergensChanged', coalesce((select cambiati from allergeni), false)
                        and not (select mai from stato)
  )
  where exists (select 1 from locale);
$$;

comment on function menu_publish_state(uuid) is
  'Cosa non è ancora in sala: contentChanged (piatti, prezzi, sezioni, nome, condizioni), appearanceChanged (colore, logo, copertina, carattere, stile), allergensChanged. hasChanges è la somma dei primi due.';

-- ------------------------------------------------------------
-- 4. TORNARE ALL'ASPETTO CHE È IN SALA
-- Rimette le sette voci come stanno nello scatto. È il gesto che
-- serve quando si è provato qualcosa e non lo si vuole tenere —
-- e, il giorno del premium, quando si è provato qualcosa che non
-- si può pubblicare.
--
-- ⚠️ ESISTE SOLO PER L'ASPETTO, e non va "completato" un domani
-- con l'annullamento del contenuto. I fatti dei piatti — nome,
-- allergeni, foto — stanno nel CATALOGO, che è condiviso con la
-- scheda AllergiApp e con gli altri menù: un annulla che li
-- toccasse riporterebbe indietro un allergene corretto, cioè
-- esattamente il danno che tutta la pubblicazione (Tema 24) è
-- costruita per evitare. Qui si tocca solo roba che non dice
-- niente su cosa c'è dentro un piatto.
--
-- Il logo e la copertina dello scatto sono ancora sullo Storage:
-- i loro file non si cancellano finché sono in un menù pubblicato
-- (photo_in_published_menu, chiamata da deleteLogo).
--
-- Restituisce l'aspetto ripristinato, così il portale riallinea
-- quello che mostra senza rileggere la riga. NULL se il locale
-- non è suo o se non c'è nessuno scatto a cui tornare.
create or replace function revert_appearance(p_venue_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  in_sala jsonb;
begin
  select venue_appearance_defaults() || coalesce(
           (select jsonb_object_agg(k.key, v.published_menu -> k.key)
              from jsonb_each(venue_appearance_defaults()) k
             where v.published_menu ? k.key),
           '{}'::jsonb)
    into in_sala
    from partner_venues v
   where v.id = p_venue_id
     and v.owner_user_id = auth.uid()
     and v.published_at is not null
     and v.published_menu is not null;

  if in_sala is null then
    return null;
  end if;

  update partner_venues
     set logo_url = nullif(in_sala->>'logoUrl', ''),
         accent = in_sala->>'accent',
         cover_url = nullif(in_sala->>'coverUrl', ''),
         heading_font = in_sala->>'headingFont',
         section_style = in_sala->>'sectionStyle',
         show_dish_photos = (in_sala->>'showPhotos')::boolean,
         show_dish_descriptions = (in_sala->>'showDescriptions')::boolean,
         text_scale = in_sala->>'textScale'
   where id = p_venue_id
     and owner_user_id = auth.uid();

  return in_sala;
end;
$$;

-- Il controllo del proprietario è scritto a mano, come in publish_menu
-- e unpublish_menu: SECURITY DEFINER scavalca le RLS, e senza quel
-- `where` chiunque potrebbe riscrivere l'aspetto del locale di un altro.
revoke all on function revert_appearance(uuid) from public;
grant execute on function revert_appearance(uuid) to authenticated;

comment on function revert_appearance(uuid) is
  'Rimette l''aspetto del locale com''è nello scatto pubblicato. Solo l''aspetto: il contenuto non si annulla mai da qui (v. commento in 710).';

COMMIT;
