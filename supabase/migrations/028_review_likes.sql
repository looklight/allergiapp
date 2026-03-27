-- Migration 028: review_likes
-- Tabella per i like alle recensioni + colonna denormalizzata likes_count

-- 1. Tabella review_likes
CREATE TABLE review_likes (
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, review_id)
);

-- Index per query "quanti like ha questa review"
CREATE INDEX idx_review_likes_review_id ON review_likes(review_id);
-- Index per query "le review likata dall'utente X" (usato in getReviews)
CREATE INDEX idx_review_likes_user_id ON review_likes(user_id);

-- 2. Colonna likes_count denormalizzata su reviews
ALTER TABLE reviews ADD COLUMN likes_count INT NOT NULL DEFAULT 0;

-- 3. Trigger per mantenere likes_count aggiornato
CREATE OR REPLACE FUNCTION trg_update_review_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET likes_count = likes_count + 1 WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_likes_count
AFTER INSERT OR DELETE ON review_likes
FOR EACH ROW EXECUTE FUNCTION trg_update_review_likes_count();

-- 4. RPC toggle_review_like — toggling atomico, ritorna stato aggiornato
CREATE OR REPLACE FUNCTION toggle_review_like(p_review_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_existed  BOOLEAN;
  v_liked    BOOLEAN;
  v_count    INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM review_likes
    WHERE user_id = v_user_id AND review_id = p_review_id
  ) INTO v_existed;

  IF v_existed THEN
    DELETE FROM review_likes WHERE user_id = v_user_id AND review_id = p_review_id;
    v_liked := FALSE;
  ELSE
    INSERT INTO review_likes(user_id, review_id) VALUES (v_user_id, p_review_id);
    v_liked := TRUE;
  END IF;

  SELECT likes_count INTO v_count FROM reviews WHERE id = p_review_id;

  RETURN json_build_object('liked', v_liked, 'likes_count', v_count);
END;
$$;

-- 5. RLS
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

-- Chiunque può leggere i like (utile per contatori pubblici)
CREATE POLICY "review_likes_select" ON review_likes
  FOR SELECT USING (true);

-- Solo l'utente autenticato può inserire i propri like
CREATE POLICY "review_likes_insert" ON review_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Solo l'utente autenticato può rimuovere i propri like
CREATE POLICY "review_likes_delete" ON review_likes
  FOR DELETE USING (auth.uid() = user_id);
