-- Migration 049: Sistema di notifica per nuovi avatar sbloccati.
-- Aggiunge il tracking degli avatar che l'utente ha già visto come "sbloccati"
-- per permettere al client di mostrare un popup quando ne compaiono di nuovi.
-- Imposta inoltre l'avatar di default per i nuovi profili.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Colonna per tracciare gli avatar già notificati all'utente
-- ═══════════════════════════════════════════════════════════════════════════════
-- Set di id (es. 'plate_main_logo'). Il diff con gli avatar attualmente sbloccati
-- (computati lato client da AVATARS + stats utente) rappresenta i "nuovi sblocchi"
-- da mostrare. Strategia robusta a evoluzioni del catalogo (aggiunta avatar,
-- soglie modificate, ecc.) → si veda contexts/UnlockedAvatarsContext.tsx.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS seen_unlocked_avatars TEXT[] NOT NULL DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Default avatar per nuovi profili
-- ═══════════════════════════════════════════════════════════════════════════════
-- Tutti i nuovi utenti partono con plate_main_logo. Possono cambiarlo in qualsiasi
-- momento dalla galleria avatar. Backfill anche per profili esistenti senza avatar.

ALTER TABLE profiles
  ALTER COLUMN avatar_url SET DEFAULT 'plate_main_logo';

UPDATE profiles SET avatar_url = 'plate_main_logo' WHERE avatar_url IS NULL;
