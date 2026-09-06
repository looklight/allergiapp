-- ============================================================
-- 713_dish_categories_and_notes.sql
-- STATO: DA APPLICARE a mano via SQL editor, nella stessa
-- seduta della 712. Il tracking locale è fermo alla 045: questa,
-- come tutte le 046+, va applicata a mano — MAI db push.
--
-- Tre cose, tutte sul catalogo dei piatti:
--
-- 1. LE CATEGORIE DIVENTANO DICIOTTO. Restano un SET FISSO —
--    la 700 lo aveva deciso e la decisione regge: sono l'indice
--    comune che rende confrontabili i ristoranti fra loro e che
--    possiamo tradurre noi in 15 lingue. Un testo libero qui
--    sarebbe una seconda sezione, e le sezioni esistono già.
--    Mancavano però le voci di chi non fa cucina italiana
--    classica: una pizzeria non ha "Primi", un bar non ha
--    "Secondi", un sushi non ha niente di tutto questo.
--
-- 2. OGNUNO NASCONDE QUELLE CHE NON USA. È la personalizzazione
--    vera senza rompere né le traduzioni né la confrontabilità:
--    la pizzeria smette di vedere Primi e Contorni nelle tendine,
--    ma il giorno che mette una pasta in carta la categoria è
--    ancora lì, con lo stesso codice di tutti gli altri.
--    Sull'ACCOUNT e non sul locale, perché il catalogo dei piatti
--    è già dell'account (700): chi ha due locali scrive la
--    carbonara una volta sola e vede le stesse categorie in
--    tutt'e due.
--
-- 3. LE NOTE DEL PIATTO. Sei etichette per le cose che vanno
--    DETTE, che sono un asse diverso dalle compatibilità:
--    "surgelato" non dice a chi va bene il piatto, dice un fatto
--    sul prodotto. Tre nascono da un obbligo del ristoratore
--    (surgelato, decongelato, abbattuto — quest'ultimo è il
--    trattamento preventivo contro l'Anisakis del pesce servito
--    crudo, Reg. CE 853/2004), tre sono informazioni che al
--    tavolo servono e che oggi si devono chiedere a voce (crudo,
--    piccante, alcol).
--    Codici e non testo libero, come gli allergeni: si traducono
--    da soli in ogni lingua e valgono per il filtro. Se le
--    scrivesse a mano nella descrizione, resterebbero in italiano
--    davanti al cliente straniero — che è il cliente per cui
--    esiste l'app.
--    ⚠️ Restano DICHIARAZIONI DEL RISTORANTE. Noi le mostriamo e
--    non le verifichiamo, come tutto il resto del prodotto.
--
-- Tutto additivo e con default: il portale in produzione
-- continua a funzionare senza sapere che esistono.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. LE CATEGORIE NUOVE
-- Il vincolo si sostituisce, non si affianca: il nome è quello
-- che Postgres ha dato da sé all'inline CHECK della 700
-- (verificato in produzione il 06/09 con pg_get_constraintdef).
-- ------------------------------------------------------------
ALTER TABLE partner_dishes
  DROP CONSTRAINT partner_dishes_category_check;

ALTER TABLE partner_dishes
  ADD CONSTRAINT partner_dishes_category_check
  CHECK (category IS NULL OR category IN (
    -- le otto della 700, invariate: i piatti esistenti non si toccano
    'starters', 'first_courses', 'second_courses', 'sides',
    'pizza', 'desserts', 'drinks', 'other',
    -- le dieci nuove
    'breakfast',    -- il bar, che apre prima di tutti
    'platters',     -- taglieri e affettati
    'fried',        -- i fritti, che in pizzeria sono mezza carta
    'sandwiches',   -- panini e piadine
    'burgers',
    'salads',
    'sushi',        -- vale per tutto il crudo giapponese, non solo il nigiri
    'wines',
    'beers',
    'cocktails'     -- staccati da 'drinks', che resta l'analcolico
  ));

COMMENT ON COLUMN partner_dishes.category IS
  'Categoria del catalogo, set fisso di 18 tradotto lato client (713). Facoltativa: NULL = senza categoria, mostrati per primi. Il portale usa la stringa vuota per "senza categoria": '''' lato client ⇄ NULL qui. NON è la sezione del menù, che è testo libero e vive su partner_menu_sections.';


-- ------------------------------------------------------------
-- 2. LE CATEGORIE NASCOSTE
-- Elenco di codici, non un flag per categoria: così aggiungerne
-- una al set non richiede né una colonna né una migration, e chi
-- non ha mai toccato niente ha l'array vuoto, cioè le vede tutte.
--
-- Nessun vincolo sui valori, di proposito: se un domani togliamo
-- una categoria dal set, un codice rimasto qui dentro è
-- innocuo — nasconde una cosa che non esiste — mentre un CHECK
-- farebbe fallire il salvataggio di un profilo che non c'entra.
-- ------------------------------------------------------------
ALTER TABLE partner_accounts
  ADD COLUMN hidden_dish_categories TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN partner_accounts.hidden_dish_categories IS
  'Codici categoria che questo ristoratore ha scelto di non vedere nelle tendine. Preferenza di interfaccia: non toglie niente ai piatti già classificati e non esce mai dal portale.';


-- ------------------------------------------------------------
-- 3. LE NOTE DEL PIATTO
-- Array come declared_allergens e diet_tags: un piatto può
-- essere insieme surgelato e piccante.
--
-- Il CHECK con <@ (contenuto in) invece di un enum: vale su
-- tutti gli elementi in una riga sola, e allargare il set un
-- domani è la stessa ALTER delle categorie qui sopra.
-- ------------------------------------------------------------
ALTER TABLE partner_dishes
  ADD COLUMN notes TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE partner_dishes
  ADD CONSTRAINT partner_dishes_notes_check
  CHECK (notes <@ ARRAY[
    'frozen',        -- surgelato
    'defrosted',     -- decongelato: NON un sinonimo di frozen (Reg. 1169/2011 all. VI)
    'blast_frozen',  -- abbattuto, pesce crudo (Reg. CE 853/2004)
    'raw',           -- uova/carne/pesce crudi: l'informazione che cerca chi è a rischio
    'spicy',
    'alcohol'
  ]::TEXT[]);

COMMENT ON COLUMN partner_dishes.notes IS
  'Note dichiarate sul piatto, set fisso tradotto lato client (713). Asse diverso da diet_tags: dicono un fatto sul prodotto, non a chi è adatto. frozen/defrosted/blast_frozen nascono da obblighi del ristoratore, raw/spicy/alcohol sono informazioni utili al tavolo. Dichiarazioni del ristorante: non le verifichiamo.';


-- ------------------------------------------------------------
-- 4. LO SCATTO SE LE PORTA AL TAVOLO
-- Stessa funzione della 710, con una riga in più nella riga del
-- piatto. create or replace, non drop+create: la firma non
-- cambia e i permessi restano dove sono.
--
-- Le note stanno sul PIATTO, quindi cambiarle muove
-- partner_dishes.updated_at: menu_publish_state se ne accorge
-- da sé e accende l'avviso "non ancora in sala" senza modifiche.
-- Non sono aspetto e non entrano in venue_appearance.
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

COMMIT;
