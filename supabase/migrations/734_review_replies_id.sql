-- ============================================================
-- 734_review_replies_id.sql
-- STATO: APPLICATA il 2026-09-25 (success dal SQL editor, insieme alla 734/735).
-- Tracking fermo alla 045: a mano dal SQL editor, MAI db push.
--
-- `get_review_replies` (733) restituisce anche l'id della risposta: serve
-- all'app per segnalarla (`reports.reply_id`). Stessa regola di visibilità,
-- stessi permessi; cambia solo la forma del risultato, quindi drop e create
-- (create or replace non può cambiare le colonne restituite).
-- ============================================================

BEGIN;

drop function get_review_replies(uuid[]);

create function get_review_replies(p_review_ids uuid[])
returns table (
  id uuid,
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
  select rr.id, rr.review_id, rr.body, rr.language, rr.created_at, v.name, v.logo_url
    from partner_review_replies rr
    join reviews r on r.id = rr.review_id
    join partner_venues v on v.id = rr.venue_id
   where rr.review_id = any (p_review_ids[1:200])
     and rr.removed_at is null
     and partner_can_reply(rr.venue_id, r.restaurant_id);
$$;

revoke all on function get_review_replies(uuid[]) from public, anon, authenticated;
grant execute on function get_review_replies(uuid[]) to anon, authenticated;

COMMIT;

-- VERIFICA
--   select has_function_privilege('anon', 'get_review_replies(uuid[])', 'execute');  -- true
--   select * from get_review_replies(array[]::uuid[]);                               -- 0 righe, 7 colonne
