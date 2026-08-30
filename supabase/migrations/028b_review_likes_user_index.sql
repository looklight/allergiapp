-- STATO: NON APPLICATA (verificato sullo schema il 2026-08-30).
-- Il suo unico indice non esiste e nessuna migration lo elimina.
-- Superata comunque dalla 039 (idx_review_likes_review_user).
-- Patch 028b: aggiunge indice mancante su review_likes(user_id)
-- Da eseguire su Supabase se 028 è già stato applicato
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);
