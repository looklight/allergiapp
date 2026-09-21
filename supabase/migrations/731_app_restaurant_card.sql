-- ============================================================
-- 731_app_restaurant_card.sql
-- STATO: APPLICATA il 2026-09-21 (success dal SQL editor).
-- Si può rilanciare: `create or replace` con la stessa firma, permessi
-- idempotenti.
-- Tracking fermo alla 045: a mano dal SQL editor, MAI db push.
--
-- LA SCHEDA LETTA DALL'APP (parte 4 del collegamento, primo pezzo).
--
-- Da qui in poi l'app ha un posto da cui chiedere «questo ristorante ha una
-- scheda del ristoratore? e cosa c'è dentro?». Fino a oggi non ce l'aveva:
-- la 721 ha tolto le sei letture pubbliche delle tabelle partner proprio
-- perché la risposta passasse da una funzione sola, dove la regola di
-- visibilità è scritta una volta e non si può aggirare da PostgREST.
--
-- UNA FUNZIONE, NON UNA POLICY. Le tabelle partner restano chiuse: chi
-- legge dall'app non vede `partner_cards`, non sa chi gestisce cosa, non
-- vede le bozze. Vede solo il risultato, e solo quando si può vedere.
--
-- CHI PUÒ CHIAMARLA: chiunque, con account o senza. Nell'app la scheda di
-- un ristorante si apre anche senza aver fatto l'accesso, e qui dentro non
-- ci sono dati personali — solo quello che il ristoratore ha pubblicato per
-- essere letto. È la stessa scelta di `get_public_menu` (708) e di
-- `partner_card_visible`, lasciata aperta apposta dalla 723.
--
-- COSA ESCE E COSA NO:
--   - QUALI piatti e i link vengono dalla VERSIONE PUBBLICATA (728): la
--     bozza non esce mai di qui.
--   - nome, descrizione, foto, allergeni e note dei piatti vengono dal
--     CATALOGO, vivi: una correzione di allergeni arriva nell'app senza
--     aspettare che qualcuno prema Pubblica. È l'asimmetria voluta del
--     19/09, l'unica differenza con il menù al tavolo.
--   - la lingua si risolve qui, come nel menù al tavolo: traduzione se c'è,
--     ripiego sull'originale campo per campo, mai il vuoto. `i18n` non
--     esce: all'app arriva una lingua sola, la sua.
--   - `menuSlug` c'è solo se il menù al tavolo di quel locale è ONLINE
--     (allergiapp.com/v/<slug>): se il ristoratore non l'ha mai pubblicato
--     l'app non deve offrire un indirizzo che non risponde.
--
-- L'ORDINE DEI PIATTI è quello del catalogo (`sort_order`): non esiste un
-- ordinamento per la scheda (700), e il riordino per compatibilità con chi
-- guarda lo fa l'app, che è l'unica a sapere le esigenze di chi legge —
-- dati sanitari, che non si mandano al database per farsi ordinare una
-- lista.
--
-- QUANDO NON C'È NIENTE risponde NULL, e l'app non mostra nulla: nessun
-- messaggio, nessuno spazio vuoto. Un ristorante senza partner e un
-- ristorante il cui partner non ha rinnovato si comportano allo stesso
-- modo — «scade, sparisce» vale anche qui, e non si racconta all'utente
-- che una volta c'era qualcosa.
-- ============================================================

BEGIN;

create or replace function get_restaurant_card(
  p_restaurant_id uuid,
  p_language text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with scheda as (
    -- partner_card_visible: abbonamento attivo + collegamento attivo +
    -- visto del nostro team (724). Lo storico dei collegamenti chiusi resta
    -- fuori da solo; il limit 1 è solo cintura (721: un collegamento vivo
    -- per ristorante).
    select c.venue_id
      from partner_cards c
     where c.restaurant_id = p_restaurant_id
       and partner_card_visible(c.id)
     limit 1
  )
  select jsonb_build_object(
           'venueId', s.venue_id,
           'publishedAt', p.published_at,
           'menuSlug', (
             select v.slug
               from partner_venues v
              where v.id = s.venue_id
                and v.published_at is not null
                and v.slug is not null
           ),
           -- lo scatto dei link com'è (728): kind, url, phone, language,
           -- provider, label, sort_order, già nell'ordine del portale
           'links', p.links,
           'dishes', coalesce((
             select jsonb_agg(
                      jsonb_build_object(
                        'id', d.id,
                        'name', coalesce(nullif(tr.name, ''), d.name),
                        'description', coalesce(
                          nullif(tr.description, ''),
                          coalesce(d.description, '')),
                        'category', coalesce(d.category, ''),
                        'allergens', to_jsonb(d.declared_allergens),
                        'diets', to_jsonb(d.diet_tags),
                        'notes', to_jsonb(d.notes),
                        -- DUE MISURE, MAI UNA SOLA. La miniatura (240px)
                        -- è quella delle liste; la grande (900px) si
                        -- scarica solo quando qualcuno tocca la foto.
                        -- Nessun ripiego dalla miniatura alla grande: dal
                        -- caricamento su Storage (702) le due foto vivono
                        -- e muoiono insieme — o arrivano entrambe, o non
                        -- resta niente (uploadDishPhoto). Così una lista
                        -- non può scaricare un'immagine pesante nemmeno
                        -- per sbaglio: non le viene proprio dato
                        -- l'indirizzo.
                        'thumbUrl', coalesce(d.photo_thumb_url, ''),
                        'photoUrl', coalesce(d.photo_url, '')
                        -- ⚠️ NIENTE DATA DI FRESCHEZZA, per ora. La colonna
                        -- last_confirmed_at della 700 la scrive solo il
                        -- valore di partenza: nessuno la aggiorna quando il
                        -- ristoratore corregge un piatto, e nel portale non
                        -- esiste il gesto «confermo che è ancora così».
                        -- Mostrarla come «aggiornato il…» direbbe una cosa
                        -- falsa a chi ha un'allergia. Torna quando ci sarà
                        -- la conferma periodica (MONETIZATION.md,
                        -- «Freschezza del dato»).
                      )
                      order by d.sort_order, d.name
                    )
               from partner_card_dishes_published cd
               join partner_dishes d on d.id = cd.dish_id
               left join partner_dish_translations tr
                      on tr.dish_id = d.id
                     and tr.language = p_language
              where cd.venue_id = s.venue_id
           ), '[]'::jsonb)
         )
    from scheda s
    join partner_card_published p on p.venue_id = s.venue_id
   -- SCHEDA PUBBLICATA VUOTA = niente scheda. «Link, piatti, tutti e due o
   -- niente: ne risponde lui» (19/09): il «niente» qui diventa NULL, così
   -- l'app non ha una seconda regola da scrivere per non disegnare una
   -- sezione vuota. Vale anche per chi si è collegato e non ha mai premuto
   -- Pubblica: non esiste proprio la riga pubblicata.
   where p.links <> '[]'::jsonb
      or exists (select 1 from partner_card_dishes_published cd
                  where cd.venue_id = s.venue_id);
$$;

-- Chiunque, come la pagina del menù: l'app la chiede anche per chi non ha
-- un account. `from public, anon` e non solo `from public` — su Supabase i
-- privilegi di partenza danno EXECUTE ad `anon` per nome (723).
revoke all on function get_restaurant_card(uuid, text) from public, anon, authenticated;
grant execute on function get_restaurant_card(uuid, text) to anon, authenticated;

comment on function get_restaurant_card(uuid, text) is
  'La scheda del ristoratore come la vede l''app, nella lingua chiesta: NULL se non c''è o non è visibile. Piatti e link dalla versione pubblicata (728), nomi e allergeni vivi dal catalogo.';

COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select to_regprocedure('get_restaurant_card(uuid, text)');
--   select proacl from pg_proc where proname = 'get_restaurant_card';
--
--   -- un ristorante collegato e visibile: deve tornare l'oggetto
--   select get_restaurant_card(c.restaurant_id, 'it')
--     from partner_cards c
--    where partner_card_visible(c.id);
--
--   -- un ristorante qualunque senza partner: deve tornare NULL
--   select get_restaurant_card(
--            (select id from restaurants
--              where id not in (select restaurant_id from partner_cards)
--              limit 1), 'it');
--
--   -- la bozza non esce: spegnere un piatto nel portale SENZA pubblicare
--   -- e richiamare la funzione — il piatto deve esserci ancora.
-- ============================================================
