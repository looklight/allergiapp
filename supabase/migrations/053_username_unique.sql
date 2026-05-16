-- Migration 053: username unico ASCII
-- Aggiunge profiles.username come identificatore unico (case-insensitive).
-- Twitter-style: casing preservata in storage, unicità su lower(username).
-- display_name resta in tabella per retrocompatibilità durante la transizione.
-- Drop di display_name pianificato in una migration successiva (Step 4 del piano).

-- 1. Aggiunge colonna username (nullable in questo step)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Backfill: utenti con display_name già valido lo copiano as-is
UPDATE profiles
SET username = display_name
WHERE username IS NULL
  AND display_name IS NOT NULL
  AND display_name ~ '^[A-Za-z0-9][A-Za-z0-9_.]{1,28}[A-Za-z0-9_]$'
  AND display_name !~ '\.\.';

-- 3. Backfill: utenti con display_name non valido o NULL ricevono user_xxxxxx
--    Deterministico (stesso uid -> stesso username), non collide con nomi scelti
--    dall'utente perche' user_ + 6 hex e' un pattern specifico
UPDATE profiles
SET username = 'user_' || substring(replace(id::text, '-', '') FROM 1 FOR 6)
WHERE username IS NULL;

-- 4. CHECK constraint formato:
--    - 3-30 caratteri
--    - Primo char: alfanumerico (no underscore/dot iniziale)
--    - Ultimo char: alfanumerico o underscore (no dot finale)
--    - Caratteri ammessi internamente: A-Z a-z 0-9 _ .
--    - Vietati due punti consecutivi
ALTER TABLE profiles ADD CONSTRAINT username_format CHECK (
  username ~ '^[A-Za-z0-9][A-Za-z0-9_.]{1,28}[A-Za-z0-9_]$'
  AND username !~ '\.\.'
);

-- 5. Unicita' case-insensitive: 'LeoDurso' e 'leodurso' sono lo stesso username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON profiles (lower(username));

-- 6. Trigger BEFORE INSERT: se il client non passa username,
--    lo genera automaticamente da id. Difesa per nuovi signup
--    e per futuri bug client che dimenticassero il campo.
CREATE OR REPLACE FUNCTION set_default_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username := 'user_' || substring(replace(NEW.id::text, '-', '') FROM 1 FOR 6);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_default_username ON profiles;
CREATE TRIGGER profiles_set_default_username
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_default_username();
