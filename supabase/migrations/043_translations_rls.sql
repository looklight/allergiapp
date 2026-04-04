-- Abilita RLS sulla tabella translations (segnalata da Supabase security alert)
-- Le traduzioni sono dati pubblici in sola lettura.
-- Solo service_role puo inserire/aggiornare/eliminare.

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations"
  ON translations FOR SELECT
  USING (true);
