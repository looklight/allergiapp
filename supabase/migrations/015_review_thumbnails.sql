-- Sostituisce photo_urls TEXT[] con photos JSONB.
-- Ogni entry: {"url": "https://...", "thumbnailUrl": "https://..."}
-- Elimina il rischio di array paralleli fuori sync.

ALTER TABLE reviews DROP COLUMN IF EXISTS photo_urls;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';

-- Ricrea upsert_review con p_photos JSONB
DROP FUNCTION IF EXISTS upsert_review(UUID, UUID, SMALLINT, TEXT, TEXT[], TEXT[], TEXT[], UUID, UUID, TEXT);

CREATE FUNCTION upsert_review(
  p_restaurant_id UUID,
  p_user_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL,
  p_allergens_snapshot TEXT[] DEFAULT '{}',
  p_dietary_snapshot TEXT[] DEFAULT '{}',
  p_photos JSONB DEFAULT '[]',
  p_review_id UUID DEFAULT NULL,
  p_generated_id UUID DEFAULT NULL,
  p_language TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_review_id UUID;
BEGIN
  IF p_review_id IS NULL THEN
    INSERT INTO reviews (id, restaurant_id, user_id, rating, comment, allergens_snapshot, dietary_snapshot, photos, language)
    VALUES (COALESCE(p_generated_id, gen_random_uuid()), p_restaurant_id, p_user_id, p_rating, p_comment, p_allergens_snapshot, p_dietary_snapshot, p_photos, p_language)
    RETURNING id INTO v_review_id;
  ELSE
    UPDATE reviews
    SET rating = p_rating, comment = p_comment, photos = p_photos,
        allergens_snapshot = p_allergens_snapshot, dietary_snapshot = p_dietary_snapshot
    WHERE id = p_review_id AND user_id = p_user_id
    RETURNING id INTO v_review_id;

    IF v_review_id IS NULL THEN
      RAISE EXCEPTION 'Review not found or not owned by user';
    END IF;

    DELETE FROM review_dishes WHERE review_id = v_review_id;
  END IF;

  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
