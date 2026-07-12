-- Migration 081: pin dei ristoranti recensiti dai propri seguiti
-- (Step 2 follow: filtro mappa "Recensiti dai seguiti").
--
-- SECURITY INVOKER deliberato (come get_following_feed, mig 075): la RLS
-- own-rows su follows espone solo i seguiti del chiamante; reviews, profiles
-- e restaurants hanno SELECT pubblico. Nessuna guardia nuova da mantenere.
-- Per gli anonimi (auth.uid() NULL) il join su follows è vuoto → set vuoto.
--
-- Stessa shape di get_pins_in_bounds (mig 073): il client renderizza questi
-- pin con lo stesso componente e calcola i colori (match esigenze) dal
-- payload, senza fetch aggiuntivi. average_rating come subquery correlata
-- (pattern search_users, mig 077): gira solo sulle righe restituite.
--
-- Autori diventati anonimi esclusi (coerente col feed 075); i bloccati non
-- esistono in follows per costruzione (trigger 075). ORDER BY ultima
-- recensione dei seguiti: se il set superasse mai il max-rows PostgREST
-- (1000), il troncamento tiene i posti più recenti invece di un
-- sottoinsieme arbitrario.
--
-- Da applicare A MANO via SQL editor (tracking migrations fermo, MAI db push).

CREATE FUNCTION get_followed_pins(lodging_mode boolean DEFAULT false)
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
    ST_Y(r.location::geometry) AS latitude,
    ST_X(r.location::geometry) AS longitude,
    r.supported_allergens,
    r.supported_diets,
    r.cuisine_types,
    r.offers_lodging,
    r.lodging_type,
    COALESCE((
      SELECT ROUND(AVG(rv2.rating)::numeric, 1)
      FROM reviews rv2
      WHERE rv2.restaurant_id = r.id
    ), 0) AS average_rating
  FROM restaurants r
  JOIN (
    SELECT rv.restaurant_id, MAX(rv.created_at) AS last_reviewed_at
    FROM reviews rv
    JOIN follows f  ON f.following_id = rv.user_id AND f.follower_id = auth.uid()
    JOIN profiles p ON p.id = rv.user_id AND NOT COALESCE(p.is_anonymous, false)
    GROUP BY rv.restaurant_id
  ) fr ON fr.restaurant_id = r.id
  WHERE r.location IS NOT NULL
    AND (CASE WHEN lodging_mode THEN r.offers_lodging ELSE r.serves_food END)
  ORDER BY fr.last_reviewed_at DESC
  LIMIT 1000;
$$;
