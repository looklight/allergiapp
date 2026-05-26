-- Migration 059: restaurant slug per URL pubblici condivisibili
-- Aggiunge restaurants.slug come identificatore stabile per la pagina web /r/[slug].
-- Slug generato da name + city via translitterazione ASCII + collision handling con suffix numerico.
-- Immutabile: il trigger fire solo su INSERT, eventuali rename del ristorante non cambiano lo slug.

-- 1. Estensione unaccent (per translitterare accenti: Cocò -> coco)
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;

-- 2. Colonna slug (nullable in questo step, NOT NULL alla fine)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS slug TEXT;

-- 3. Funzione di generazione slug base da name + city
--    - Lowercase, translitterazione accenti, non-alfanumerici -> hyphen
--    - Truncate a 80 caratteri (URL-friendly), trim hyphens
--    - Fallback 'restaurant' se risultato vuoto (caso edge: name solo simboli o NULL)
CREATE OR REPLACE FUNCTION generate_restaurant_slug(p_name TEXT, p_city TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_base TEXT;
BEGIN
  v_base := lower(coalesce(p_name, '') || '-' || coalesce(p_city, ''));
  v_base := extensions.unaccent(v_base);
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  v_base := substring(v_base FROM 1 FOR 80);
  v_base := trim(both '-' from v_base);
  IF v_base = '' THEN
    v_base := 'restaurant';
  END IF;
  RETURN v_base;
END;
$$;

-- 4. Funzione di assegnazione slug unico (gestione collisioni con suffix numerico)
--    Se base esiste già -> base-2, base-3, ... fino a trovare un libero.
CREATE OR REPLACE FUNCTION assign_unique_restaurant_slug(p_base TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug TEXT := p_base;
  v_suffix INT := 2;
BEGIN
  WHILE EXISTS (SELECT 1 FROM restaurants WHERE slug = v_slug) LOOP
    v_slug := p_base || '-' || v_suffix;
    v_suffix := v_suffix + 1;
  END LOOP;
  RETURN v_slug;
END;
$$;

-- 5. Trigger BEFORE INSERT: auto-assegna slug se non passato dal client
--    Non fire su UPDATE per garantire immutabilità (Tema 2 in SHARE_FEATURE.md).
--    Eventuali override manuali da admin (UPDATE diretto su slug) restano possibili.
CREATE OR REPLACE FUNCTION restaurants_assign_slug_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := assign_unique_restaurant_slug(generate_restaurant_slug(NEW.name, NEW.city));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restaurants_assign_slug ON restaurants;
CREATE TRIGGER restaurants_assign_slug
  BEFORE INSERT ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION restaurants_assign_slug_trigger();

-- 6. Backfill ristoranti esistenti (riga per riga)
--    Loop per consentire a assign_unique_restaurant_slug di vedere gli slug
--    appena assegnati alle righe precedenti nella stessa transazione.
--    Idempotente: la WHERE slug IS NULL salta righe già backfillate in run precedenti.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, name, city FROM restaurants WHERE slug IS NULL LOOP
    UPDATE restaurants
    SET slug = assign_unique_restaurant_slug(generate_restaurant_slug(r.name, r.city))
    WHERE id = r.id;
  END LOOP;
END $$;

-- 7. Constraints finali: UNIQUE su slug + NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_slug_unique_idx ON restaurants(slug);
ALTER TABLE restaurants ALTER COLUMN slug SET NOT NULL;
