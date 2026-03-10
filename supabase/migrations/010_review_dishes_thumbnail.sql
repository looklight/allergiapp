-- Aggiunge thumbnail_url a review_dishes per immagini ottimizzate nelle liste
ALTER TABLE review_dishes ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Aggiorna RPC upsert_review per inserire anche thumbnail_url
CREATE OR REPLACE FUNCTION upsert_review(
  p_restaurant_id UUID,
  p_user_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL,
  p_allergens_snapshot TEXT[] DEFAULT '{}',
  p_dietary_snapshot TEXT[] DEFAULT '{}',
  p_dishes JSONB DEFAULT '[]',
  p_review_id UUID DEFAULT NULL,
  p_generated_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_review_id UUID;
BEGIN
  IF p_review_id IS NULL THEN
    INSERT INTO reviews (id, restaurant_id, user_id, rating, comment, allergens_snapshot, dietary_snapshot)
    VALUES (COALESCE(p_generated_id, gen_random_uuid()), p_restaurant_id, p_user_id, p_rating, p_comment, p_allergens_snapshot, p_dietary_snapshot)
    RETURNING id INTO v_review_id;
  ELSE
    UPDATE reviews
    SET rating = p_rating, comment = p_comment
    WHERE id = p_review_id AND user_id = p_user_id
    RETURNING id INTO v_review_id;

    IF v_review_id IS NULL THEN
      RAISE EXCEPTION 'Review not found or not owned by user';
    END IF;

    DELETE FROM review_dishes WHERE review_id = v_review_id;
  END IF;

  IF jsonb_array_length(p_dishes) > 0 THEN
    INSERT INTO review_dishes (review_id, name, description, photo_url, thumbnail_url)
    SELECT v_review_id, d->>'name', d->>'description', d->>'photo_url', d->>'thumbnail_url'
    FROM jsonb_array_elements(p_dishes) AS d;
  END IF;

  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
