-- ============================================================
-- 721_menu_social_links.sql
-- STATO: BOZZA, da applicare a mano dal SQL editor.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- I LINK DEL RISTORATORE IN FONDO AL MENÙ AL TAVOLO.
--
-- Voluti il 2026-09-06 e rimasti in sospeso perché non valeva una migration
-- da soli: adesso escono insieme al resto (decisione dell'utente, 16/09).
-- Il tipo `social` su partner_links esiste dalla 711, ma nessuno lo leggeva:
-- lo scatto non li portava in sala, quindi non comparivano da nessuna parte.
--
-- QUALI: `social` e `website`. NON gli altri, ed è una scelta di merito
-- (Tema 6): prenotazione, delivery e «menù esterno» sono pensati per chi
-- sceglie un ristorante da lontano, e al tavolo sono sbagliati — chi è
-- seduto non prenota, non ordina su Glovo pagando la commissione al locale
-- che lo sta servendo, e il menù esterno è la pagina che ha in mano.
--
-- ⚠️ MAI IL TELEFONO. `partner_links.phone` esiste per la prenotazione e
-- resta fuori dallo scatto: quella pagina la legge chiunque inquadri il QR,
-- e un numero di telefono lì dentro è un numero pubblicato.
--
-- SONO PREMIUM, come il logo e per la stessa ragione: sono il locale che si
-- presenta, la famiglia dell'identità. Quindi passano dallo stesso muro
-- dell'aspetto — senza abbonamento lo scatto esce senza la fila.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. LA FILA, COM'È FATTA E CHI HA DIRITTO DI VEDERLA
-- Una funzione a parte e non due righe dentro build_public_menu: la legge
-- anche il confronto «cosa non è ancora in sala», e le due devono dire la
-- stessa cosa o il ristoratore vede un avviso che non sparisce.
-- ------------------------------------------------------------
create or replace function venue_public_links(p_venue_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not venue_subscription_active(p_venue_id) then '[]'::jsonb
    else coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'kind', l.kind,
                  -- Il provider NON si chiede al ristoratore: si deduce
                  -- dall'indirizzo nel portale e si riscrive a ogni
                  -- salvataggio (deciso il 06/09). Così l'icona non può
                  -- mentire: un link Facebook sotto il logo di Instagram è
                  -- l'errore normale, quello senza cattive intenzioni.
                  'provider', coalesce(l.provider, 'other'),
                  'label', coalesce(l.label, ''),
                  'url', l.url
                ) order by l.sort_order, l.created_at)
         from partner_links l
        where l.venue_id = p_venue_id
          and l.kind in ('social', 'website')
          -- ⚠️ SOLO http e https. Il portale già non ne salva altri
          -- (normalizeUrl), ma questa pagina la legge chiunque inquadri il
          -- QR: l'ultimo controllo sta dove si costruisce quello che va in
          -- sala, non dove si scrive.
          and l.url ~* '^https?://'),
      '[]'::jsonb)
  end;
$$;

revoke all on function venue_public_links(uuid) from public;
grant execute on function venue_public_links(uuid) to authenticated;

comment on function venue_public_links(uuid) is
  'La fila di link in fondo al menù al tavolo: social e sito, mai prenotazione, delivery o telefono (Tema 6). Vuota senza abbonamento: sono identità del locale, come il logo, e passano dallo stesso muro.';


-- ------------------------------------------------------------
-- 2. LO SCATTO SE LI PORTA
-- Solo la riga finale cambia rispetto alla 718: una chiave `links` accanto
-- all'aspetto. La funzione si ricopia intera perché è così che PostgreSQL
-- sostituisce una funzione.
-- ------------------------------------------------------------
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
      'links', venue_public_links(p_venue_id),
      'menus', (select jsonb_agg(carta order by sort_order, created_at) from impaginate)
    ) || venue_appearance_public(p_venue_id)
  end;
$$;


-- ------------------------------------------------------------
-- 3. «COSA NON È ANCORA IN SALA» GUARDA ANCHE LA FILA
--
-- ⚠️ SENZA QUESTO PEZZO, aggiungere un social non farebbe comparire nessun
-- avviso: il ristoratore lo salverebbe, non vedrebbe niente cambiare al
-- tavolo, e non avrebbe modo di capire che manca una pubblicazione. Il
-- confronto usa la stessa funzione dello scatto, quindi per chi non ha
-- l'abbonamento le due parti sono vuote tutt'e due e nessun avviso compare:
-- il muro non diventa un nag.
-- ------------------------------------------------------------
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
  carte as (
    select m.id, m.updated_at, m.sort_order, m.created_at
      from partner_menus m
      join locale l on l.id = m.venue_id
     where m.active
  ),
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
  fila as (
    select coalesce(
             (select jsonb_agg(c.id::text order by c.sort_order, c.created_at) from carte c),
             '[]'::jsonb)
           is distinct from coalesce(
             (select jsonb_agg(x->>'id') from jsonb_array_elements((select carte from in_sala)) x),
             '[]'::jsonb) as cambiata
  ),
  aspetto as (
    select venue_appearance_public(l.id) as adesso,
           venue_appearance_defaults() || coalesce(
             (select jsonb_object_agg(k.key, l.published_menu -> k.key)
                from jsonb_each(venue_appearance_defaults()) k
               where l.published_menu ? k.key),
             '{}'::jsonb) as in_sala
      from locale l
  ),
  -- LA FILA DEI LINK, confrontata per valore come l'aspetto: non ha una
  -- data da guardare (partner_links ha updated_at, ma cancellarne uno non
  -- muove nessuna data che resti).
  collegamenti as (
    select venue_public_links(l.id)
             is distinct from coalesce(l.published_menu->'links', '[]'::jsonb) as cambiati
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
  -- I link contano come CONTENUTO e non come aspetto: si annullano col
  -- «torna all'aspetto pubblicato»? No — quel bottone rimette colori e
  -- stili, e portarsi via anche i link sarebbe una sorpresa. Stanno col
  -- resto di quello che c'è scritto nella pagina.
  contenuto as (
    select (select mai from stato)
           or (select quando from ultima) > (select quando from stato)
           or coalesce((select cambiati from testi), false)
           or coalesce((select cambiati from collegamenti), false)
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

COMMIT;
