-- ============================================================
-- 733_review_replies.sql
-- STATO: APPLICATA il 2026-09-25 (success dal SQL editor), dopo la prova
-- in transazione annullata: 26 controlli su 26 come attesi.
-- Tracking fermo alla 045: a mano dal SQL editor, MAI db push.
--
-- LE RISPOSTE DEL RISTORATORE ALLE RECENSIONI (design 16/09, rifinito
-- il 25/09 — MONETIZATION.md «Risposte alle recensioni»).
--
-- Chi scrive: solo il ristoratore, solo dal portale, solo con le funzioni
-- qui sotto. La tabella non ha policy di scrittura: la regola «si risponde
-- solo con abbonamento e collegamento approvato» sta in un posto solo.
--
-- Quando si vede nell'app: abbonamento in corso (anche col pagamento in
-- ritardo mentre Stripe ritenta, come tutto il Pro) + collegamento attivo
-- O IN PAUSA + visto del nostro team + non rimossa dall'admin. La pausa
-- ferma la scheda, non la voce del ristoratore (deciso 25/09).
-- «Scade, sparisce; ti riabboni, torna»: la riga resta, l'app non la riceve.
--
-- La risposta è del LOCALE, non del collegamento: chi scollega e poi
-- ricollega lo stesso ristorante ritrova le sue risposte (721). Un altro
-- locale che prende il ristorante non le vede e non le mostra: la
-- visibilità chiede che il collegamento vivo sia di QUEL locale.
--
-- Moderazione: l'admin toglie una risposta con un motivo (DSA art. 17). La
-- riga non si cancella: il ristoratore vede «rimossa» col motivo e non può
-- più né modificarla né cancellarla. L'admin può rimetterla.
--
-- La lingua: come per le recensioni (074), così «Traduci» si comporta allo
-- stesso modo. La mette il portale dalla lingua del browser; NULL = ignota
-- (il telefono prova a riconoscerla da solo).
--
-- Il pallino: `profiles.last_seen_review_replies_at`, per data e non per
-- conteggio (il limite noto del pallino dei like non si ripete qui).
--
-- Verifica in fondo al file.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. LA TABELLA
-- ------------------------------------------------------------
create table partner_review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews (id) on delete cascade,
  venue_id uuid not null references partner_venues (id) on delete cascade,
  body text not null,
  language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_note text,
  removed_by uuid references auth.users (id) on delete set null,

  -- Una risposta per recensione, per locale.
  constraint partner_review_replies_one_per_review unique (review_id, venue_id),
  constraint partner_review_replies_language_code
    check (language is null or language ~ '^[a-z]{2,3}$'),
  constraint partner_review_replies_body_length
    check (length(btrim(body)) between 1 and 1000),
  -- Rimuovere senza dire perché non si può (DSA art. 17).
  constraint partner_review_replies_note_on_removal
    check (removed_at is null or coalesce(length(btrim(removed_note)), 0) > 0)
);

create index partner_review_replies_venue_idx on partner_review_replies (venue_id);
create index partner_review_replies_created_idx on partner_review_replies (created_at);

alter table partner_review_replies enable row level security;

-- Il ristoratore legge le sue (il portale passa comunque dalle funzioni),
-- l'admin legge tutto. Nessuno scrive dalla REST.
create policy partner_review_replies_owner_read on partner_review_replies
  for select using (
    exists (select 1 from partner_venues v
             where v.id = venue_id and v.owner_user_id = auth.uid())
  );
create policy partner_review_replies_admin_read on partner_review_replies
  for select using (is_admin());


-- ------------------------------------------------------------
-- 2. LA REGOLA UNICA: questo locale può parlare su questo ristorante?
-- La stessa condizione vale per scrivere e per mostrare.
-- ------------------------------------------------------------
create function partner_can_reply(p_venue_id uuid, p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from partner_cards c
     where c.venue_id = p_venue_id
       and c.restaurant_id = p_restaurant_id
       and c.status in ('active', 'paused')
       and c.reviewed_at is not null
       and venue_subscription_active(c.venue_id)
  );
$$;

revoke all on function partner_can_reply(uuid, uuid) from public, anon, authenticated;


-- ------------------------------------------------------------
-- 3. IL PORTALE: le recensioni del ristorante collegato, con la risposta
-- Il ristoratore vede solo quello che l'app mostra già a tutti: il nome
-- di chi ha scelto l'anonimato non esce (stessa regola della 077).
-- Si leggono con un collegamento vivo del gestore (anche prima del visto:
-- sono pubbliche nell'app); `can_reply` dice se si può rispondere.
-- ------------------------------------------------------------
create function partner_venue_reviews(p_venue_id uuid)
returns table (
  review_id uuid,
  rating smallint,
  comment text,
  allergens_snapshot text[],
  dietary_snapshot text[],
  photos jsonb,
  review_created_at timestamptz,
  review_updated_at timestamptz,
  author_username text,
  author_avatar_url text,
  author_is_anonymous boolean,
  reply_id uuid,
  reply_body text,
  reply_created_at timestamptz,
  reply_updated_at timestamptz,
  reply_removed_at timestamptz,
  reply_removed_note text,
  can_reply boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with collegamento as (
    select c.restaurant_id
      from partner_cards c
      join partner_venues v on v.id = c.venue_id
     where c.venue_id = p_venue_id
       and v.owner_user_id = auth.uid()
       and c.status in ('active', 'paused')
     limit 1
  )
  select
    r.id, r.rating, r.comment, r.allergens_snapshot, r.dietary_snapshot,
    r.photos, r.created_at, r.updated_at,
    case when coalesce(p.is_anonymous, false) then null else p.username end,
    p.avatar_url,
    coalesce(p.is_anonymous, false),
    rr.id, rr.body, rr.created_at, rr.updated_at, rr.removed_at, rr.removed_note,
    partner_can_reply(p_venue_id, k.restaurant_id)
  from collegamento k
  join reviews r on r.restaurant_id = k.restaurant_id
  left join profiles p on p.id = r.user_id
  left join partner_review_replies rr
         on rr.review_id = r.id and rr.venue_id = p_venue_id
  order by r.created_at desc;
$$;

revoke all on function partner_venue_reviews(uuid) from public, anon, authenticated;
grant execute on function partner_venue_reviews(uuid) to authenticated;


-- ------------------------------------------------------------
-- 4. SCRIVERE, MODIFICARE, CANCELLARE (portale)
-- ------------------------------------------------------------
create function partner_save_review_reply(
  p_venue_id uuid,
  p_review_id uuid,
  p_body text,
  p_language text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant uuid;
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
  -- «it-IT» → «it»; qualunque cosa strana diventa NULL, non un errore.
  v_lang text := nullif(lower(split_part(coalesce(p_language, ''), '-', 1)), '');
begin
  if v_lang is not null and v_lang !~ '^[a-z]{2,3}$' then
    v_lang := null;
  end if;

  if not exists (select 1 from partner_venues v
                  where v.id = p_venue_id and v.owner_user_id = auth.uid()) then
    raise exception 'not_owner' using errcode = '42501';
  end if;

  select r.restaurant_id into v_restaurant from reviews r where r.id = p_review_id;
  if v_restaurant is null then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;

  if not partner_can_reply(p_venue_id, v_restaurant) then
    raise exception 'cannot_reply' using errcode = '42501';
  end if;

  if length(v_body) = 0 or length(v_body) > 1000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  if exists (select 1 from partner_review_replies
              where review_id = p_review_id and venue_id = p_venue_id
                and removed_at is not null) then
    raise exception 'reply_removed' using errcode = '42501';
  end if;

  insert into partner_review_replies (review_id, venue_id, body, language)
  values (p_review_id, p_venue_id, v_body, v_lang)
  on conflict (review_id, venue_id)
  do update set body = excluded.body, language = excluded.language, updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- Cancellare la propria risposta si può sempre, anche senza abbonamento:
-- è roba sua. Non quella rimossa dall'admin, che resta come traccia.
create function partner_delete_review_reply(p_reply_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from partner_review_replies rr
   using partner_venues v
   where rr.id = p_reply_id
     and v.id = rr.venue_id
     and v.owner_user_id = auth.uid()
     and rr.removed_at is null;
  if not found then
    raise exception 'cannot_delete' using errcode = '42501';
  end if;
end;
$$;

revoke all on function partner_save_review_reply(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function partner_delete_review_reply(uuid) from public, anon, authenticated;
grant execute on function partner_save_review_reply(uuid, uuid, text, text) to authenticated;
grant execute on function partner_delete_review_reply(uuid) to authenticated;


-- ------------------------------------------------------------
-- 5. L'ADMIN: togliere e rimettere, con motivo e registro
-- ------------------------------------------------------------
create function admin_set_review_reply_removed(p_reply_id uuid, p_removed boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reply partner_review_replies%rowtype;
  v_restaurant uuid;
begin
  if not is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_removed and coalesce(length(btrim(p_note)), 0) = 0 then
    raise exception 'note_required' using errcode = '22023';
  end if;

  update partner_review_replies
     set removed_at   = case when p_removed then now() end,
         removed_note = case when p_removed then btrim(p_note) end,
         removed_by   = case when p_removed then auth.uid() end
   where id = p_reply_id
  returning * into v_reply;
  if not found then
    raise exception 'reply_not_found' using errcode = 'P0002';
  end if;

  select r.restaurant_id into v_restaurant from reviews r where r.id = v_reply.review_id;

  insert into partner_audit_log (actor_user_id, venue_id, restaurant_id, action, details)
  values (
    auth.uid(), v_reply.venue_id, v_restaurant,
    case when p_removed then 'reply_removed' else 'reply_restored' end,
    jsonb_build_object('reply_id', v_reply.id, 'review_id', v_reply.review_id,
                       'note', v_reply.removed_note, 'body', v_reply.body)
  );
end;
$$;

revoke all on function admin_set_review_reply_removed(uuid, boolean, text) from public, anon, authenticated;
grant execute on function admin_set_review_reply_removed(uuid, boolean, text) to authenticated;


-- ------------------------------------------------------------
-- 6. L'APP: le risposte visibili di un gruppo di recensioni
-- Aperta anche ad anon, come get_restaurant_card (731): nell'app le
-- recensioni si leggono senza accesso. Esce solo il nome e il logo del
-- locale, niente che porti al gestore.
-- ------------------------------------------------------------
create function get_review_replies(p_review_ids uuid[])
returns table (
  review_id uuid,
  body text,
  language text,
  created_at timestamptz,
  venue_name text,
  venue_logo_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select rr.review_id, rr.body, rr.language, rr.created_at, v.name, v.logo_url
    from partner_review_replies rr
    join reviews r on r.id = rr.review_id
    join partner_venues v on v.id = rr.venue_id
   where rr.review_id = any (p_review_ids[1:200])
     and rr.removed_at is null
     and partner_can_reply(rr.venue_id, r.restaurant_id);
$$;

revoke all on function get_review_replies(uuid[]) from public, anon, authenticated;
grant execute on function get_review_replies(uuid[]) to anon, authenticated;


-- ------------------------------------------------------------
-- 7. IL PALLINO: risposte nuove alle MIE recensioni
-- Default now(): nessuno si ritrova il pallino acceso il giorno dopo.
-- ------------------------------------------------------------
alter table profiles
  add column last_seen_review_replies_at timestamptz not null default now();

create function count_unseen_review_replies()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from partner_review_replies rr
    join reviews r on r.id = rr.review_id
    join profiles p on p.id = r.user_id
   where r.user_id = auth.uid()
     and rr.created_at > p.last_seen_review_replies_at
     and rr.removed_at is null
     and partner_can_reply(rr.venue_id, r.restaurant_id);
$$;

create function mark_review_replies_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set last_seen_review_replies_at = now() where id = auth.uid();
$$;

revoke all on function count_unseen_review_replies() from public, anon, authenticated;
revoke all on function mark_review_replies_seen() from public, anon, authenticated;
grant execute on function count_unseen_review_replies() to authenticated;
grant execute on function mark_review_replies_seen() to authenticated;


-- ------------------------------------------------------------
-- 8. SEGNALARE UNA RISPOSTA
-- Stessa tabella delle segnalazioni sulle recensioni: arrivano nella
-- pagina Segnalazioni dell'admin. `review_id` resta quello della
-- recensione, `reply_id` dice che si parla della risposta.
-- ------------------------------------------------------------
alter table reports
  add column reply_id uuid references partner_review_replies (id) on delete cascade;

create index idx_reports_reply on reports (reply_id) where reply_id is not null;

COMMIT;


-- ============================================================
-- VERIFICA (dopo, a mano)
--   select count(*) from partner_review_replies;                    -- 0
--   select proname from pg_proc where proname in (
--     'partner_can_reply', 'partner_venue_reviews', 'partner_save_review_reply',
--     'partner_delete_review_reply', 'admin_set_review_reply_removed',
--     'get_review_replies', 'count_unseen_review_replies',
--     'mark_review_replies_seen');                                  -- 8 righe
--   select column_name from information_schema.columns
--    where table_name = 'reports' and column_name = 'reply_id';     -- 1 riga
--   select has_function_privilege('anon', 'partner_can_reply(uuid,uuid)', 'execute'); -- false
-- ============================================================
