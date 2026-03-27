-- Patch 028b: aggiunge indice mancante su review_likes(user_id)
-- Da eseguire su Supabase se 028 è già stato applicato
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);
