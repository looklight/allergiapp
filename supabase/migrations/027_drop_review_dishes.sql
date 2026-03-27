-- 027: Rimozione tabelle deprecate review_dishes e dish_likes
-- Le foto delle recensioni sono migrate a reviews.photos (JSONB) dalla migration 015.
-- review_dishes e dish_likes non sono più usate dal codice app.

-- 1. Aggiorna upsert_review: rimuove il DELETE FROM review_dishes residuo
CREATE OR REPLACE FUNCTION upsert_review(
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
  END IF;

  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 2. Aggiorna get_restaurant_stats: rimuove dish_count (legacy)
DROP FUNCTION IF EXISTS get_restaurant_stats(UUID);
CREATE FUNCTION get_restaurant_stats(restaurant_uuid UUID)
RETURNS TABLE (
  review_count BIGINT,
  average_rating NUMERIC,
  favorite_count BIGINT
) AS $$
  SELECT
    (SELECT COUNT(*) FROM reviews WHERE restaurant_id = restaurant_uuid),
    (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) FROM reviews WHERE restaurant_id = restaurant_uuid),
    (SELECT COUNT(*) FROM favorites WHERE restaurant_id = restaurant_uuid);
$$ LANGUAGE sql STABLE;

-- 3. Drop tabelle deprecate (dish_likes prima perché referenzia review_dishes)
DROP TABLE IF EXISTS dish_likes;
DROP TABLE IF EXISTS review_dishes;
