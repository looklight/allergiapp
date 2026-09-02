-- Migration 708: la pagina pubblica del menù — pubblicazione, aspetto, lettura
--
-- STATO: DA APPLICARE via SQL editor, DOPO la 707 (il tracking locale è
-- fermo alla 045: questa, come tutte le 046+, va eseguita a mano — MAI
-- db push).
--
-- Tre cose che vanno insieme perché servono tutte alla stessa pagina:
-- quella che il cliente apre col QR (DIGITAL_MENU.md, fase 2).
--
--   1. QUANDO il menù diventa pubblico   → published_at
--   2. COME si vede                      → show_dish_photos, show_dish_descriptions
--   3. COSA esce da qui                  → get_public_menu()
--
-- ------------------------------------------------------------
-- 1. LA PUBBLICAZIONE È UNO STATO IN AVANTI (Tema 20)
-- Non un interruttore: NULL = non ancora pubblicato, una data =
-- pubblicato. Il QR è plastificato sul tavolo, quindi prima si
-- lavora tranquilli (l'indirizzo non risponde a nessuno) e dopo
-- non si torna indietro con un clic — "disattivare" non
-- nasconderebbe niente, trasformerebbe un oggetto fisico già in
-- giro per il locale in un cartello che porta a una pagina morta.
--
-- Perché una DATA e non un booleano: la data risponde anche a
-- "da quando", che serve alle statistiche degli scan (Tema 10) e
-- a capire, guardando una riga, se il QR di quel locale è in giro
-- da ieri o da un anno.
BEGIN;

alter table partner_venues
  add column published_at timestamptz;

comment on column partner_venues.published_at is
  'NULL = menù non ancora pubblico. Una data = da quando lo è. Vedi DIGITAL_MENU.md Tema 20: si va in avanti, non è un interruttore.';

-- ------------------------------------------------------------
-- 2. L'ASPETTO DEL MENÙ, sul LOCALE e non sul menù
-- Come il logo e il colore (703): al tavolo è UNA pagina sola, e
-- se un giorno tornassero più menù sarebbero linguette della
-- stessa pagina — impostazioni diverse fra una linguetta e
-- l'altra sarebbero due menù travestiti da uno.
--
-- LE FOTO: stanno sul PIATTO nel catalogo, e sono caricate una
-- volta sola. Qui non si duplica niente: si decide solo se QUESTA
-- superficie le mostra. La scheda AllergiApp in app continua a
-- mostrarle comunque — là siamo noi a presentare un ristorante a
-- chi lo sceglie da lontano, e la foto è quello che convince a
-- entrare; al tavolo, chi è già seduto, la usa meno.
--
-- Acceso di default perché è il comportamento di oggi. E resta
-- comunque vero che se NESSUN piatto del menù ha una foto la
-- colonna sparisce da sé: quello lo decide il contenuto, non
-- questo interruttore, che serve a chi le foto ce l'ha e non le
-- vuole al tavolo.
alter table partner_venues
  add column show_dish_photos boolean not null default true;

-- LE DESCRIZIONI: oggi in lista c'è solo una "i" accanto al nome e
-- il testo si legge aprendo il piatto — giusto per una carta
-- fitta, stretto per chi ha dieci piatti e vuole raccontarli.
-- Spento di default, sempre perché è il comportamento di oggi.
alter table partner_venues
  add column show_dish_descriptions boolean not null default false;

comment on column partner_venues.show_dish_photos is
  'Il menù al tavolo mostra le foto dei piatti. La foto sta sul piatto nel catalogo: qui si decide solo se questa superficie la mostra.';

-- ------------------------------------------------------------
-- 3. COSA ESCE DA QUI, E NIENT'ALTRO
-- La pagina pubblica non ha un utente: la apre chiunque inquadri
-- il QR (Tema 6). Le RLS della 703/704 mostrano a ogni partner
-- solo la propria roba, ed è giusto che restino così — quindi la
-- lettura pubblica passa da QUESTA funzione, che è l'unico punto
-- in cui i dati escono, e ne esce una proiezione decisa qui:
-- nome, colore, logo, condizioni al tavolo, sezioni, piatti,
-- prezzi, allergeni.
--
-- NON escono: chi è il proprietario, gli id interni delle
-- sezioni, le categorie che servono all'app, le date di
-- modifica, i piatti del catalogo che in questo menù non ci sono.
-- Aggiungere un campo qui è una decisione, non una comodità: da
-- questa funzione passa tutto quello che il mondo può leggere.
--
-- Il piatto esce GIÀ FUSO con la sua riga di menù — nome,
-- allergeni, prezzo, evidenza tutto insieme — perché al cliente
-- non interessa che esista un catalogo: quella è una faccenda del
-- ristoratore.
--
-- p_language: il nome e la descrizione tradotti, se quella lingua
-- c'è (partner_dish_translations, Tema 9). Il ripiego è sempre
-- l'originale, mai il vuoto. Le condizioni al tavolo e i blocchi
-- di testo non hanno ancora traduzioni: è il punto lasciato
-- aperto dal Tema 18, e si vede al primo cliente straniero.
--
-- Un menù NON pubblicato non esce di qui: restituisce NULL, e la
-- pagina dirà che il menù non è disponibile (mai un 404 secco
-- davanti a un cliente seduto al tavolo).
create or replace function get_public_menu(p_slug text, p_language text default null)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with locale as (
    select v.id, v.name, v.slug, v.logo_url, v.accent, v.table_conditions,
           v.show_dish_photos, v.show_dish_descriptions
      from partner_venues v
     where v.slug = p_slug
       and v.published_at is not null
     limit 1
  ),
  -- Un locale ha un menù solo (l'interruttore MULTI_MENU nel portale è
  -- spento, DIGITAL_MENU.md Tema 19). Se un giorno se ne riaccendono di
  -- più, qui diventano le linguette: si toglie il LIMIT e si restituisce
  -- un elenco invece di un oggetto.
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
             'name', coalesce(nullif(tr.name, ''), d.name),
             'description', coalesce(nullif(tr.description, ''), d.description, ''),
             'priceCents', i.price_cents,
             'highlighted', i.highlighted,
             'highlightNote', coalesce(i.highlight_note, ''),
             'allergens', to_jsonb(d.declared_allergens),
             'diets', to_jsonb(d.diet_tags),
             'thumbUrl', coalesce(d.photo_thumb_url, d.photo_url, ''),
             'photoUrl', coalesce(d.photo_url, '')
           ) as riga
      from partner_menu_items i
      join menu on menu.id = i.menu_id
      join partner_dishes d on d.id = i.dish_id
      left join partner_dish_translations tr
        on tr.dish_id = d.id and tr.language = p_language
  ),
  -- Le righe fuori sezione stanno in cima, come nell'editor: sono una
  -- sezione senza nome, non un caso a parte.
  fuori as (
    select jsonb_build_object(
             'kind', 'section',
             'name', '',
             'description', '',
             'items', coalesce(jsonb_agg(riga order by sort_order), '[]'::jsonb)
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

-- Chi la può chiamare: chiunque, autenticato o no. È il punto della
-- pagina pubblica — il cliente al tavolo non ha un account e non deve
-- averlo (Tema 6). Non ci sono dati personali qui dentro: solo quello
-- che il ristoratore ha scritto per essere letto in sala.
revoke all on function get_public_menu(text, text) from public;
grant execute on function get_public_menu(text, text) to anon, authenticated;

comment on function get_public_menu(text, text) is
  'La proiezione pubblica del menù di un locale pubblicato. Unico punto da cui i dati del menù escono verso il mondo: aggiungere un campo qui è una decisione, non una comodità.';

COMMIT;
