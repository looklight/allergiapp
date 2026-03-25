-- Migration 023: anonimato profilo utente
-- Aggiunge is_anonymous a profiles.
-- DEFAULT false = tutti gli utenti esistenti restano visibili senza migrazione dati.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;
