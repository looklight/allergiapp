-- Migration 510 (admin-prod): mappa delle aperture di scheda.
--
-- Read-only sopra `restaurant_view_counts` (mig 082), gated da role='admin'
-- come tutto il range 500+. Nessuna raccolta nuova: il contatore anonimo esiste
-- dal 30/08/2026 e ha gia' accumulato dati.
--
-- Torna solo i locali APERTI nella finestra, non tutto il catalogo: il risultato
-- e' piccolo per costruzione e non cresce col numero di ristoranti censiti.
--
-- ⚠️ Sono aperture, non persone: chi apre dieci volte la stessa scheda pesa
-- dieci. Il contatore e' anonimo e non sa distinguere.

DROP FUNCTION IF EXISTS get_view_map(int, int);

CREATE FUNCTION get_view_map(p_days int DEFAULT 30, p_limit int DEFAULT 500)
RETURNS TABLE (
  restaurant_id uuid,
  name text,
  city text,
  latitude double precision,
  longitude double precision,
  views int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id AS restaurant_id,
    r.name,
    r.city,
    ST_Y(r.location::geometry) AS latitude,
    ST_X(r.location::geometry) AS longitude,
    SUM(rvc.count)::int AS views
  FROM restaurant_view_counts rvc
  JOIN restaurants r ON r.id = rvc.restaurant_id
  WHERE rvc.day > ((now() AT TIME ZONE 'Europe/Rome')::date - p_days)
    AND r.location IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  GROUP BY r.id, r.name, r.city, r.location
  -- Sull'espressione e non sull'alias: `views` e `name` sono anche colonne di
  -- output (RETURNS TABLE), qualificare non lascia dubbi. Vedi 509.
  ORDER BY SUM(rvc.count) DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_view_map(int, int) TO authenticated;
