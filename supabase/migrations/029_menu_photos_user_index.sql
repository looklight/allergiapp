-- STATO: NON APPLICATA (verificato sullo schema il 2026-08-30).
-- Il suo unico indice non esiste e nessuna migration lo elimina.
-- Poco importa: menu_photos è in ritiro (foto menù rimosse dalla UI).
-- Migration 029: indice su menu_photos(user_id)
-- Necessario per query di cleanup foto quando un utente viene eliminato (CASCADE)

CREATE INDEX IF NOT EXISTS idx_menu_photos_user_id ON menu_photos(user_id);
