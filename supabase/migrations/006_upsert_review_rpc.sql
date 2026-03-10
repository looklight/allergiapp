-- RPC atomica per creare o aggiornare una review con piatti
-- Tutte le operazioni DB in una singola transaction

CREATE OR REPLACE FUNCTION upsert_review(
  p_restaurant_id UUID,
  p_user_id UUID,
  p_rating SMALLINT,
  p_comment TEXT DEFAULT NULL,
  p_allergens_snapshot TEXT[] DEFAULT '{}',
  p_dietary_snapshot TEXT[] DEFAULT '{}',
  p_dishes JSONB DEFAULT '[]',
  p_review_id UUID DEFAULT NULL  -- NULL = nuova review, valorizzato = update
)
RETURNS UUID AS $$
DECLARE
  v_review_id UUID;
BEGIN
  IF p_review_id IS NULL THEN
    -- Nuova review
    INSERT INTO reviews (restaurant_id, user_id, rating, comment, allergens_snapshot, dietary_snapshot)
    VALUES (p_restaurant_id, p_user_id, p_rating, p_comment, p_allergens_snapshot, p_dietary_snapshot)
    RETURNING id INTO v_review_id;
  ELSE
    -- Update review esistente (solo se appartiene all'utente)
    UPDATE reviews
    SET rating = p_rating, comment = p_comment
    WHERE id = p_review_id AND user_id = p_user_id
    RETURNING id INTO v_review_id;

    IF v_review_id IS NULL THEN
      RAISE EXCEPTION 'Review not found or not owned by user';
    END IF;

    -- Elimina vecchi piatti (cascade elimina anche dish_likes)
    DELETE FROM review_dishes WHERE review_id = v_review_id;
  END IF;

  -- Inserisci nuovi piatti
  IF jsonb_array_length(p_dishes) > 0 THEN
    INSERT INTO review_dishes (review_id, name, description, photo_url)
    SELECT v_review_id, d->>'name', d->>'description', d->>'photo_url'
    FROM jsonb_array_elements(p_dishes) AS d;
  END IF;

  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
