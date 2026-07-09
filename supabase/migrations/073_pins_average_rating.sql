-- 073: average_rating nel payload di get_pins_in_bounds.
--
-- I pin a zoom ravvicinato oltre il cap del fetch dettagliato (200/area)
-- restavano segnaposto grigi senza voto medio. Col voto nel payload pin il
-- client renderizza OGNI pin del viewport completo (colore = match client-side
-- su supported_allergens/diets già presenti + voto medio), senza dipendere dal
-- fetch dettagliato. Vedi MAP_SCALING.md §0 e commit lato app.
--
-- DROP necessario: cambia il RETURNS TABLE (colonna extra ignorata dai client
-- vecchi, che leggono le colonne per nome).
-- Corpo identico alla versione live (068) + LEFT JOIN media recensioni
-- (stesso pattern di get_nearby_restaurants).
--
-- Da applicare A MANO via SQL editor (tracking migrations fermo, MAI db push).

DROP FUNCTION IF EXISTS get_pins_in_bounds(double precision, double precision, double precision, double precision, integer, boolean);

CREATE FUNCTION get_pins_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  lim integer DEFAULT 1000,
  lodging_mode boolean DEFAULT false
)
RETURNS TABLE(
  id                  uuid,
  latitude            double precision,
  longitude           double precision,
  supported_allergens text[],
  supported_diets     text[],
  cuisine_types       text[],
  offers_lodging      boolean,
  lodging_type        text,
  average_rating      numeric
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    r.id,
    ST_Y(r.location::geometry)  AS latitude,
    ST_X(r.location::geometry)  AS longitude,
    r.supported_allergens,
    r.supported_diets,
    r.cuisine_types,
    r.offers_lodging,
    r.lodging_type,
    COALESCE(ROUND(rev.avg_r, 1), 0) AS average_rating
  FROM restaurants r
  LEFT JOIN (
    SELECT restaurant_id, AVG(rating)::numeric AS avg_r
    FROM reviews GROUP BY restaurant_id
  ) rev ON r.id = rev.restaurant_id
  WHERE r.location IS NOT NULL
    AND r.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    AND (CASE WHEN lodging_mode THEN r.offers_lodging ELSE r.serves_food END)
  LIMIT lim;
$$;
