-- Assicura che le policy RLS per il bucket "images" esistano
-- (potrebbero mancare se non create via Dashboard)

-- Drop eventuali policy esistenti per ricrearle pulite
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;

-- INSERT: utenti autenticati possono caricare solo nella propria cartella
-- Path: {userId}/reviews/..., {userId}/dishes/..., {userId}/menus/...
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: utenti possono sovrascrivere i propri file (usato con upsert: true)
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: utenti possono eliminare i propri file
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: lettura pubblica (bucket è Public, ma serve policy per RLS)
CREATE POLICY "Public read access for images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');
