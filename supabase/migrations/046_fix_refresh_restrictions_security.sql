-- Fix: SECURITY DEFINER su refresh_restaurant_restrictions e sul trigger.
-- Senza SECURITY DEFINER, il trigger su reviews fallisce quando il cascade
-- delete parte da auth.admin.deleteUser (ruolo supabase_auth_admin) perche'
-- quel ruolo non ha permessi UPDATE su restaurants sotto RLS.
-- Stesso pattern gia' applicato in 026_fix_cuisine_types_sync.sql.

CREATE OR REPLACE FUNCTION refresh_restaurant_restrictions(p_restaurant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION trigger_refresh_restaurant_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
