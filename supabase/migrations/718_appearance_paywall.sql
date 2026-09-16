-- ============================================================
-- 718_appearance_paywall.sql
-- STATO: BOZZA, da applicare a mano dal SQL editor.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- L'ASPETTO DEL MENÙ DIVENTA LA PRIMA COSA A PAGAMENTO.
--
-- ⚠️ IL MURO NON STA SUL BOTTONE. Le manopole si toccano sempre e
-- l'anteprima le mostra a tutti (DIGITAL_MENU.md, Tema 27): quello che
-- l'abbonamento compra è portarle AL TAVOLO. Un lucchetto su ogni comando
-- avrebbe reso il portale un catalogo di cose che non puoi fare; così invece
-- il ristoratore vede il suo menù come sarebbe, e decide.
--
-- IL CONFINE (deciso il 2026-09-16). Undici manopole su tredici passano dal
-- muro. Restano gratis le DUE che non sono aspetto ma CONTENUTO del piatto:
--
--   showPhotos         le foto dei piatti
--   showDescriptions   le descrizioni
--
-- Spegnerle a chi non paga toglierebbe informazione al cliente seduto al
-- tavolo, non decorazione al ristoratore — e le descrizioni nascono accese
-- apposta dal 06/09. Vale la regola di sempre: mai limitare quello che vede
-- il cliente al tavolo.
--
-- COSA SUCCEDE AI DUE ESTREMI:
--   si abbona    il suo aspetto NON va in sala da solo: il portale dice
--                «hai modifiche non pubblicate» e lui preme Pubblica. È lui
--                a scegliere quando cambia il menù che i clienti stanno
--                leggendo.
--   finisce      l'aspetto se ne va DA SOLO, con un trigger: non si può
--                aspettare che prema qualcosa chi ha appena smesso di
--                pagare. Il contenuto dello scatto non si tocca — piatti,
--                prezzi e sezioni restano esattamente com'erano.
--
-- ⚠️ BUCO NOTO, accettato: un abbonamento CONCESSO A MANO che scade per
-- data non fa scattare nessun trigger (nessuno tocca la riga), quindi il suo
-- aspetto resta in sala fino alla pubblicazione successiva o finché un admin
-- non revoca — cosa che invece la riga la tocca. Riguarda solo le
-- concessioni nostre, che sono poche e sotto il nostro occhio. La cura vera,
-- il giorno che servisse, è applicare il muro anche in lettura sul sito.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. L'ASPETTO CHE ARRIVA DAVVERO AL TAVOLO
-- Una funzione sola, e tutti passano da qui: lo scatto che si costruisce,
-- l'avviso delle modifiche non pubblicate, e il trigger qui sotto. Se il
-- confine si sposterà, si sposta in un punto solo.
-- ------------------------------------------------------------
create or replace function venue_appearance_public(p_venue_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when venue_subscription_active(p_venue_id) then venue_appearance(p_venue_id)
    -- Senza abbonamento: tutto ai valori di partenza, tranne le due chiavi
    -- che sono contenuto del piatto e non aspetto.
    else venue_appearance_defaults()
         || jsonb_build_object(
              'showPhotos', venue_appearance(p_venue_id) -> 'showPhotos',
              'showDescriptions', venue_appearance(p_venue_id) -> 'showDescriptions'
            )
  end;
$$;

revoke all on function venue_appearance_public(uuid) from public;
grant execute on function venue_appearance_public(uuid) to authenticated;

comment on function venue_appearance_public(uuid) is
  'L''aspetto che arriva al tavolo: quello scelto dal ristoratore se il locale ha un abbonamento attivo, altrimenti i valori di partenza — tranne foto e descrizioni dei piatti, che sono contenuto e restano sempre le sue. Vedi MONETIZATION.md, «Listino attuale».';


-- ------------------------------------------------------------
-- 2. LO SCATTO PASSA DAL MURO
-- Identica alla 714 tranne l'ultima riga: venue_appearance_public al posto
-- di venue_appearance. Si ricopia intera perché è così che PostgreSQL
-- sostituisce una funzione — e chi legge questa migration deve poter vedere
-- cosa finisce in sala senza rincorrere quattro file.
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
      'menus', (select jsonb_agg(carta order by sort_order, created_at) from impaginate)
    ) || venue_appearance_public(p_venue_id)
  end;
$$;


-- ------------------------------------------------------------
-- 3. L'AVVISO DELLE MODIFICHE NON PUBBLICATE GUARDA LO STESSO ASPETTO
-- ⚠️ SENZA QUESTO PEZZO il muro sarebbe un nag perpetuo: un locale gratuito
-- che ha toccato una manopola risulterebbe PER SEMPRE «da pubblicare»,
-- perché il suo aspetto non coinciderebbe mai con quello in sala — e
-- premere Pubblica non lo farebbe sparire. È il genere di difetto che
-- insegna al ristoratore a ignorare l'avviso, e allora l'avviso non serve
-- più a niente nemmeno quando ha ragione.
--
-- Conseguenza voluta all'abbonamento: appena l'abbonamento parte, il
-- confronto si fa col suo aspetto vero e l'avviso compare — che è
-- esattamente l'invito giusto («il tuo aspetto non è ancora al tavolo,
-- premi Pubblica»).
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
    -- L'UNICA RIGA CAMBIATA rispetto alla 714: si confronta quello che
    -- arriverebbe al tavolo, non quello che il ristoratore ha scelto.
    select venue_appearance_public(l.id) as adesso,
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


-- ------------------------------------------------------------
-- 4. QUANDO L'ABBONAMENTO FINISCE, L'ASPETTO ESCE DALLA SALA DA SOLO
--
-- Si riscrivono SOLO le chiavi dell'aspetto dentro lo scatto già
-- pubblicato. ⚠️ Non si ricostruisce lo scatto con build_public_menu:
-- porterebbe al tavolo anche le modifiche al MENÙ che il ristoratore non
-- ha ancora pubblicato — prezzi ritoccati, piatti a metà. La fine di un
-- abbonamento non deve pubblicare niente che lui non abbia scelto.
--
-- Solo in discesa: quando invece l'abbonamento PARTE non si tocca niente,
-- ed è lui a premere Pubblica quando vuole. Chi paga sceglie il momento in
-- cui cambia il menù che i clienti stanno leggendo; chi smette di pagare
-- non si può aspettare che prema qualcosa.
-- ------------------------------------------------------------
create or replace function sync_public_appearance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  v_id := coalesce(new.venue_id, old.venue_id);

  if venue_subscription_active(v_id) then
    return coalesce(new, old);   -- in salita non si tocca niente
  end if;

  update partner_venues v
     set published_menu = v.published_menu || venue_appearance_public(v.id)
   where v.id = v_id
     and v.published_menu is not null;

  return coalesce(new, old);
end;
$$;

drop trigger if exists partner_subscriptions_sync_appearance on partner_subscriptions;

create trigger partner_subscriptions_sync_appearance
after insert or update or delete on partner_subscriptions
for each row execute function sync_public_appearance();

comment on function sync_public_appearance() is
  'Quando un abbonamento si chiude, toglie dallo scatto pubblicato le manopole d''aspetto a pagamento, senza toccare piatti, prezzi e sezioni. Non agisce quando l''abbonamento parte: quello lo pubblica il ristoratore.';

COMMIT;
