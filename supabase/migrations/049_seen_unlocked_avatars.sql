-- Migration 049: Sistema di notifica per nuovi avatar sbloccati + cleanup catalogo.
--
-- 1) Aggiunge il tracking degli avatar che l'utente ha già visto come "sbloccati"
--    per permettere al client di mostrare un popup quando ne compaiono di nuovi.
-- 2) Imposta `plate_main_logo` come avatar di default per i nuovi profili.
-- 3) Pulisce eventuali avatar_url legacy (nomi vecchi pre-rinomina apr 2026)
--    e valori non più presenti nel catalogo, riallineando tutto.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Tracking avatar già notificati all'utente
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

ALTER TABLE profiles
  ALTER COLUMN avatar_url SET DEFAULT 'plate_main_logo';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Cleanup avatar_url legacy → nuovi id del catalogo
-- ═══════════════════════════════════════════════════════════════════════════════
-- Mapping pre-rinomina apr 2026:
--   plate_forks    → plate_main_logo    plate_explorer → plate_straw
--   plate_critic   → plate_wolfe        plate_mapper   → plate_bat
--   plate_gourmet  → plate_veget        plate_atlas    → plate_bl_mask
--   plate_michelin → plate_wizard

UPDATE profiles SET avatar_url = 'plate_main_logo' WHERE avatar_url = 'plate_forks';
UPDATE profiles SET avatar_url = 'plate_wolfe'     WHERE avatar_url = 'plate_critic';
UPDATE profiles SET avatar_url = 'plate_veget'     WHERE avatar_url = 'plate_gourmet';
UPDATE profiles SET avatar_url = 'plate_wizard'    WHERE avatar_url = 'plate_michelin';
UPDATE profiles SET avatar_url = 'plate_straw'     WHERE avatar_url = 'plate_explorer';
UPDATE profiles SET avatar_url = 'plate_bat'       WHERE avatar_url = 'plate_mapper';
UPDATE profiles SET avatar_url = 'plate_bl_mask'   WHERE avatar_url = 'plate_atlas';

-- Backfill NULL e qualsiasi altro valore non riconosciuto → default.
UPDATE profiles SET avatar_url = 'plate_main_logo'
 WHERE avatar_url IS NULL
    OR avatar_url NOT IN (
     'plate_main_logo','plate_passport','plate_language',
     'plate_wolfe','plate_veget','plate_wizard',
     'plate_straw','plate_bat','plate_bl_mask',
     'plate_green_belt','plate_pink_belt'
   );
