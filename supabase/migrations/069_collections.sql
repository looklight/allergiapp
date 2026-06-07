-- Migration 069: Liste (collezioni) di ristoranti
--
-- Evoluzione dei "preferiti" in liste stile Google Maps: l'utente puo' creare
-- piu' liste oltre a quella di default ("Preferiti") e — in una fase successiva —
-- renderle pubbliche/condivisibili.
--
-- SCELTA ARCHITETTURALE: modello UNIFICATO. Ogni lista e' un oggetto di prima
-- classe (nome, visibilita', slug, owner). "Preferiti" non e' piu' una tabella
-- speciale: e' la riga `collections.is_default` dell'utente. Una sola via di
-- codice per tutte le liste -> condivisione/collaborazione future senza casi
-- speciali.
--
-- COMPATIBILITA' RPC: le ~15 RPC che calcolano `favorite_count` leggono
-- `favorites` SOLO come conteggio per restaurant_id
--   (SELECT restaurant_id, COUNT(*) FROM favorites GROUP BY restaurant_id).
-- Per non riscriverle, `favorites` diventa una VISTA di sola lettura sugli item
-- della lista di default. Le RPC e i conteggi community (batchLoadStats) restano
-- invariati; il cuore/pin mappa restano coerenti.
--
-- Cosa cambia lato client (codice nostro, step successivi): favoriteService
-- scrive su collection_items della lista default; getFavorites legge da li'.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. TABELLE
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Nome libero per le liste custom. Per la lista di default (is_default) il nome
  -- e' renderizzato localizzato lato app (i18n), quindi qui resta un placeholder.
  name        TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  -- Predisposizione fase 2 (condivisione): nessuna UI/uso in v1, default privato.
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  slug        TEXT,            -- popolato solo quando la lista diventa pubblica
  position    INTEGER NOT NULL DEFAULT 0,   -- ordinamento manuale delle liste
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Una sola lista di default ("Preferiti") per utente.
CREATE UNIQUE INDEX idx_collections_one_default ON collections (user_id) WHERE is_default;
CREATE INDEX idx_collections_user ON collections (user_id);
-- Slug unico solo tra le liste pubbliche (fase 2).
CREATE UNIQUE INDEX idx_collections_slug ON collections (slug) WHERE slug IS NOT NULL;

CREATE TABLE collection_items (
  collection_id UUID NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants (id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, restaurant_id)
);

-- Per il conteggio community per ristorante (vista favorites) e per i join.
CREATE INDEX idx_collection_items_restaurant ON collection_items (restaurant_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. BACKFILL dai preferiti esistenti (PRIMA di sostituire `favorites`)
-- ════════════════════════════════════════════════════════════════════════════
-- Una lista di default per ogni utente che ha almeno un preferito.
INSERT INTO collections (user_id, name, is_default)
SELECT DISTINCT user_id, 'Preferiti', true
FROM favorites;

-- Sposta i preferiti esistenti dentro la rispettiva lista di default.
INSERT INTO collection_items (collection_id, restaurant_id, created_at)
SELECT c.id, f.restaurant_id, f.created_at
FROM favorites f
JOIN collections c ON c.user_id = f.user_id AND c.is_default;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. STACCO favorite_notes da favorites (la tabella sta per diventare vista)
-- ════════════════════════════════════════════════════════════════════════════
-- favorite_notes aveva una FK composta con ON DELETE CASCADE verso favorites.
-- Sostituendo favorites con una vista, la FK non e' piu' possibile: la tolgo.
-- La nota resta keyata su (user_id, restaurant_id), owner-only (RLS invariata).
-- NOTA: il cleanup "nota orfana quando il posto esce da tutte le liste" e la
-- conferma lato app arrivano nello step dedicato alla nota. Con ~zero utenti
-- non c'e' regressione pratica nel frattempo.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'favorite_notes'::regclass AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE favorite_notes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- La nota ora vive "per posto salvato" (non piu' agganciata a favorites), ma
-- deve comunque sparire se l'utente o il ristorante vengono cancellati: prima
-- questo era garantito a catena dalla FK su favorites. Le FK dirette lo
-- ripristinano. (Il cleanup "fuori da tutte le liste" e' nella sezione 6 sotto.)
ALTER TABLE favorite_notes
  ADD CONSTRAINT favorite_notes_user_fkey
    FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE,
  ADD CONSTRAINT favorite_notes_restaurant_fkey
    FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. `favorites` diventa una VISTA (compatibilita' RPC + conteggi community)
-- ════════════════════════════════════════════════════════════════════════════
DROP TABLE favorites;

-- Sola lettura. Espone le stesse colonne usate dalle RPC e da batchLoadStats:
-- (user_id, restaurant_id, created_at). NON e' security_invoker: gira coi
-- privilegi dell'owner cosi' i conteggi community vedono TUTTE le righe, come
-- faceva la policy USING(true) della vecchia tabella.
CREATE VIEW favorites AS
  SELECT c.user_id, ci.restaurant_id, ci.created_at
  FROM collection_items ci
  JOIN collections c ON c.id = ci.collection_id
  WHERE c.is_default;

GRANT SELECT ON favorites TO anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. RLS sulle nuove tabelle
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- collections: l'owner gestisce le proprie; chiunque legge quelle pubbliche
-- (la policy pubblica e' gia' qui, ma senza UI fino alla fase 2).
CREATE POLICY "Owner manages own collections"
  ON collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone reads public collections"
  ON collections FOR SELECT
  USING (visibility = 'public');

-- collection_items: gestiti dall'owner della lista padre; lettura pubblica
-- quando la lista padre e' pubblica.
CREATE POLICY "Owner manages own collection items"
  ON collection_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Anyone reads items of public collections"
  ON collection_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_id AND c.visibility = 'public'
  ));

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Nota "per posto salvato": pulizia automatica
-- ════════════════════════════════════════════════════════════════════════════
-- La nota personale (favorite_notes) ora vive "per posto salvato": resta keyata
-- su (user_id, restaurant_id) e vale finche' il ristorante e' in ALMENO una
-- lista. Garantiamo "zero note fantasma" cancellandola quando il posto esce
-- dall'ULTIMA lista dell'utente. Due percorsi di rimozione, due trigger:
--   1) rimozione di un singolo item (la lista resta)      -> trigger su collection_items
--   2) cancellazione di un'intera lista (con i suoi item) -> trigger su collections
-- In entrambi: si cancella solo se NON resta nessun item per quel (utente,
-- ristorante) in nessun'altra lista. La conferma lato app avvisa prima della
-- rimozione; questi trigger sono la rete di sicurezza a livello DB.

-- ── 1. Rimozione singolo item (la lista padre esiste ancora) ──────────────────
CREATE OR REPLACE FUNCTION cleanup_note_on_item_removed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  SELECT user_id INTO v_user FROM collections WHERE id = OLD.collection_id;
  -- Lista padre gia' sparita: se ne occupa il trigger su collections.
  IF v_user IS NULL THEN
    RETURN OLD;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM collection_items ci
    JOIN collections c ON c.id = ci.collection_id
    WHERE c.user_id = v_user AND ci.restaurant_id = OLD.restaurant_id
  ) THEN
    DELETE FROM favorite_notes
    WHERE user_id = v_user AND restaurant_id = OLD.restaurant_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cleanup_note_on_item_removed
AFTER DELETE ON collection_items
FOR EACH ROW EXECUTE FUNCTION cleanup_note_on_item_removed();

-- ── 2. Cancellazione di un'intera lista ───────────────────────────────────────
-- BEFORE DELETE: gli item della lista esistono ancora, ma quelli delle ALTRE
-- liste dell'utente ci dicono quali note devono sopravvivere.
CREATE OR REPLACE FUNCTION cleanup_notes_on_collection_removed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM favorite_notes fn
  WHERE fn.user_id = OLD.user_id
    AND fn.restaurant_id IN (
      SELECT restaurant_id FROM collection_items WHERE collection_id = OLD.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM collection_items ci
      JOIN collections c ON c.id = ci.collection_id
      WHERE c.user_id = OLD.user_id
        AND c.id <> OLD.id
        AND ci.restaurant_id = fn.restaurant_id
    );
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cleanup_notes_on_collection_removed
BEFORE DELETE ON collections
FOR EACH ROW EXECUTE FUNCTION cleanup_notes_on_collection_removed();
