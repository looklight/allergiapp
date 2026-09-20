-- ============================================================
-- 729_storage_listing_and_internal_functions.sql
-- STATO: APPLICATA il 2026-09-20 e verificata (policy dello Storage, 7+2
-- funzioni chiuse, policy dei ristoranti, firma nuova di
-- get_partner_venues_admin, vincolo dell'indirizzo, 4 funzioni nuove, cron
-- purge_retired_slugs). Provata prima in transazione annullata.
-- Tracking fermo alla 045: a mano, MAI db push.
--
-- QUATTRO PORTE LASCIATE APERTE, trovate nel controllo di sicurezza del
-- 19/09 (richiesto dall'utente: nessun account deve vedere o toccare cose di
-- altri). Le tabelle dei partner sono risultate sigillate — provate entrando
-- come un ristoratore e come un visitatore: zero righe altrui viste o
-- toccate. Restavano queste.
--
--   A. LO STORAGE SI POTEVA ELENCARE. Le regole «Public read access» su
--      `images` (foto delle recensioni) e `partner` (logo, copertine, foto
--      dei piatti) davano a chiunque, anche senza accesso, il permesso di
--      ELENCARE i file: le cartelle hanno per nome l'id dell'account, e
--      dentro c'erano anche le foto di bozza mai pubblicate. Quella regola
--      non serve per MOSTRARE le foto: i bucket sono pubblici, e
--      l'indirizzo /object/public/… non passa dalle regole. Serve solo a
--      elencare e, al proprietario, a sostituire o togliere i suoi file
--      (l'app carica con upsert, che ne ha bisogno). Ora ognuno elenca solo
--      la sua cartella, l'admin tutte. Verificato prima: tutti i 3.971
--      file stanno nella cartella del loro proprietario.
--      Gli annunci (`announcements`) restano elencabili: sono le immagini
--      pubbliche dell'admin, non di un utente.
--
--   B. DUE FUNZIONI INTERNE CHIAMABILI DA CHIUNQUE:
--      - sweep_public_appearance(): il giro notturno (pg_cron, come
--        postgres). Toglie l'aspetto a pagamento a chi non è più abbonato:
--        chiamata da fuori non faceva danni, ma non è cosa da lasciare in
--        mano a un visitatore;
--      - published_appearance_without_premium(uuid): dava l'aspetto di un
--        locale qualsiasi, logo e copertina di bozza compresi.
--      Le usano solo il giro notturno e un trigger, che girano come
--      postgres: togliere il permesso agli altri non cambia niente per loro.
--
--   C. CHI AGGIUNGE UN RISTORANTE POTEVA CANCELLARE LE RECENSIONI DEGLI
--      ALTRI. La regola del database lasciava eliminare un ristorante a chi
--      l'aveva aggiunto, sempre: e con lui se ne andavano a catena
--      recensioni, foto dei menù e salvataggi degli altri utenti. L'app lo
--      impediva (removeOwnRestaurant: solo se non rivendicato e senza
--      recensioni), ma il database no, e una chiamata diretta lo aggirava —
--      907 ristoranti esposti il 19/09. Ora la regola dell'app sta anche
--      qui: per chi usa l'app non cambia niente. (Le recensioni sono
--      leggibili da tutti, quindi il controllo le vede tutte.)
--
--   D. LO STATO DELLA SCHEDA NELLA PAGINA PARTNER DELL'ADMIN (non è
--      sicurezza: sta qui perché tocca la stessa funzione di E). Per ogni
--      locale, accanto al menù, com'è la scheda nell'app: la stessa regola
--      del portale (cardState) e di partner_card_visible. E si corregge un
--      difetto già in TODO: card_id era la PRIMA associazione del locale,
--      anche chiusa; ora è quella in corso. I piatti «sulla scheda» sono
--      quelli PUBBLICATI (728), cioè quelli che l'app mostra.
--      Cambia la forma del risultato, quindi DROP + CREATE.
--
--   E. SETTE FUNZIONI CHIAMABILI ANCHE SENZA ACCESSO. Innocue — dentro
--      controllano chi chiama, provato — ma un visitatore non connesso non
--      deve poterle nemmeno chiamare: ora solo gli utenti connessi. Su
--      Supabase `revoke … from public` non basta, il permesso ad `anon` è
--      dato per nome: va tolto anche a lui.
--
--   F. L'INDIRIZZO DEL MENÙ E IL MENÙ ONLINE, senza orfani (deciso con
--      l'utente il 19/09). Il principio: online c'è sempre e solo una
--      versione pubblicata, e cambia con Pubblica o Ritira. Tre buchi:
--      - si poteva PUBBLICARE SENZA INDIRIZZO («Pubblica» in alto non lo
--        chiedeva): un menù online che nessuno può aprire. Ora il database
--        lo rifiuta, e il locale che era così va offline;
--      - eliminando l'ULTIMO menù attivo restava online una versione che non
--        si può più ripubblicare né gestire. Ora va offline da solo;
--      - CAMBIANDO INDIRIZZO il vecchio tornava libero subito: un altro
--        ristoratore poteva prenderlo, e un QR già stampato avrebbe portato
--        un allergico sul menù di un altro. Ora c'è un PERIODO DI GRAZIA di
--        30 GIORNI (scelta dell'utente: «occupare indirizzi per sempre è
--        sbagliato, se lo cambia sono affari suoi» — i 30 giorni sono il
--        tempo di ristampare): il vecchio porta al nuovo e nessun altro lo
--        prende; poi torna libero per tutti. Vale anche per il locale
--        eliminato, che prima teneva l'indirizzo bloccato per sempre.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- A. LO STORAGE: ognuno elenca la sua cartella
-- ------------------------------------------------------------

drop policy "Public read access for images" on storage.objects;
drop policy "Public read access for partner files" on storage.objects;

create policy "Owner or admin can read images" on storage.objects
  for select using (
    bucket_id = 'images'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );

create policy "Owner or admin can read partner files" on storage.objects
  for select using (
    bucket_id = 'partner'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );


-- ------------------------------------------------------------
-- B. LE FUNZIONI INTERNE: solo per chi gira dentro il database
-- ------------------------------------------------------------

revoke all on function sweep_public_appearance() from public, anon, authenticated;
revoke all on function published_appearance_without_premium(uuid) from public, anon, authenticated;


-- ------------------------------------------------------------
-- C. ELIMINARE UN RISTORANTE: la stessa regola dell'app
-- ------------------------------------------------------------

drop policy "Users can delete restaurants they added" on restaurants;

create policy "Users can delete restaurants they added" on restaurants
  for delete using (
    auth.uid() = added_by
    and owner_id is null
    and not exists (select 1 from reviews r where r.restaurant_id = restaurants.id)
  );


-- ------------------------------------------------------------
-- D. LO STATO DELLA SCHEDA IN ADMIN
-- ------------------------------------------------------------

drop function get_partner_venues_admin(text);

create function get_partner_venues_admin(search_query text default null)
returns table (
  venue_id uuid, venue_name text, slug text, created_at timestamptz,
  owner_user_id uuid, first_name text, last_name text, email varchar,
  signed_up_at timestamptz, menus_total bigint, published_at timestamptz,
  dishes_total bigint, card_dishes_total bigint, card_id uuid,
  sub_id uuid, sub_source text, sub_status text, sub_plan text,
  sub_started_at timestamptz, sub_ends_at timestamptz,
  sub_cancel_at_period_end boolean, sub_note text, sub_customer_id text,
  past_subs bigint, ex_canceled_at timestamptz, ex_source text,
  ex_started_at timestamptz, ex_ends_at timestamptz,
  -- none · requested · review · suspended · paused · live · expired
  card_state text
)
language sql
security definer
set search_path = public
as $$
  SELECT
    v.id,
    v.name,
    v.slug,
    v.created_at,
    v.owner_user_id,
    a.first_name,
    a.last_name,
    u.email::varchar,
    a.created_at,
    (SELECT count(*) FROM partner_menus m WHERE m.venue_id = v.id),
    -- ⚠️ La pubblicazione sta sul LOCALE e non sul singolo menù (708): lo
    -- scatto in sala è uno solo e contiene tutte le carte attive. Una data
    -- qui vuol dire che il QR di quel locale è davvero in giro.
    v.published_at,
    (SELECT count(*) FROM partner_dishes dd WHERE dd.owner_user_id = v.owner_user_id),
    -- quelli che l'app mostra: i pubblicati (728), non la bozza
    (SELECT count(*) FROM partner_card_dishes_published cd WHERE cd.venue_id = v.id),
    c.id,
    s.id,
    s.source,
    s.status,
    s.plan,
    s.started_at,
    s.ends_at,
    s.cancel_at_period_end,
    s.note,
    s.stripe_customer_id,
    (SELECT count(*) FROM partner_subscriptions p
      WHERE p.venue_id = v.id AND p.status = 'canceled'),
    ex.canceled_at,
    ex.source,
    ex.started_at,
    ex.ends_at,
    -- Lo stesso ordine di cardState() nel portale: si dice la cosa che conta
    -- per prima
    CASE
      WHEN c.id IS NULL THEN
        CASE WHEN EXISTS (SELECT 1 FROM partner_card_requests r
                           WHERE r.venue_id = v.id AND r.status = 'pending')
             THEN 'requested' ELSE 'none' END
      WHEN c.status = 'suspended' THEN 'suspended'
      WHEN c.reviewed_at IS NULL THEN 'review'
      WHEN c.status = 'paused' THEN 'paused'
      WHEN partner_card_visible(c.id) THEN 'live'
      ELSE 'expired'
    END
  FROM partner_venues v
  JOIN partner_accounts a ON a.user_id = v.owner_user_id
  JOIN auth.users u ON u.id = v.owner_user_id
  -- L'associazione IN CORSO (al massimo una per locale, 721); prima era la
  -- prima trovata, anche se chiusa
  LEFT JOIN LATERAL (
    SELECT c2.id, c2.status, c2.reviewed_at
    FROM partner_cards c2
    WHERE c2.venue_id = v.id
      AND c2.status IN ('active', 'paused', 'suspended')
    LIMIT 1
  ) c ON true
  -- L'abbonamento APERTO del locale, se c'è: ce n'è al massimo uno (indice
  -- parziale della 716). I chiusi restano storia e non devono comparire al
  -- posto del vivo.
  LEFT JOIN LATERAL (
    SELECT s2.*
    FROM partner_subscriptions s2
    WHERE s2.venue_id = v.id
      AND s2.status IN ('active', 'past_due')
      AND (s2.ends_at IS NULL OR s2.ends_at > now())
    ORDER BY s2.created_at DESC
    LIMIT 1
  ) s ON true
  -- L'ULTIMO ABBONAMENTO CHIUSO, che c'è anche quando ce n'è uno vivo (chi ha
  -- disdetto e poi è tornato). Si ordina per la data della disdetta, con la
  -- scadenza come ripiego: una riga chiusa da un pagamento fallito la
  -- canceled_at ce l'ha, una scaduta e basta no.
  LEFT JOIN LATERAL (
    SELECT s3.canceled_at, s3.source, s3.started_at, s3.ends_at
    FROM partner_subscriptions s3
    WHERE s3.venue_id = v.id AND s3.status = 'canceled'
    ORDER BY coalesce(s3.canceled_at, s3.ends_at) DESC NULLS LAST
    LIMIT 1
  ) ex ON true
  WHERE EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
  AND (
    search_query IS NULL
    OR v.name ILIKE '%' || search_query || '%'
    OR a.first_name ILIKE '%' || search_query || '%'
    OR a.last_name ILIKE '%' || search_query || '%'
    OR u.email::text ILIKE '%' || search_query || '%'
  )
  ORDER BY v.created_at DESC;
$$;


-- ------------------------------------------------------------
-- E. SOLO PER CHI È CONNESSO
-- ------------------------------------------------------------

revoke all on function get_partner_stats_admin() from public, anon;
revoke all on function get_partner_venues_admin(text) from public, anon;
revoke all on function menu_publish_state(uuid) from public, anon;
revoke all on function photo_in_published_menu(text) from public, anon;
revoke all on function publish_menu(uuid) from public, anon;
revoke all on function revert_appearance(uuid) from public, anon;
revoke all on function unpublish_menu(uuid) from public, anon;
grant execute on function get_partner_stats_admin() to authenticated;
grant execute on function get_partner_venues_admin(text) to authenticated;
grant execute on function menu_publish_state(uuid) to authenticated;
grant execute on function photo_in_published_menu(text) to authenticated;
grant execute on function publish_menu(uuid) to authenticated;
grant execute on function revert_appearance(uuid) to authenticated;
grant execute on function unpublish_menu(uuid) to authenticated;


-- ------------------------------------------------------------
-- F. L'INDIRIZZO DEL MENÙ E IL MENÙ ONLINE
-- ------------------------------------------------------------

-- F1. Chi era online senza indirizzo va offline (oggi: un locale di prova),
-- poi la regola: online solo con un indirizzo. Vale per ogni strada —
-- publish_menu, il portale, un domani qualunque altra.
update partner_venues set published_at = null
 where slug is null and published_at is not null;

alter table partner_venues
  add constraint partner_venues_online_needs_slug
  check (published_at is null or slug is not null);


-- F2. Eliminato l'ultimo menù attivo, il locale va offline: la versione
-- pubblicata mostrerebbe carte che non esistono più, e non si potrebbe
-- nemmeno ripubblicarla (publish_menu vuole almeno un menù attivo). Se il
-- locale stesso se ne sta andando (eliminazione a catena) non c'è niente da
-- fare: l'update non trova la riga.
create function partner_menus_offline_if_last()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from partner_menus m
                  where m.venue_id = old.venue_id and m.active) then
    update partner_venues
       set published_at = null
     where id = old.venue_id
       and published_at is not null;
  end if;
  return null;
end;
$$;

create trigger partner_menus_offline_if_last
  after delete on partner_menus
  for each row execute function partner_menus_offline_if_last();

revoke all on function partner_menus_offline_if_last() from public, anon, authenticated;


-- F3. IL PERIODO DI GRAZIA: una funzione sola, usata da tutti i controlli
-- qui sotto. Per cambiarlo si cambia qui.
create function partner_slug_hold()
returns interval
language sql
immutable
as $$ select interval '30 days' $$;

-- L'indirizzo lasciato (cambiato, o del locale eliminato) resta ritirato
-- per il periodo di grazia, e sa di quale locale era: così può portare al
-- nuovo. Se il locale se ne va, il riferimento si svuota.
alter table partner_retired_slugs
  add column venue_id uuid references partner_venues (id) on delete set null;

comment on table partner_retired_slugs is
  'Gli indirizzi di menù appena lasciati: per partner_slug_hold() (30 giorni) nessun altro li prende e portano all''indirizzo nuovo del locale, così i QR già stampati continuano a funzionare. Poi tornano liberi (729).';

create function retire_changed_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.slug is not null and old.slug is distinct from new.slug then
    insert into partner_retired_slugs (slug, owner_user_id, venue_id, retired_at)
    values (old.slug, old.owner_user_id, old.id, now())
    on conflict (slug) do update
      set owner_user_id = excluded.owner_user_id,
          venue_id = excluded.venue_id,
          retired_at = excluded.retired_at;
  end if;
  return null;
end;
$$;

create trigger partner_venues_retire_changed_slug
  after update of slug on partner_venues
  for each row execute function retire_changed_slug();

revoke all on function retire_changed_slug() from public, anon, authenticated;

-- Chi sceglie un indirizzo ritirato: passato il periodo di grazia è libero
-- per tutti; prima lo può riprendere solo chi l'aveva (come nella 720).
create or replace function reject_retired_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ex partner_retired_slugs%rowtype;
begin
  if new.slug is null then
    return new;
  end if;

  select * into ex from partner_retired_slugs where slug = new.slug;
  if not found then
    return new;
  end if;

  if ex.retired_at > now() - partner_slug_hold()
     and ex.owner_user_id is distinct from new.owner_user_id then
    raise exception 'slug ritirato: %', new.slug
      using errcode = 'unique_violation';
  end if;

  -- Torna a chi ce l'aveva, o a un altro a grazia finita: esce dai ritirati
  delete from partner_retired_slugs where slug = new.slug;
  return new;
end;
$$;

-- Il controllo di disponibilità del portale: un indirizzo ritirato è
-- occupato solo durante la grazia, e mai per chi l'aveva (può riprenderlo)
create or replace function partner_slug_taken(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from partner_venues where slug = candidate)
      or exists (select 1 from partner_retired_slugs
                  where slug = candidate
                    and retired_at > now() - partner_slug_hold()
                    and owner_user_id is distinct from auth.uid());
$$;


-- F4. DOVE PORTA UN INDIRIZZO VECCHIO, durante la grazia: all'indirizzo di
-- oggi del suo locale, se c'è ancora e ne ha uno. La pagina pubblica la
-- chiede quando un indirizzo non risponde. Solo l'indirizzo nuovo,
-- nient'altro: lo legge chiunque inquadri un QR.
create function partner_menu_redirect(p_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select v.slug
    from partner_retired_slugs r
    join partner_venues v on v.id = r.venue_id
   where r.slug = p_slug
     and r.retired_at > now() - partner_slug_hold()
     and v.slug is not null;
$$;

revoke all on function partner_menu_redirect(text) from public;
grant execute on function partner_menu_redirect(text) to anon, authenticated;

-- F5. PULIZIA: gli indirizzi a grazia finita escono dalla tabella ogni
-- notte, accanto al giro dell'aspetto (pg_cron, 719). Senza, resterebbero
-- righe che non contano più niente.
select cron.schedule(
  'purge_retired_slugs',
  '30 3 * * *',
  $$delete from public.partner_retired_slugs where retired_at <= now() - public.partner_slug_hold()$$
);

COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select policyname from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and policyname like '%read%';
--     -- Owner or admin can read images / partner files, e l'annuncio
--   select proname, has_function_privilege('anon', oid, 'execute')
--     from pg_proc where proname in ('sweep_public_appearance',
--                                    'published_appearance_without_premium');
--     -- false, false
--   select qual from pg_policies where tablename = 'restaurants'
--      and policyname = 'Users can delete restaurants they added';
--     -- con owner_id is null e not exists (… reviews …)
--   select proname, has_function_privilege('anon', oid, 'execute')
--     from pg_proc where proname in ('publish_menu', 'get_partner_venues_admin');
--     -- false, false
--   select oid::regprocedure from pg_proc where proname = 'get_partner_venues_admin';
--     -- UNA riga; e da admin: select venue_name, card_state
--     --   from get_partner_venues_admin(null);
--   select count(*) from partner_venues
--    where published_at is not null and slug is null;          -- 0
--   select tgname from pg_trigger where tgname in
--     ('partner_menus_offline_if_last', 'partner_venues_retire_changed_slug');  -- due
--   select jobname, schedule from cron.job;   -- anche purge_retired_slugs, 30 3 * * *
-- E da fuori: una foto pubblica si apre ancora, l'elenco del bucket da
-- visitatore torna vuoto.
-- ============================================================
