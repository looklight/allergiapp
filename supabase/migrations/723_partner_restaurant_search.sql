-- ============================================================
-- 723_partner_restaurant_search.sql
-- STATO: APPLICATA il 2026-09-19, poi rivista lo stesso giorno (parole
-- generiche facoltative) e RILANCIATA INTERA: sul database c'è questa
-- versione (verificata). Si può rilanciare ancora — `create or replace` con
-- la stessa firma, permessi idempotenti. Tracking fermo alla 045: a mano,
-- MAI db push.
--
-- LA RICERCA DEL RISTORANTE, NEL PORTALE (parte 2 del collegamento, nodo 4).
--
-- DUE CAMPI, NOME E CITTÀ (deciso il 18/09; il design del 17/09 ne diceva
-- uno solo). Con un campo unico «trattoria roma» cercata a Milano trovava
-- anche i ristoranti DI Roma, perché la parola compariva nell'indirizzo.
-- Adesso ogni parola del nome deve stare nel NOME, ogni parola della città
-- nella città o nell'indirizzo (che la contiene già; per i 32 ristoranti
-- senza `city` basta l'indirizzo). Maiuscole e accenti non contano:
-- «Valencia» trova «València». Funziona anche il CAP, che sta
-- nell'indirizzo, e il comune di una frazione. Si ordina per somiglianza
-- del nome.
--
-- La città qui è facoltativa; la rende obbligatoria il portale (col solo
-- nome, un «Pizzeria…» ne trova centinaia e il limite di 20 può tagliare
-- fuori quello giusto). Il database resta largo per chi la userà dopo,
-- l'admin per esempio.
--
-- LE PAROLE GENERICHE NON SONO OBBLIGATORIE (19/09). Il ristoratore scrive
-- «Ristorante Linfa», ma nell'app il locale si chiama «Linfa Milano»: con
-- la regola «ogni parola deve stare nel nome» non trovava niente, e i nomi
-- presi da Google la parola «Ristorante» spesso non ce l'hanno. Adesso le
-- parole che dicono il TIPO di locale (ristorante, trattoria, restaurant,
-- gasthof…), quelle sulle esigenze alimentari (gluten free, senza glutine,
-- sin gluten, vegan…) e quelle di una o due lettere (da, la, de…) possono
-- mancare dal nome; devono esserci le altre, quelle che distinguono.
-- Se si scrivono SOLO parole generiche («Pizzeria») valgono tutte, come
-- prima: si trovano le pizzerie.
-- La lista viene dai nomi veri dei ristoranti, paese per paese (le parole
-- più frequenti al 19/09), già senza accenti e minuscola come la ricerca.
-- Una parola che manca dalla lista non rompe niente: si comporta come
-- prima, cioè deve stare nel nome.
--
-- ⚠️ Le città sono scritte nella lingua del posto (Milano, München): chi
-- scrive «Munich» non trova niente. Accettato: chi cerca è il ristoratore,
-- che la propria città la scrive così (negli indirizzi «Munich» compare 0
-- volte, «München» 21). Se diventasse un problema: v. TODO.md, Photon.
--
-- PERCHÉ UNA FUNZIONE: con la 721 il portale non legge più i collegamenti
-- degli altri account, ma il risultato deve dire «Già gestito da un altro
-- account» — senza dire da chi (nodo 2). Il database lo sa, e risponde solo
-- con una di tre parole:
--   free   libero: si può associare
--   yours  già associato a un tuo locale
--   taken  gestito da un altro account
-- Una revoca non si vede qui: la dice il collegamento, quando si prova
-- (errore `restaurant_revoked`), e da lì parte la richiesta all'admin.
--
-- Solo per chi ha un account partner: l'elenco dei ristoranti è pubblico
-- comunque, ma «chi è già gestito» no, e un utente dell'app non ha motivo
-- di chiederlo.
-- ============================================================

BEGIN;

create or replace function partner_search_restaurants(p_name text, p_city text default null)
returns table (
  id uuid,
  name text,
  address text,
  city text,
  country_code text,
  cuisine_types text[],
  latitude double precision,
  longitude double precision,
  holder text
)
language sql
stable
security definer
set search_path = public
as $$
  with parole as (
    select
      array(select w from regexp_split_to_table(
              extensions.unaccent(lower(btrim(coalesce(p_name, '')))), '\s+') as w
            where w <> '') as nome,
      array(select w from regexp_split_to_table(
              extensions.unaccent(lower(btrim(coalesce(p_city, '')))), '\s+') as w
            where w <> '') as citta
  ),
  generiche as (
    select array[
      -- italiano
      'ristorante', 'trattoria', 'pizzeria', 'osteria', 'taverna', 'locanda',
      'bar', 'caffe', 'caffetteria', 'pasticceria', 'gelateria', 'bistrot',
      'enoteca', 'birreria', 'paninoteca', 'piadineria', 'rosticceria',
      'agriturismo', 'cucina', 'del', 'della', 'dello', 'dei', 'degli',
      'delle', 'alla', 'allo', 'alle', 'dal', 'dalla',
      -- inglese
      'restaurant', 'cafe', 'pub', 'bakery', 'kitchen', 'grill', 'bistro',
      'the', 'and',
      -- spagnolo, francese, tedesco, portoghese
      'restaurante', 'cafeteria', 'pasteleria',
      'creperie', 'boulangerie', 'patisserie', 'brasserie', 'chez', 'les',
      'gasthof', 'gasthaus', 'wirtshaus', 'konditorei', 'backerei',
      'und', 'das', 'der', 'die',
      'pastelaria', 'gelataria', 'tasca',
      -- esigenze alimentari, in tutte le lingue
      'gluten', 'free', 'glutenfree', 'senza', 'glutine', 'sin', 'sans',
      'glutenfrei', 'glutenfreie', 'vegan'
    ] as g
  ),
  -- Le parole che devono esserci: quelle che distinguono, o tutte se si
  -- sono scritte solo parole generiche.
  richieste as (
    select coalesce(
             nullif(array(select w from unnest(p.nome) as w, generiche
                           where length(w) > 2 and not (w = any (generiche.g))), '{}'),
             p.nome) as nome,
           p.citta
      from parole p
  )
  select r.id,
         r.name,
         r.address,
         r.city,
         r.country_code::text,
         r.cuisine_types,
         ST_Y(r.location::geometry),
         ST_X(r.location::geometry),
         case
           when c.owner_user_id is null then 'free'
           when c.owner_user_id = auth.uid() then 'yours'
           else 'taken'
         end
    from restaurants r
    cross join richieste p
    left join partner_cards c
      on c.restaurant_id = r.id
     and c.status in ('active', 'paused', 'suspended')
   where exists (select 1 from partner_accounts a where a.user_id = auth.uid())
     and length(btrim(coalesce(p_name, ''))) >= 2
     -- strpos e non LIKE: un % o un _ scritti nella ricerca restano lettere
     and not exists (
           select 1 from unnest(p.nome) as w
            where strpos(extensions.unaccent(lower(r.name)), w) = 0)
     and not exists (
           select 1 from unnest(p.citta) as w
            where strpos(extensions.unaccent(lower(
                    coalesce(r.city, '') || ' ' || coalesce(r.address, ''))), w) = 0)
   order by similarity(r.name, p_name) desc, r.name
   limit 20;
$$;

revoke all on function partner_search_restaurants(text, text) from public, anon;
grant execute on function partner_search_restaurants(text, text) to authenticated;


-- ------------------------------------------------------------
-- ⚠️ «revoke ... from public» NON BASTA SU SUPABASE (scoperto il 18/09).
-- I privilegi di partenza del progetto danno EXECUTE su ogni funzione nuova
-- ad `anon` per nome, non tramite public: la riga che le migration usano da
-- sempre lascia la porta aperta a chi non ha fatto l'accesso. Innocuo per
-- le funzioni della 721 — controllano auth.uid() e a uno sconosciuto
-- rispondono not_owner o not_admin — ma non c'è motivo di lasciarla aperta.
-- partner_card_visible resta aperta di proposito: la chiederà l'app anche
-- a chi non ha un account.
-- ------------------------------------------------------------
revoke execute on function partner_link_restaurant(uuid, uuid, uuid) from anon;
revoke execute on function partner_set_card_paused(uuid, boolean) from anon;
revoke execute on function partner_unlink_card(uuid) from anon;
revoke execute on function partner_request_restaurant(uuid, uuid, uuid, text) from anon;
revoke execute on function admin_decide_card_request(uuid, boolean, text) from anon;

COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select to_regprocedure('partner_search_restaurants(text, text)');
--   select proname, proacl from pg_proc
--    where proname like 'partner_%' or proname = 'admin_decide_card_request';
--   (fra quelle chiamabili dal portale, anon resta solo su
--   partner_card_visible; le funzioni dei trigger non si chiamano da fuori)
-- E dal portale: la ricerca risponde, con «Già gestito» dove serve.
-- ============================================================
