-- Chiude una scalata a privilegi: la policy "Users can update their own profile"
-- (001_initial_schema) è `FOR UPDATE USING (auth.uid() = id)` senza restrizione di
-- colonna. Poiché la colonna `role` ('user'|'restaurant_owner'|'admin') vive in
-- `profiles` ed è ciò che is_admin() controlla, un utente autenticato potrebbe via
-- Data API fare `update profiles set role='admin' where id = auth.uid()` e diventare
-- admin (delete ristoranti/recensioni/report, lettura di tutti i report, ecc.).
--
-- Fix: trigger BEFORE UPDATE che annulla qualsiasi cambio di `role` non autorizzato.
--   - utente normale che prova a cambiarsi role  → NEW.role riportato a OLD.role
--   - admin (sessione autenticata, is_admin()=true) → consentito
--   - service_role (script set-admin, auth.uid() NULL) → consentito
-- Mirato alla sola colonna `role`: l'editing normale del profilo (username, avatar,
-- allergeni, diete, ecc.) non è toccato. is_admin() esiste da migration 019.

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT is_admin() THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_self_escalation();
