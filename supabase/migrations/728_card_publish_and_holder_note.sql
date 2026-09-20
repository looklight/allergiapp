-- ============================================================
-- 728_card_publish_and_holder_note.sql
-- STATO: APPLICATA il 2026-09-19 e verificata (una sola firma della
-- funzione, versioni pubblicate per tutti i locali, visibilità senza piatti).
-- Tracking fermo alla 045: a mano, MAI db push. Due temi del 19/09 in una migration sola (scelta
-- dell'utente: nessuna delle due era ancora applicata).
--
-- A. DUE MOTIVI QUANDO SI ACCOGLIE UNA RICHIESTA
-- B. LA SCHEDA SI PUBBLICA, COME IL MENÙ
-- ============================================================

BEGIN;

-- ============================================================
-- A. DUE MOTIVI QUANDO SI ACCOGLIE UNA RICHIESTA
-- ============================================================
-- Accogliere una richiesta per un ristorante già gestito fa due cose a due
-- persone diverse: associa chi ha chiesto, e revoca il gestore attuale.
-- Fino a qui il motivo era uno solo, scritto su tutte e due: il gestore
-- revocato leggeva il testo pensato per l'altro (e che magari parlava
-- dell'altro). Ora ognuno ha il suo: `p_note` per chi ha chiesto,
-- `p_note_holder` per il gestore revocato — obbligatorio quando c'è un
-- gestore da revocare, perché la revoca va motivata (DSA art. 17).
--
-- La firma cambia (un parametro in più), quindi DROP + CREATE: con
-- CREATE OR REPLACE nascerebbe una seconda funzione accanto alla vecchia, e
-- la chiamata dell'admin non saprebbe più quale usare. Dopo, VERIFICARE
-- (in fondo al file): il SQL editor ha già risposto «success» senza
-- installare niente su un DROP + CREATE (TODO.md, 05/09).


drop function admin_decide_card_request(uuid, boolean, text);

create function admin_decide_card_request(
  p_request_id uuid,
  p_accept boolean,
  p_note text,
  p_note_holder text default null
)
returns void
language plpgsql
set search_path = public
as $$
declare
  r partner_card_requests;
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  select * into r
    from partner_card_requests
   where id = p_request_id and status = 'pending'
   for update;
  if not found then
    raise exception 'invalid_state';
  end if;

  if r.owner_user_id = auth.uid() then
    raise exception 'own_request';
  end if;

  if p_accept then
    if exists (select 1 from partner_cards
                where restaurant_id = r.restaurant_id
                  and status in ('active', 'paused', 'suspended'))
       and coalesce(length(btrim(p_note_holder)), 0) = 0 then
      raise exception 'holder_note_required';
    end if;

    update partner_cards
       set status = 'revoked', status_note = btrim(p_note_holder)
     where restaurant_id = r.restaurant_id
       and status in ('active', 'paused', 'suspended');

    insert into partner_cards (venue_id, owner_user_id, restaurant_id, company_id)
    values (r.venue_id, r.owner_user_id, r.restaurant_id, r.company_id);
  end if;

  update partner_card_requests
     set status = case when p_accept then 'accepted' else 'rejected' end,
         decision_note = p_note,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_request_id;
end;
$$;

-- Gli stessi permessi di prima: solo chi è connesso (e dentro, solo l'admin)
revoke all on function admin_decide_card_request(uuid, boolean, text, text) from public, anon;
grant execute on function admin_decide_card_request(uuid, boolean, text, text) to authenticated;


-- ============================================================
-- B. LA SCHEDA SI PUBBLICA, COME IL MENÙ
-- ============================================================
-- Fino a qui la scheda AllergiApp era sempre «in onda»: ogni tocco su un
-- piatto e ogni lettera di un link erano già la scheda che l'app avrebbe
-- mostrato — il «Salva» dei link chiudeva solo il riquadro. Il ristoratore
-- non aveva mai il momento in cui decide «adesso va online». Ora sì:
--
--   - la BOZZA resta dove stava (partner_links, partner_card_dishes) e si
--     salva da sola come prima: chiudere il browser non costa niente;
--   - la VERSIONE PUBBLICATA sta qui accanto, e nasce SOLO da
--     partner_publish_card(), che la copia dalla bozza. Il gestore la
--     legge ma non la scrive: scrivendola a mano potrebbe mettere sulla sua
--     scheda i piatti di un altro;
--   - «Annulla» nel portale riporta la bozza alla versione pubblicata con le
--     scritture di sempre: nessuna funzione in più.
--
-- SI PUBBLICA COSA MOSTRARE, NON I DATI DEI PIATTI. Qui ci sono QUALI
-- piatti, non i loro nomi e allergeni: quelli l'app li legge dal catalogo,
-- quindi una correzione di allergeni arriva subito e non aspetta che
-- qualcuno si ricordi di premere Pubblica. I link invece sono
-- fotografati per intero (sono il contenuto stesso della scheda).
--
-- I link fotografati sono quelli della SCHEDA: tutti tranne i social, che
-- stanno solo in fondo al menù al tavolo e hanno la loro pubblicazione.
--
-- Tutto pende dal locale (e i piatti anche dal piatto) con CASCADE, come
-- vuole la 727: eliminare un piatto, un locale o un account non lascia
-- niente in giro.


create table partner_card_published (
  venue_id uuid primary key,
  owner_user_id uuid not null,
  -- [{kind, url, phone, language, provider, label, sort_order}], nell'ordine
  links jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now(),
  foreign key (venue_id, owner_user_id)
    references partner_venues (id, owner_user_id) on delete cascade
);

create table partner_card_dishes_published (
  venue_id uuid not null,
  dish_id uuid not null,
  owner_user_id uuid not null,
  primary key (venue_id, dish_id),
  foreign key (venue_id, owner_user_id)
    references partner_venues (id, owner_user_id) on delete cascade,
  foreign key (dish_id, owner_user_id)
    references partner_dishes (id, owner_user_id) on delete cascade
);

alter table partner_card_published enable row level security;
alter table partner_card_dishes_published enable row level security;

-- Il gestore legge la sua (per sapere cosa è online e poter annullare);
-- nessuna policy di scrittura: la scrive solo la funzione qui sotto
create policy partner_card_published_owner_read on partner_card_published
  for select using (owner_user_id = auth.uid());
create policy partner_card_published_admin on partner_card_published
  for all using (is_admin());
create policy partner_card_dishes_published_owner_read on partner_card_dishes_published
  for select using (owner_user_id = auth.uid());
create policy partner_card_dishes_published_admin on partner_card_dishes_published
  for all using (is_admin());


-- La fotografia della bozza di un locale: gli stessi link che il portale
-- mostra nella scheda, nello stesso ordine
create function partner_card_draft_links(p_venue_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'kind', l.kind,
        'url', l.url,
        'phone', l.phone,
        'language', l.language,
        'provider', l.provider,
        'label', l.label,
        'sort_order', l.sort_order
      ) order by l.sort_order, l.created_at),
    '[]'::jsonb)
  from partner_links l
  where l.venue_id = p_venue_id
    and l.kind <> 'social';
$$;

revoke all on function partner_card_draft_links(uuid) from public, anon, authenticated;


-- PUBBLICA: la bozza diventa la versione che l'app mostrerà (quando la
-- scheda è visibile: abbonamento, associazione approvata, almeno un piatto)
create function partner_publish_card(p_venue_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_quando timestamptz := now();
begin
  if not exists (select 1 from partner_venues
                  where id = p_venue_id and owner_user_id = v_uid) then
    raise exception 'not_owner';
  end if;

  insert into partner_card_published (venue_id, owner_user_id, links, published_at)
  values (p_venue_id, v_uid, partner_card_draft_links(p_venue_id), v_quando)
  on conflict (venue_id) do update
    set links = excluded.links,
        published_at = excluded.published_at;

  delete from partner_card_dishes_published where venue_id = p_venue_id;
  insert into partner_card_dishes_published (venue_id, dish_id, owner_user_id)
  select venue_id, dish_id, owner_user_id
    from partner_card_dishes
   where venue_id = p_venue_id;

  return v_quando;
end;
$$;

revoke all on function partner_publish_card(uuid) from public, anon;
grant execute on function partner_publish_card(uuid) to authenticated;


-- LA REGOLA DI VISIBILITÀ: niente più condizione sui piatti (deciso con
-- l'utente il 19/09, cambia il nodo 1 del 17/09). Il partner ha pagato per
-- il collegamento e decide lui cosa mettere nella scheda: solo link, solo
-- piatti, tutti e due o niente — ne risponde lui. La scheda si vede con
-- abbonamento attivo e associazione attiva e approvata.
-- ⚠️ Il CONTORNO DEL PIN (parte 4) resta invece legato ai piatti
-- PUBBLICATI: dice «c'è il menù del ristorante», e senza piatti non c'è.
create or replace function partner_card_visible(p_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from partner_cards c
     where c.id = p_card_id
       and c.status = 'active'
       and c.reviewed_at is not null
       and venue_subscription_active(c.venue_id)
  );
$$;


-- LO STATO DI OGGI È GIÀ PUBBLICATO. Nessuna scheda cambia con questa
-- migration: quello che c'è diventa la versione pubblicata di partenza, e
-- da qui in poi cambia solo premendo Pubblica.
insert into partner_card_published (venue_id, owner_user_id, links, published_at)
select v.id, v.owner_user_id, partner_card_draft_links(v.id), now()
  from partner_venues v;

insert into partner_card_dishes_published (venue_id, dish_id, owner_user_id)
select venue_id, dish_id, owner_user_id
  from partner_card_dishes;

COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select oid::regprocedure from pg_proc
--    where proname = 'admin_decide_card_request';
--     -- UNA riga: admin_decide_card_request(uuid,boolean,text,text)
--   select position('holder_note_required' in prosrc) > 0 from pg_proc
--    where proname = 'admin_decide_card_request';                -- true
--   select count(*) from partner_card_published;              -- = numero di locali
--   select (select count(*) from partner_card_dishes_published)
--        = (select count(*) from partner_card_dishes);         -- true
--   select position('partner_card_dishes' in prosrc) = 0
--     from pg_proc where proname = 'partner_card_visible';     -- true (niente piatti)
-- ============================================================
