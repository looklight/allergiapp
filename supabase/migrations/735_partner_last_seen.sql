-- ============================================================
-- 735_partner_last_seen.sql
-- STATO: APPLICATA il 2026-09-25 (success dal SQL editor, insieme alla 734/735).
-- Tracking fermo alla 045: a mano dal SQL editor, MAI db push.
--
-- «ULTIMO ACCESSO» DEI RISTORATORI, COME QUELLO DEGLI UTENTI (062).
--
-- La pagina Partner dell'admin mostrava `auth.users.last_sign_in_at`, che
-- Supabase aggiorna solo quando si entra con email e password: con la
-- sessione che resta aperta per settimane — e il portale installato come
-- app — un ristoratore attivo ogni giorno risultava fermo al primo login.
-- È lo stesso difetto corretto a giugno per l'app (062/502).
--
-- Stessa soluzione: una colonna sull'account partner e una funzione che la
-- aggiorna con l'ora del SERVER (il client non sceglie la data). La chiama
-- il portale all'apertura e al ritorno sulla pagina, al massimo una volta
-- all'ora. Dato operativo dell'account, come quello dell'app.
--
-- Non si riusa `profiles.last_seen_at`: lo scrive l'app, e chi è solo
-- partner non ha nemmeno un profilo.
-- ============================================================

BEGIN;

alter table partner_accounts add column last_seen_at timestamptz;

-- Il trigger set_updated_at (700) non deve scattare per questo: «ultima
-- attività» non è «profilo modificato». La funzione scrive solo la colonna,
-- e il trigger lo si salta confrontando le colonne che contano.
create or replace function partner_accounts_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - 'last_seen_at' - 'updated_at')
     is distinct from (to_jsonb(old) - 'last_seen_at' - 'updated_at') then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger set_updated_at on partner_accounts;
create trigger set_updated_at before update on partner_accounts
  for each row execute function partner_accounts_touch_updated_at();

create function touch_partner_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update partner_accounts set last_seen_at = now() where user_id = auth.uid();
$$;

revoke all on function touch_partner_last_seen() from public, anon, authenticated;
grant execute on function touch_partner_last_seen() to authenticated;

COMMIT;

-- VERIFICA
--   select column_name from information_schema.columns
--    where table_name = 'partner_accounts' and column_name = 'last_seen_at';   -- 1 riga
--   select has_function_privilege('anon', 'touch_partner_last_seen()', 'execute');  -- false
