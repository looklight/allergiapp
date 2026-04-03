-- Aggiunge colonna country_code (ISO 3166-1 alpha-2) per identificare il paese
-- in modo indipendente dalla lingua del dispositivo.

ALTER TABLE restaurants ADD COLUMN country_code VARCHAR(2);

CREATE INDEX idx_restaurants_country_code ON restaurants(country_code)
  WHERE country_code IS NOT NULL;

-- Corregge dati esistenti: "France" → "Francia" + imposta country_code
UPDATE restaurants SET country = 'Francia', country_code = 'FR' WHERE country = 'France';
UPDATE restaurants SET country_code = 'IT' WHERE country = 'Italia' AND country_code IS NULL;
UPDATE restaurants SET country_code = 'JP' WHERE country IN ('Giappone', 'Japan') AND country_code IS NULL;
UPDATE restaurants SET country_code = 'KR' WHERE country IN ('Corea del Sud', 'South Korea') AND country_code IS NULL;
UPDATE restaurants SET country_code = 'CN' WHERE country IN ('Cina', 'China') AND country_code IS NULL;
UPDATE restaurants SET country_code = 'ES' WHERE country IN ('Spagna', 'Spain') AND country_code IS NULL;
UPDATE restaurants SET country_code = 'DE' WHERE country IN ('Germania', 'Germany') AND country_code IS NULL;
UPDATE restaurants SET country_code = 'GB' WHERE country IN ('Regno Unito', 'United Kingdom') AND country_code IS NULL;
UPDATE restaurants SET country_code = 'US' WHERE country IN ('Stati Uniti', 'United States') AND country_code IS NULL;
UPDATE restaurants SET country_code = 'PT' WHERE country IN ('Portogallo', 'Portugal') AND country_code IS NULL;
UPDATE restaurants SET country_code = 'NL' WHERE country IN ('Paesi Bassi', 'Netherlands') AND country_code IS NULL;
UPDATE restaurants SET country_code = 'TH' WHERE country IN ('Thailandia', 'Thailand') AND country_code IS NULL;
UPDATE restaurants SET country_code = 'GR' WHERE country IN ('Grecia', 'Greece') AND country_code IS NULL;

-- Aggiorna la RPC stats per filtrare su country_code
CREATE OR REPLACE FUNCTION get_restaurant_country_stats(
  filter_country text DEFAULT NULL
)
RETURNS TABLE (
  restaurant_count bigint,
  review_count bigint,
  average_rating numeric,
  favorite_count bigint,
  city_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM restaurants WHERE filter_country IS NULL OR country_code = filter_country),
    (SELECT COUNT(*) FROM reviews r JOIN restaurants rest ON r.restaurant_id = rest.id
     WHERE filter_country IS NULL OR rest.country_code = filter_country),
    (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r JOIN restaurants rest ON r.restaurant_id = rest.id
     WHERE filter_country IS NULL OR rest.country_code = filter_country),
    (SELECT COUNT(*) FROM favorites f JOIN restaurants rest ON f.restaurant_id = rest.id
     WHERE filter_country IS NULL OR rest.country_code = filter_country),
    (SELECT COUNT(DISTINCT city) FROM restaurants WHERE city IS NOT NULL AND (filter_country IS NULL OR country_code = filter_country));
$$;
