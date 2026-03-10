-- Sistema tag cucina validati dalla community
-- Ogni utente può votare per i tag che ritiene appropriati per un ristorante

-- 1. Tabella voti
CREATE TABLE restaurant_cuisine_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cuisine_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (restaurant_id, user_id, cuisine_id)
);

CREATE INDEX idx_cuisine_votes_restaurant ON restaurant_cuisine_votes(restaurant_id);
CREATE INDEX idx_cuisine_votes_user ON restaurant_cuisine_votes(user_id);

-- 2. RLS
ALTER TABLE restaurant_cuisine_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes readable by everyone"
  ON restaurant_cuisine_votes FOR SELECT USING (true);

CREATE POLICY "Users can vote"
  ON restaurant_cuisine_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unvote"
  ON restaurant_cuisine_votes FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Migra dati esistenti: i tag del creatore diventano i suoi voti
INSERT INTO restaurant_cuisine_votes (restaurant_id, user_id, cuisine_id)
SELECT r.id, r.added_by, unnest(r.cuisine_types)
FROM restaurants r
WHERE r.added_by IS NOT NULL AND cardinality(r.cuisine_types) > 0
ON CONFLICT DO NOTHING;

-- 4. Trigger: sincronizza restaurants.cuisine_types cache ad ogni voto/unvoto
CREATE OR REPLACE FUNCTION sync_restaurant_cuisine_types()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  UPDATE restaurants
  SET cuisine_types = (
    SELECT COALESCE(array_agg(DISTINCT v.cuisine_id), '{}')
    FROM restaurant_cuisine_votes v
    WHERE v.restaurant_id = target_id
  )
  WHERE id = target_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_cuisine_types
AFTER INSERT OR DELETE ON restaurant_cuisine_votes
FOR EACH ROW
EXECUTE FUNCTION sync_restaurant_cuisine_types();

-- 5. RPC: voti aggregati per un ristorante (con info se l'utente corrente ha votato)
CREATE OR REPLACE FUNCTION get_restaurant_cuisine_votes(restaurant_uuid UUID)
RETURNS TABLE (
  cuisine_id TEXT,
  vote_count BIGINT,
  user_voted BOOLEAN
) AS $$
  SELECT
    v.cuisine_id,
    COUNT(*) AS vote_count,
    bool_or(v.user_id = auth.uid()) AS user_voted
  FROM restaurant_cuisine_votes v
  WHERE v.restaurant_id = restaurant_uuid
  GROUP BY v.cuisine_id
  ORDER BY vote_count DESC, v.cuisine_id ASC;
$$ LANGUAGE sql STABLE;
