-- Fix trigger sync_restaurant_cuisine_types:
-- 1. SECURITY DEFINER per bypassare RLS su restaurants (UPDATE)
-- 2. ORDER BY COUNT(*) DESC così cuisine_types[1] è sempre il più votato
-- 3. Backfill: ricalcola cuisine_types per tutti i ristoranti con voti esistenti

CREATE OR REPLACE FUNCTION sync_restaurant_cuisine_types()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: aggiorna cuisine_types per tutti i ristoranti che hanno voti
UPDATE restaurants r
SET cuisine_types = (
  SELECT COALESCE(array_agg(cuisine_id ORDER BY cnt DESC, cuisine_id ASC), '{}')
  FROM (
    SELECT cuisine_id, COUNT(*) AS cnt
    FROM restaurant_cuisine_votes
    WHERE restaurant_id = r.id
    GROUP BY cuisine_id
  ) sub
)
WHERE EXISTS (
  SELECT 1 FROM restaurant_cuisine_votes WHERE restaurant_id = r.id
);
