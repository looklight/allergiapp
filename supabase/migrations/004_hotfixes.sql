-- Hotfix post-migrazione (eseguite manualmente su Supabase, consolidate qui per documentazione)
-- NOTA: queste policy sono GIA attive nel DB. Questo file serve come riferimento.

-- ============================================
-- PROFILES: policy mancanti dalla migration iniziale
-- ============================================
CREATE POLICY "Users can create their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE USING (auth.uid() = id);

-- ============================================
-- RESTAURANTS: policy e colonne aggiunte
-- ============================================

-- Colonna google_place_id per deduplicazione
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_place_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_google_place_id
  ON restaurants (google_place_id) WHERE google_place_id IS NOT NULL;

-- Policy DELETE: solo chi ha aggiunto puo eliminare
CREATE POLICY "Users can delete restaurants they added"
  ON restaurants FOR DELETE USING (auth.uid() = added_by);

-- Policy INSERT: rinforza ownership (added_by = auth.uid())
-- Sovrascrive la policy originale "Authenticated users can add restaurants"
DROP POLICY IF EXISTS "Authenticated users can add restaurants" ON restaurants;
CREATE POLICY "Authenticated users can add restaurants"
  ON restaurants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = added_by);

-- ============================================
-- STORAGE: path-based ownership per bucket "images"
-- ============================================
-- INSERT: utenti autenticati possono caricare solo nella propria cartella
-- Path: {userId}/reviews/..., {userId}/dishes/..., {userId}/menus/...
-- Regola: (storage.foldername(name))[1] = auth.uid()::text

-- Queste policy sono state create via Dashboard Supabase:
-- 1. "Users can upload to own folder" (INSERT)
-- 2. "Users can update own files" (UPDATE)
-- 3. "Users can delete own files" (DELETE)

-- ============================================
-- CLEANUP: rimozione trigger handle_new_user
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
