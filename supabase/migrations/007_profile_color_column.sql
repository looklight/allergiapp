-- Sposta profile_color da auth.user_metadata alla tabella profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_color TEXT;
