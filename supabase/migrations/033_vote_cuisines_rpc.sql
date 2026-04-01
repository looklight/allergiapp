-- Migration 033: Atomic vote cuisines RPC
-- Sostituisce il pattern non atomico DELETE + INSERT lato client.
-- Una singola transazione: se qualcosa fallisce, nessun dato viene perso.

CREATE OR REPLACE FUNCTION vote_cuisines(
  p_restaurant_id UUID,
  p_user_id       UUID,
  p_cuisine_ids   TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Rimuovi tutti i voti precedenti dell'utente per questo ristorante
  DELETE FROM restaurant_cuisine_votes
  WHERE restaurant_id = p_restaurant_id
    AND user_id = p_user_id;

  -- Inserisci i nuovi voti (se presenti)
  IF array_length(p_cuisine_ids, 1) > 0 THEN
    INSERT INTO restaurant_cuisine_votes (restaurant_id, user_id, cuisine_id)
    SELECT p_restaurant_id, p_user_id, unnest(p_cuisine_ids);
  END IF;
END;
$$;
