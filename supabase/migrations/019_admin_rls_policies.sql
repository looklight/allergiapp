-- 019: Policy RLS per operazioni admin
-- L'admin dashboard necessita di DELETE ristoranti/recensioni e UPDATE report,
-- ma le policy attuali permettono queste operazioni solo ai rispettivi owner.

-- Helper: funzione che verifica se l'utente corrente e admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RESTAURANTS: admin puo eliminare qualsiasi ristorante
CREATE POLICY "Admins can delete restaurants"
  ON restaurants FOR DELETE
  USING (is_admin());

-- RESTAURANTS: admin puo aggiornare qualsiasi ristorante
CREATE POLICY "Admins can update restaurants"
  ON restaurants FOR UPDATE
  USING (is_admin());

-- REVIEWS: admin puo eliminare qualsiasi recensione
CREATE POLICY "Admins can delete reviews"
  ON reviews FOR DELETE
  USING (is_admin());

-- REPORTS: admin puo aggiornare lo stato delle segnalazioni
CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  USING (is_admin());

-- REPORTS: admin puo eliminare segnalazioni
CREATE POLICY "Admins can delete reports"
  ON reports FOR DELETE
  USING (is_admin());
