-- STATO: APPLICATA (verificato sullo schema il 2026-08-30).
-- Migration 070: emoji per le liste
--
-- Ogni lista custom puo' avere un'emoji (stile Google Maps): leggera, nessun
-- asset, gia' disponibile. Colonna nullable; la lista di default ("Preferiti")
-- non la usa (ha un simbolo fisso lato app). Puramente additiva.

ALTER TABLE collections ADD COLUMN IF NOT EXISTS emoji TEXT;
