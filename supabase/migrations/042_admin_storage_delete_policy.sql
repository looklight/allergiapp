-- 042: Policy mancanti per operazioni admin
--
-- 1. Storage: senza questa policy, storageCleanup.ts fallisce silenziosamente
--    quando un admin cancella foto di altri utenti (file orfani nello storage).
-- 2. Reviews UPDATE: necessario per rimuovere singole foto dal JSONB photos
--    di una recensione altrui (deleteReviewPhotoWithCleanup).

CREATE POLICY "Admins can delete any image file"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'images' AND is_admin());

CREATE POLICY "Admins can update reviews"
  ON reviews FOR UPDATE
  USING (is_admin());
