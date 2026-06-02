-- Chiude i warning "function_search_path_mutable" del Security Advisor: imposta un
-- search_path fisso sulle nostre funzioni (senza, una funzione SECURITY DEFINER è
-- esposta a search_path injection). Usiamo `public` e NON `''` perché l'estensione
-- PostGIS è installata in public e le funzioni usano ST_*/tabelle non schema-qualificate;
-- con search_path vuoto si romperebbero.
--
-- DO-loop sui nomi noti: ALTER su ogni overload (es. upsert_review ha 2 firme).
-- Idempotente: rilanciare è innocuo. Tocca solo le funzioni nostre elencate, non
-- quelle di PostGIS (che non possiamo/dobbiamo modificare).

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'search_restaurants_by_name',
        'toggle_review_like',
        'get_restaurant_cuisine_votes',
        'get_nearby_restaurants',
        'upsert_review',
        'get_paginated_reviews',
        'get_pins_in_bounds',
        'get_unique_likers_count',
        'get_restaurants_for_my_needs',
        'get_all_restaurant_positions',
        'is_admin',
        'update_updated_at',
        'get_restaurant_stats',
        'restaurants_assign_slug_trigger',
        'get_leaderboard',
        'vote_cuisines',
        'get_all_restaurants',
        'generate_restaurant_slug',
        'assign_unique_restaurant_slug'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;
