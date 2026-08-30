-- STATO: APPLICATA (verificato sullo schema il 2026-08-30).
-- Migration 052: Aggiunge health_consent_at a profiles
-- Registra il momento esatto in cui l'utente ha dato il consenso esplicito
-- al trattamento dei dati sanitari (allergie/diete) — Art. 9 GDPR.
-- NULL = utente precedente alla migration o che ha saltato la selezione allergie.

ALTER TABLE profiles ADD COLUMN health_consent_at TIMESTAMPTZ;
