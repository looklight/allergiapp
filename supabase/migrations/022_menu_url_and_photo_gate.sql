-- Migration 022: link menu su restaurants + gate upload foto menu a soli reviewer

-- 1. Aggiungi colonna menu_url alla tabella restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS menu_url TEXT;

-- 2. Assicura che RLS sia attivo su menu_photos
ALTER TABLE menu_photos ENABLE ROW LEVEL SECURITY;

-- 3. Ricrea le policy di menu_photos pulite
--    (DROP IF EXISTS per evitare conflitti con eventuali policy pre-esistenti)
DROP POLICY IF EXISTS "Public can view menu photos"             ON menu_photos;
DROP POLICY IF EXISTS "Authenticated users can insert menu photos" ON menu_photos;
DROP POLICY IF EXISTS "Users can insert menu photos"            ON menu_photos;
DROP POLICY IF EXISTS "Only reviewers can upload menu photos"   ON menu_photos;
DROP POLICY IF EXISTS "Users can delete own menu photos"        ON menu_photos;

-- Lettura pubblica
CREATE POLICY "Public can view menu photos"
  ON menu_photos FOR SELECT
  USING (true);

-- Inserimento: solo utenti autenticati che hanno già almeno una recensione
CREATE POLICY "Only reviewers can upload menu photos"
  ON menu_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM reviews WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- Cancellazione: solo il proprietario della foto
CREATE POLICY "Users can delete own menu photos"
  ON menu_photos FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 4. RPC per aggiornare il link menu (con gate: almeno una recensione)
CREATE OR REPLACE FUNCTION update_restaurant_menu_url(
  p_restaurant_id UUID,
  p_menu_url       TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM reviews WHERE user_id = auth.uid() LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Devi aver scritto almeno una recensione per aggiornare il link del menu';
  END IF;

  UPDATE restaurants
  SET menu_url   = p_menu_url,
      updated_at = now()
  WHERE id = p_restaurant_id;
END;
$$;
