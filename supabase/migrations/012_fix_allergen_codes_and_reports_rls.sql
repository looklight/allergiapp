-- 012: Allinea codici allergeni SQL ai TypeScript ID + fix RLS reports

-- ─── Fix codici allergeni nella tabella di riferimento ─────────────────────
-- SQL usava British English (sulphites, molluscs), TypeScript usa American (sulfites, mollusks)
UPDATE allergens SET code = 'sulfites'  WHERE code = 'sulphites';
UPDATE allergens SET code = 'mollusks'  WHERE code = 'molluscs';

-- Aggiorna eventuali profili con i vecchi codici
UPDATE profiles
  SET allergens = array_replace(allergens, 'sulphites', 'sulfites')
  WHERE 'sulphites' = ANY(allergens);

UPDATE profiles
  SET allergens = array_replace(allergens, 'molluscs', 'mollusks')
  WHERE 'molluscs' = ANY(allergens);

-- Aggiorna eventuali snapshot review con i vecchi codici
UPDATE reviews
  SET allergens_snapshot = array_replace(allergens_snapshot, 'sulphites', 'sulfites')
  WHERE 'sulphites' = ANY(allergens_snapshot);

UPDATE reviews
  SET allergens_snapshot = array_replace(allergens_snapshot, 'molluscs', 'mollusks')
  WHERE 'molluscs' = ANY(allergens_snapshot);

-- ─── Reports: consenti a tutti gli utenti autenticati di leggere le segnalazioni ──
-- La UI mostra le segnalazioni in forma anonima ("Utente") nella scheda ristorante.
-- La policy attuale restituisce solo le segnalazioni dell'autore, rendendo il contatore
-- inutile per gli altri utenti.
CREATE POLICY "Authenticated users can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

-- Rimuovi la vecchia policy restrittiva (ora ridondante)
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
