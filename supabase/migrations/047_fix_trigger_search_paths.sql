-- Fix: search_path mancante su funzioni trigger SECURITY DEFINER.
-- Quando il trigger gira sotto ruolo supabase_auth_admin (cascade delete da
-- auth.admin.deleteUser), il search_path non include "public" e le reference
-- alle tabelle non qualificate falliscono con "relation does not exist".
--
-- Root cause confermata dai Postgres Logs:
--   ERROR: relation "restaurants" does not exist
--   CONTEXT: PL/pgSQL function public.sync_restaurant_cuisine_types() line 6
--   user_name: supabase_auth_admin
--
-- Fix 1: sync_restaurant_cuisine_types — aggiunge SET search_path
--        (aveva gia' SECURITY DEFINER da 026).
-- Fix 2: trg_update_review_likes_count — aggiunge SECURITY DEFINER + search_path
--        (ne era del tutto privo, stesso rischio latente).

CREATE OR REPLACE FUNCTION sync_restaurant_cuisine_types()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  UPDATE restaurants
  SET cuisine_types = (
    SELECT COALESCE(array_agg(cuisine_id ORDER BY cnt DESC, cuisine_id ASC), '{}')
    FROM (
      SELECT cuisine_id, COUNT(*) AS cnt
      FROM restaurant_cuisine_votes
      WHERE restaurant_id = target_id
      GROUP BY cuisine_id
    ) sub
  )
  WHERE id = target_id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION trg_update_review_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET likes_count = likes_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$;
