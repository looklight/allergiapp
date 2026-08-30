-- STATO: non verificabile dallo schema (verificato il 2026-08-30):
-- non crea tabelle, colonne, funzioni, indici o policy — tocca
-- permessi, dati o impostazioni, che non lasciano traccia
-- confrontabile con questo file.
-- Fix: restaurant_claims.reviewed_by manca ON DELETE SET NULL
-- Senza questo, eliminare un admin che ha reviewato claim fallisce

ALTER TABLE restaurant_claims
  DROP CONSTRAINT restaurant_claims_reviewed_by_fkey,
  ADD CONSTRAINT restaurant_claims_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;
