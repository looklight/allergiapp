-- Migration 029: indice su menu_photos(user_id)
-- Necessario per query di cleanup foto quando un utente viene eliminato (CASCADE)

CREATE INDEX IF NOT EXISTS idx_menu_photos_user_id ON menu_photos(user_id);
