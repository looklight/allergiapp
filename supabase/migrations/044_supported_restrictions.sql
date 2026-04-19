-- Aggiunge supported_allergens e supported_diets alla tabella restaurants.
-- Questi campi aggregano le restrizioni coperte dalle recensioni esistenti,
-- permettendo a get_pins_in_bounds di restituire dati di copertura per ogni pin
-- senza limitarsi al raggio 50km di get_restaurants_for_my_needs.
--
-- Flusso:
--   1. Aggiunta colonne + indici GIN
--   2. Funzione refresh_restaurant_restrictions (ricomputa per un ristorante)
--   3. Trigger AFTER INSERT/UPDATE/DELETE su reviews
--   4. Backfill di tutti i ristoranti esistenti
--   5. get_pins_in_bounds estesa con i nuovi campi

-- ─── 1. Colonne ───────────────────────────────────────────────────────────────

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS supported_allergens TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS supported_diets     TEXT[] NOT NULL DEFAULT '{}';

-- Indici GIN per query future (es. ricerca ristoranti che supportano un allergene)
CREATE INDEX IF NOT EXISTS idx_restaurants_supported_allergens
  ON restaurants USING GIN(supported_allergens);
CREATE INDEX IF NOT EXISTS idx_restaurants_supported_diets
  ON restaurants USING GIN(supported_diets);

-- ─── 2. Funzione di refresh ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_restaurant_restrictions(p_restaurant_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE restaurants
  SET
    supported_allergens = COALESCE((
      SELECT array_agg(DISTINCT allergen)
      FROM (
        SELECT unnest(allergens_snapshot) AS allergen
        FROM reviews
        WHERE restaurant_id = p_restaurant_id
      ) sub
    ), '{}'),
    supported_diets = COALESCE((
      SELECT array_agg(DISTINCT diet)
      FROM (
        SELECT unnest(dietary_snapshot) AS diet
        FROM reviews
        WHERE restaurant_id = p_restaurant_id
      ) sub
    ), '{}')
  WHERE id = p_restaurant_id;
END;
$$;

-- ─── 3. Trigger su reviews ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_refresh_restaurant_restrictions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_restaurant_restrictions(OLD.restaurant_id);
  ELSE
    PERFORM refresh_restaurant_restrictions(NEW.restaurant_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_restrictions ON reviews;
CREATE TRIGGER trg_refresh_restrictions
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_restaurant_restrictions();

-- ─── 4. Backfill ristoranti esistenti ─────────────────────────────────────────

UPDATE restaurants r
SET
  supported_allergens = COALESCE((
    SELECT array_agg(DISTINCT allergen)
    FROM (
      SELECT unnest(rv.allergens_snapshot) AS allergen
      FROM reviews rv
      WHERE rv.restaurant_id = r.id
    ) sub
  ), '{}'),
  supported_diets = COALESCE((
    SELECT array_agg(DISTINCT diet)
    FROM (
      SELECT unnest(rv.dietary_snapshot) AS diet
      FROM reviews rv
      WHERE rv.restaurant_id = r.id
    ) sub
  ), '{}');

-- ─── 5. get_pins_in_bounds estesa ──────────────────────────────────────────────

DROP FUNCTION IF EXISTS get_pins_in_bounds(double precision, double precision, double precision, double precision, integer);

CREATE OR REPLACE FUNCTION get_pins_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  lim integer DEFAULT 1000
)
RETURNS TABLE(
  id                  uuid,
  latitude            double precision,
  longitude           double precision,
  supported_allergens text[],
  supported_diets     text[],
  cuisine_types       text[]
)
LANGUAGE sql STABLE
AS $$
  SELECT
    r.id,
    ST_Y(r.location::geometry)  AS latitude,
    ST_X(r.location::geometry)  AS longitude,
    r.supported_allergens,
    r.supported_diets,
    r.cuisine_types
  FROM restaurants r
  WHERE r.location IS NOT NULL
    AND r.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
  LIMIT lim;
$$;
