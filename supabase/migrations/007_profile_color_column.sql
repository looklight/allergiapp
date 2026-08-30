-- STATO: APPLICATA (verificato sullo schema il 2026-08-30).
-- Alcuni oggetti non ci sono più perché rimossi da migration
-- successive: profiles.profile_color.
-- Sposta profile_color da auth.user_metadata alla tabella profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_color TEXT;
