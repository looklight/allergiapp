-- Semplificazione review: foto + lingua source per futura traduzione

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS language TEXT;

-- Ricrea la RPC: p_dishes rimosso, aggiunto p_photo_urls e p_language
DROP FUNCTION IF EXISTS upsert_review(UUID, UUID, SMALLINT, TEXT, TEXT[], TEXT[], JSONB, UUID, UUID);

CREATE FUNCTION upsert_review(
  p_restaurant_id UUID,
  p_user_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL,
  p_allergens_snapshot TEXT[] DEFAULT '{}',
  p_dietary_snapshot TEXT[] DEFAULT '{}',
  p_photo_urls TEXT[] DEFAULT '{}',
  p_review_id UUID DEFAULT NULL,
  p_generated_id UUID DEFAULT NULL,
  p_language TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_review_id UUID;
BEGIN
  IF p_review_id IS NULL THEN
    INSERT INTO reviews (id, restaurant_id, user_id, rating, comment, allergens_snapshot, dietary_snapshot, photo_urls, language)
    VALUES (COALESCE(p_generated_id, gen_random_uuid()), p_restaurant_id, p_user_id, p_rating, p_comment, p_allergens_snapshot, p_dietary_snapshot, p_photo_urls, p_language)
    RETURNING id INTO v_review_id;
  ELSE
    UPDATE reviews
    SET rating = p_rating, comment = p_comment, photo_urls = p_photo_urls,
        allergens_snapshot = p_allergens_snapshot, dietary_snapshot = p_dietary_snapshot
    WHERE id = p_review_id AND user_id = p_user_id
    RETURNING id INTO v_review_id;

    IF v_review_id IS NULL THEN
      RAISE EXCEPTION 'Review not found or not owned by user';
    END IF;

    -- Cleanup vecchi piatti (da review pre-semplificazione)
    DELETE FROM review_dishes WHERE review_id = v_review_id;
  END IF;

  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
