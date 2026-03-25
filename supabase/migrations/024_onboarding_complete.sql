-- Aggiunge il flag onboarding_complete alla tabella profiles
ALTER TABLE profiles ADD COLUMN onboarding_complete boolean NOT NULL DEFAULT false;

-- Gli utenti esistenti hanno già completato l'onboarding
UPDATE profiles SET onboarding_complete = true;
