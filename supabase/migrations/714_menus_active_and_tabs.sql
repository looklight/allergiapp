-- ============================================================
-- 714_menus_active_and_tabs.sql
-- STATO: DA APPLICARE a mano via SQL editor, dopo la 712 e la
-- 713. Tracking fermo alla 045: a mano, MAI db push.
--
-- PIÙ MENÙ PER LO STESSO LOCALE, accesi davvero.
--
-- Il modello era già multiplo dalla 704 e le linguette erano già
-- disegnate nell'anteprima del portale: mancava che lo SCATTO le
-- portasse in sala. Fino a ieri build_public_menu aveva `limit 1`
-- — un locale, un menù — quindi accendere l'interruttore nel
-- portale non avrebbe cambiato niente al tavolo.
--
-- ⚠️ LO SCATTO CAMBIA FORMA: `menu` (un oggetto) diventa `menus`
-- (una fila). NON si legge più la forma vecchia, di qua né sul
-- sito: al 06/09 l'unico menù pubblicato è una prova dell'utente.
-- Conseguenza voluta: un locale con uno scatto vecchio risulta
-- «da pubblicare» finché non si preme Pubblica una volta.
--
-- L'INDIRIZZO RESTA UNO SOLO. Il QR è incollato al tavolo e non
-- cambia a mezzogiorno: carta, pranzo e vini stanno dentro la
-- STESSA pagina, come linguette (DIGITAL_MENU.md, Tema 13). Non
-- c'è nessuno slug nuovo, e non ci sarà.
--
-- ⚠️ NOTA DI MERITO, non tecnica: più menù era una delle voci
-- destinate al piano a pagamento ("Il confine del freemium" in
-- DIGITAL_MENU.md). Si accende oggi per tutti su decisione
-- dell'utente (2026-09-06), rimandando la divisione free/premium.
-- Chi legge fra sei mesi: non è una svista.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. IL MENÙ CHE C'È MA NON È IN SALA
-- Serve al caso stagionale: il menù dell'inverno si mette da
-- parte invece di riscriverlo a marzo. Default vero, o i menù
-- che esistono uscirebbero dalla sala da soli.
-- ------------------------------------------------------------
ALTER TABLE partner_menus
  ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN partner_menus.active IS
  'Falso = il menù esiste nel portale ma non è una linguetta al tavolo. Serve ai menù stagionali, che si mettono da parte invece di riscriverli. Solo gli attivi entrano nello scatto.';


-- ------------------------------------------------------------
-- 2. LO SCATTO PORTA TUTTE LE CARTE ATTIVE
-- Ogni carta si porta il suo id: senza, non si potrebbe sapere
-- se la fila dei menù in sala è ancora quella di adesso (v. il
-- confronto qui sotto in menu_publish_state).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION build_public_menu(p_venue_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  with locale as (
    select v.id, v.name, v.slug, v.table_conditions
      from partner_venues v
     where v.id = p_venue_id
  ),
  carte as (
    select m.id, m.name, m.description, m.currency, m.sort_order, m.created_at
      from partner_menus m
      join locale l on l.id = m.venue_id
     where m.active
  ),
  righe as (
    select i.menu_id,
           i.section_id,
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
             'notes', to_jsonb(d.notes),
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
      join carte on carte.id = i.menu_id
      join partner_dishes d on d.id = i.dish_id
  ),
  -- Le righe fuori sezione, una volta per carta. Il group by fa da
  -- sé quello che prima faceva l'having: un gruppo senza righe non
  -- nasce proprio.
  fuori as (
    select menu_id,
           jsonb_build_object(
             'kind', 'section',
             'name', '',
             'description', '',
             'items', jsonb_agg(riga order by sort_order)
           ) as gruppo
      from righe
     where section_id is null
     group by menu_id
  ),
  sezioni as (
    select s.menu_id,
           jsonb_build_object(
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
      join carte on carte.id = s.menu_id
  ),
  gruppi as (
    select menu_id, gruppo, -1 as ordine from fuori
    union all
    select menu_id, gruppo, sort_order from sezioni
  ),
  impaginate as (
    select jsonb_build_object(
             'id', c.id,
             'name', c.name,
             'description', coalesce(c.description, ''),
             'currency', c.currency,
             'groups', coalesce(
               (select jsonb_agg(g.gruppo order by g.ordine)
                  from gruppi g where g.menu_id = c.id),
               '[]'::jsonb)
           ) as carta,
           c.sort_order,
           c.created_at
      from carte c
  )
  select case when (select count(*) from carte) = 0 then null else
    jsonb_build_object(
      'slug', (select slug from locale),
      'venueName', (select name from locale),
      'tableConditions', coalesce((select table_conditions from locale), ''),
      'menus', (select jsonb_agg(carta order by sort_order, created_at) from impaginate)
    ) || venue_appearance(p_venue_id)
  end;
$$;


-- ------------------------------------------------------------
-- 3. LO STATO, CON PIÙ CARTE
-- Tre cose cambiano rispetto alla 710:
--
--   a) le date si guardano su TUTTE le carte attive, non sulla
--      prima;
--   b) spegnere o accendere una carta NON si vede dalle date —
--      updated_at si muove uguale per una correzione di prezzo —
--      quindi la FILA delle carte in sala si confronta per
--      valore, come già si fa con l'aspetto dalla 710. È anche
--      quello che tiene fuori dal nag il menù stagionale messo da
--      parte: se è spento, ritoccarlo non chiede di pubblicare;
--   c) gli allergeni si ripescano dallo scatto attraversando la
--      fila delle carte, e non più l'unica carta. Uno scatto
--      della forma vecchia si legge lo stesso, avvolgendolo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION menu_publish_state(p_venue_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  with locale as (
    select v.id, v.name, v.slug, v.table_conditions, v.published_at, v.published_menu
      from partner_venues v
     where v.id = p_venue_id
       and v.owner_user_id = auth.uid()
  ),
  carte as (
    select m.id, m.updated_at, m.sort_order, m.created_at
      from partner_menus m
      join locale l on l.id = m.venue_id
     where m.active
  ),
  -- Le carte come stanno nello scatto. Legge SOLO la forma nuova:
  -- l'unico menù pubblicato oggi è di prova, quindi non si porta
  -- dietro righe per rileggere una forma che nessuno ha in sala.
  -- Conseguenza voluta: finché non si preme Pubblica una volta, lo
  -- scatto vecchio risulta «da pubblicare», che è la verità.
  in_sala as (
    select coalesce(l.published_menu->'menus', '[]'::jsonb) as carte
      from locale l
  ),
  ultima as (
    select greatest(
             coalesce((select max(updated_at) from carte), 'epoch'::timestamptz),
             coalesce((select max(s.updated_at) from partner_menu_sections s
                        join carte on carte.id = s.menu_id), 'epoch'::timestamptz),
             coalesce((select max(i.updated_at) from partner_menu_items i
                        join carte on carte.id = i.menu_id), 'epoch'::timestamptz),
             coalesce((select max(d.updated_at) from partner_dishes d
                        join partner_menu_items i on i.dish_id = d.id
                        join carte on carte.id = i.menu_id), 'epoch'::timestamptz)
           ) as quando
  ),
  -- La FILA delle carte: quante, quali e in che ordine. Cambia
  -- accendendone una, spegnendola, creandola o riordinandola.
  fila as (
    select coalesce(
             (select jsonb_agg(c.id::text order by c.sort_order, c.created_at) from carte c),
             '[]'::jsonb)
           is distinct from coalesce(
             (select jsonb_agg(x->>'id') from jsonb_array_elements((select carte from in_sala)) x),
             '[]'::jsonb) as cambiata
  ),
  aspetto as (
    select venue_appearance(l.id) as adesso,
           venue_appearance_defaults() || coalesce(
             (select jsonb_object_agg(k.key, l.published_menu -> k.key)
                from jsonb_each(venue_appearance_defaults()) k
               where l.published_menu ? k.key),
             '{}'::jsonb) as in_sala
      from locale l
  ),
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
      join carte on carte.id = i.menu_id
      join partner_dishes d on d.id = i.dish_id
      left join lateral (
        select riga
          from jsonb_array_elements((select carte from in_sala)) carta,
               jsonb_array_elements(carta->'groups') g,
               jsonb_array_elements(g->'items') riga
         where riga->>'id' = i.id::text
      ) scatto on true
  ),
  stato as (
    select (select published_at from locale) as quando,
           (select published_at from locale) is null as mai
  ),
  -- Il contenuto è cambiato se lo dicono le date, i testi del
  -- locale o la fila delle carte. Scritto una volta e riusato due,
  -- che è anche il modo di non farli divergere.
  contenuto as (
    select (select mai from stato)
           or (select quando from ultima) > (select quando from stato)
           or coalesce((select cambiati from testi), false)
           or coalesce((select cambiata from fila), false) as cambiato
  )
  select jsonb_build_object(
    'publishedAt', (select quando from stato),
    'contentChanged', (select cambiato from contenuto),
    'appearanceChanged', not (select mai from stato)
                         and (select adesso from aspetto)
                               is distinct from (select in_sala from aspetto),
    'hasChanges', (select cambiato from contenuto)
                  or (select adesso from aspetto)
                       is distinct from (select in_sala from aspetto),
    'allergensChanged', coalesce((select cambiati from allergeni), false)
  )
  where exists (select 1 from locale);
$$;

COMMENT ON FUNCTION menu_publish_state(uuid) IS
  'Cosa non è ancora in sala: contentChanged (piatti, prezzi, sezioni, nome, condizioni, e QUALI menù sono attivi), appearanceChanged (colore, logo, copertina, carattere, stile), allergensChanged. hasChanges è la somma dei primi due.';

COMMENT ON FUNCTION build_public_menu(uuid) IS
  'Lo scatto del menù al tavolo: tutte le carte ATTIVE del locale (chiave `menus`, una per linguetta) più l''aspetto. NULL se il locale non ha nessuna carta attiva.';

COMMIT;
