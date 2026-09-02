-- Migration 708: la pagina pubblica del menù — pubblicazione, aspetto, lettura
--
-- STATO: DA APPLICARE via SQL editor, DOPO la 707 (il tracking locale è
-- fermo alla 045: questa, come tutte le 046+, va eseguita a mano — MAI
-- db push).
--
-- Le cose che servono alla pagina che il cliente apre col QR
-- (DIGITAL_MENU.md, fase 2):
--
--   1. QUANDO il menù diventa pubblico   → published_at
--   2. COSA è pubblico                   → published_menu (lo scatto)
--   3. COME si vede                      → show_dish_photos, show_dish_descriptions
--   4. CHI pubblica                      → publish_menu()
--   5. COSA esce verso il mondo          → get_public_menu()
--   6. CI SONO MODIFICHE NON PUBBLICATE? → menu_publish_state()
--
-- ------------------------------------------------------------
-- BOZZA E PUBBLICATO SONO DUE COSE (deciso il 2026-09-02)
-- Il portale continua a salvare da solo mentre si scrive: la
-- bozza non si perde mai, ed è la ragione per cui il salvataggio
-- automatico NON è stato tolto. Ma quello che il cliente legge al
-- tavolo cambia solo quando il ristoratore preme "Pubblica le
-- modifiche".
--
-- Perché: senza, un ristoratore che riorganizza la carta alle
-- sette e mezza la darebbe in pasto ai clienti a metà — una
-- sezione vuota e tre prezzi ancora da correggere. E, come ha
-- detto l'utente, il gesto dà peso al lavoro: si guarda meglio
-- quello che si sta per mettere in sala.
--
-- ⚠️ IL RISCHIO CHE QUESTA SCELTA INTRODUCE, e va presidiato dal
-- portale: un allergene corretto e mai pubblicato resta vecchio
-- sul tavolo, e nessuno se ne accorge — nel portale la correzione
-- si vede. Per questo menu_publish_state() qui sotto non dice
-- solo "ci sono modifiche": dice anche se toccano gli ALLERGENI,
-- così l'avviso può nominare il rischio invece di essere
-- l'ennesima scritta grigia.
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

-- LO SCATTO: il menù com'era al momento della pubblicazione, già
-- nella forma che legge la pagina pubblica. Non è una cache da
-- poter buttare: è LA versione pubblica, l'unica che il cliente
-- vede, e le tabelle del menù da qui in poi sono la bozza.
--
-- Ci sta dentro anche le traduzioni dei piatti, una per lingua
-- (`i18n`), perché il menù pubblicato deve restare fermo in tutte
-- le lingue: tradurre al momento della lettura vorrebbe dire che
-- una traduzione corretta dopo la pubblicazione va in sala da
-- sola, mentre il piatto accanto è ancora quello vecchio.
alter table partner_venues
  add column published_menu jsonb;

comment on column partner_venues.published_at is
  'NULL = menù non ancora pubblico. Una data = quando è stato pubblicato l''ultima volta. Vedi DIGITAL_MENU.md Tema 20: si va in avanti, non è un interruttore.';

comment on column partner_venues.published_menu is
  'Il menù come lo legge il cliente al tavolo: lo scatto preso da publish_menu(). Le tabelle partner_menu* sono la bozza.';

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
-- 4. LO SCATTO: COSA FINISCE NEL PUBBLICATO, E NIENT'ALTRO
-- La proiezione pubblica è definita QUI, in un posto solo, e da
-- qui passa tutto quello che il mondo potrà leggere: nome,
-- colore, logo, condizioni al tavolo, sezioni, piatti, prezzi,
-- allergeni.
--
-- NON ci finiscono: chi è il proprietario, le categorie che
-- servono all'app, le date di modifica, i piatti del catalogo che
-- in questo menù non ci sono. Aggiungere un campo qui è una
-- decisione, non una comodità.
--
-- Il piatto esce GIÀ FUSO con la sua riga di menù — nome,
-- allergeni, prezzo, evidenza tutto insieme — perché al cliente
-- non interessa che esista un catalogo: quella è una faccenda del
-- ristoratore.
--
-- `i18n` porta le traduzioni dei piatti dentro lo scatto
-- (partner_dish_translations, Tema 9). Le condizioni al tavolo e
-- i blocchi di testo NON sono tradotti: è il punto lasciato
-- aperto dal Tema 18, e si vede al primo cliente straniero.
--
-- Non è SECURITY DEFINER e non la chiama nessuno da fuori: è il
-- pezzo condiviso fra publish_menu() e chi un domani volesse
-- un'anteprima del pubblicato.
create or replace function build_public_menu(p_venue_id uuid)
returns jsonb
language sql
stable
as $$
  with locale as (
    select v.id, v.name, v.slug, v.logo_url, v.accent, v.table_conditions,
           v.show_dish_photos, v.show_dish_descriptions
      from partner_venues v
     where v.id = p_venue_id
  ),
  -- Un locale ha un menù solo (MULTI_MENU spento nel portale, Tema 19).
  -- Se un giorno se ne riaccendono di più, qui diventano le linguette:
  -- si toglie il LIMIT e si restituisce un elenco invece di un oggetto.
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
  -- Le righe fuori sezione stanno in cima, come nell'editor: sono una
  -- sezione senza nome, non un caso a parte.
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
-- 5. PUBBLICARE
-- Prende lo scatto e lo mette in sala. È l'unico gesto che cambia
-- quello che il cliente legge: da qui in poi le tabelle del menù
-- sono la bozza, e possono essere in qualunque stato.
--
-- SECURITY DEFINER ma con il controllo del proprietario scritto a
-- mano: la funzione scrive su una riga che le RLS proteggono, e
-- senza questo `where` chiunque potrebbe pubblicare il menù di un
-- altro. Restituisce NULL se il locale non è suo o se non ha un
-- menù da pubblicare — il portale lo mostra invece di far finta.
create or replace function publish_menu(p_venue_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  scatto jsonb;
  quando timestamptz;
begin
  select build_public_menu(v.id) into scatto
    from partner_venues v
   where v.id = p_venue_id
     and v.owner_user_id = auth.uid();

  if scatto is null then
    return null;
  end if;

  update partner_venues
     set published_menu = scatto,
         published_at = now()
   where id = p_venue_id
     and owner_user_id = auth.uid()
  returning published_at into quando;

  return quando;
end;
$$;

revoke all on function publish_menu(uuid) from public;
grant execute on function publish_menu(uuid) to authenticated;

-- ------------------------------------------------------------
-- 6. COSA LEGGE IL CLIENTE AL TAVOLO
-- La pagina pubblica non ha un utente: la apre chiunque inquadri
-- il QR (Tema 6). Legge SOLO lo scatto — una riga, nessun innesto
-- da ricomporre — e non tocca mai le tabelle della bozza.
--
-- La lingua si risolve qui: si prende la traduzione se c'è, e il
-- ripiego è sempre l'originale, mai il vuoto. `i18n` non esce:
-- al cliente arriva il menù in una lingua sola, la sua.
--
-- Un menù mai pubblicato non esce di qui: restituisce NULL, e la
-- pagina dirà che il menù non è al momento disponibile (mai un
-- 404 secco davanti a un cliente seduto al tavolo).
create or replace function get_public_menu(p_slug text, p_language text default null)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with pubblicato as (
    select v.published_menu as snap
      from partner_venues v
     where v.slug = p_slug
       and v.published_at is not null
       and v.published_menu is not null
     limit 1
  )
  select jsonb_set(
           snap,
           '{menu,groups}',
           coalesce((
             select jsonb_agg(
                      case
                        when g->>'kind' = 'note' then g
                        else jsonb_set(g, '{items}', coalesce((
                          select jsonb_agg(
                                   (i - 'i18n') || jsonb_build_object(
                                     'name', coalesce(
                                       nullif(i #>> array['i18n', coalesce(p_language, ''), 'name'], ''),
                                       i->>'name'),
                                     'description', coalesce(
                                       nullif(i #>> array['i18n', coalesce(p_language, ''), 'description'], ''),
                                       i->>'description')
                                   )
                                 )
                            from jsonb_array_elements(g->'items') i
                        ), '[]'::jsonb))
                      end
                    )
               from jsonb_array_elements(snap->'menu'->'groups') g
           ), '[]'::jsonb)
         )
    from pubblicato;
$$;

-- Chi la può chiamare: chiunque, autenticato o no. È il punto della
-- pagina pubblica — il cliente al tavolo non ha un account e non deve
-- averlo. Non ci sono dati personali qui dentro: solo quello che il
-- ristoratore ha scritto per essere letto in sala.
revoke all on function get_public_menu(text, text) from public;
grant execute on function get_public_menu(text, text) to anon, authenticated;

comment on function get_public_menu(text, text) is
  'Il menù pubblicato di un locale, nella lingua chiesta. Legge solo lo scatto: la bozza non esce mai di qui.';

-- ------------------------------------------------------------
-- 7. "CI SONO MODIFICHE NON PUBBLICATE?"
-- Serve all'avviso in cima all'editor. Dice tre cose:
--
--   publishedAt        quando è stato pubblicato l'ultima volta
--   hasChanges         la bozza è più recente dello scatto
--   allergensChanged   e fra le modifiche ci sono ALLERGENI
--
-- La terza è la mitigazione del rischio che la pubblicazione
-- introduce: un allergene corretto e mai pubblicato resta vecchio
-- sul tavolo. L'avviso deve poter dire "hai corretto gli
-- allergeni di 2 piatti e al tavolo si legge ancora la versione
-- precedente", che è un'altra cosa rispetto a "hai modifiche".
--
-- Il confronto degli allergeni è fatto sullo SCATTO e non sulle
-- date: una data più recente non dice cosa è cambiato, e un
-- ristoratore che ha solo corretto un prezzo non deve leggere un
-- avviso che parla di allergie.
create or replace function menu_publish_state(p_venue_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with locale as (
    select v.id, v.published_at, v.published_menu, v.updated_at
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
  -- L'ultima modifica della bozza, ovunque sia stata fatta: il locale
  -- (nome, colore, condizioni, le due manopole), il menù, le sezioni, le
  -- righe, e i PIATTI del catalogo che questo menù usa — un piatto
  -- corretto da /piatti cambia il menù senza che il menù sia stato toccato.
  ultima as (
    select greatest(
             (select updated_at from locale),
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
  -- Gli allergeni di adesso, riga per riga, contro quelli dello scatto
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
  )
  select jsonb_build_object(
    'publishedAt', (select published_at from locale),
    'hasChanges', (select published_at from locale) is null
                  or (select quando from ultima) > (select published_at from locale),
    'allergensChanged', coalesce((select cambiati from allergeni), false)
                        and (select published_at from locale) is not null
  )
  where exists (select 1 from locale);
$$;

revoke all on function menu_publish_state(uuid) from public;
grant execute on function menu_publish_state(uuid) to authenticated;

-- ------------------------------------------------------------
-- 8. LA FOTO CHE NON SI PUÒ ANCORA CANCELLARE
-- Sostituendo la foto di un piatto, il portale cancella subito il
-- file vecchio dallo Storage. Con lo scatto pubblicato che punta
-- ancora a quel file, il risultato sarebbe un'IMMAGINE ROTTA sul
-- menù al tavolo — e invisibile dal portale, dove si vede la foto
-- nuova.
--
-- Quindi prima di cancellare il portale chiede qui. Il confronto
-- è sul testo del JSON e non su un percorso strutturato: l'URL
-- compare come valore di thumbUrl o photoUrl e basta trovarlo,
-- mentre camminare l'albero costerebbe tre livelli di
-- jsonb_array_elements per rispondere sì o no.
--
-- Il file resta lì finché quel locale non pubblica di nuovo, e da
-- quel momento non lo referenzia più nessuno: è un file orfano,
-- cioè qualche decina di KB. Un'immagine rotta davanti a un
-- cliente costa molto di più.
create or replace function photo_in_published_menu(p_url text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from partner_venues v
     where v.owner_user_id = auth.uid()
       and v.published_menu is not null
       and p_url <> ''
       and v.published_menu::text like '%' || p_url || '%'
  );
$$;

revoke all on function photo_in_published_menu(text) from public;
grant execute on function photo_in_published_menu(text) to authenticated;

COMMIT;
