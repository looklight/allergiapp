-- Migration 071: RPC per aggiornare serves_food su una struttura lodging
--
-- Contesto: il toggle "ha un ristorante aperto al pubblico?" oggi viene settato
-- SOLO all'inserimento (add.tsx). Vogliamo che anche i recensori successivi di un
-- ALLOGGIO possano cambiarlo nel tempo (es. un hotel apre/chiude il ristorante al
-- pubblico). La RLS su `restaurants` consente UPDATE solo a owner/admin (001),
-- quindi un recensore normale NON puo' scriverlo dal client.
--
-- Soluzione NON strutturale (zero tabelle/colonne nuove): una funzione
-- SECURITY DEFINER che aggira la RLS in modo controllato e ristretto:
--   - solo utenti autenticati (auth.uid() not null);
--   - solo su righe che SONO strutture (offers_lodging = true): un ristorante puro
--     non e' toccabile da qui, e il CHECK (serves_food OR offers_lodging) della
--     067 non puo' mai essere violato (offers_lodging resta true).
--   - solo da chi ha gia' recensito quel posto (EXISTS su reviews): il toggle vive
--     nella schermata recensione, ma la RPC e' un endpoint chiamabile direttamente
--     -> il vincolo rende "solo chi recensisce puo' cambiarlo" una garanzia di DATO,
--     non solo di UI. Nel flusso app il submit salva la review PRIMA di chiamare
--     questa RPC, quindi per un uso legittimo l'EXISTS e' sempre soddisfatto.
-- La direzione "spegni" resta correggibile anche da admin dal dashboard (backstop
-- autorevole). Le recensioni NON vengono toccate: serves_food e' sola visibilita',
-- non proprieta' del dato (solo il DELETE del ristorante porta via le review).

CREATE OR REPLACE FUNCTION set_lodging_serves_food(
  p_restaurant_id UUID,
  p_serves_food   BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE restaurants
  SET serves_food = p_serves_food
  WHERE id = p_restaurant_id
    AND offers_lodging = true
    AND EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.restaurant_id = p_restaurant_id
        AND r.user_id = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION set_lodging_serves_food(UUID, BOOLEAN) TO authenticated;
