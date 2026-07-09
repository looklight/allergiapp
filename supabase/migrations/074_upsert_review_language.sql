-- 074: upsert_review aggiorna anche language sul ramo UPDATE.
--
-- Bug storico: la lingua veniva scritta solo all'insert; chi modificava una
-- recensione (magari riscrivendola in un'altra lingua) manteneva la lingua
-- originale. Il campo diventa la sorgente della lingua sorgente per la
-- traduzione on-device delle recensioni, quindi deve seguire l'edit.
--
-- COALESCE: i client vecchi non passano p_language sull'update → NULL non
-- deve azzerare il valore esistente.
--
-- CREATE OR REPLACE azzera il search_path fissato dalla 065 via ALTER:
-- lo re-dichiariamo inline (public, come da 065 — serve per PostGIS).
--
-- Da applicare A MANO via SQL editor (tracking migrations fermo, MAI db push).

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
RETURNS UUID
SET search_path = public
AS $$
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
        allergens_snapshot = p_allergens_snapshot, dietary_snapshot = p_dietary_snapshot,
        language = COALESCE(p_language, language)
    WHERE id = p_review_id AND user_id = p_user_id
    RETURNING id INTO v_review_id;

    IF v_review_id IS NULL THEN
      RAISE EXCEPTION 'Review not found or not owned by user';
    END IF;
  END IF;

  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
