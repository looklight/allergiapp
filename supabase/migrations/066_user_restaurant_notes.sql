-- Migration 066: Note personali sui ristoranti preferiti
--
-- L'utente puo' allegare una nota privata a un ristorante che ha tra i
-- preferiti (ispirazione: la nota sui luoghi salvati di Google Maps).
--
-- Scelte di design:
-- - La nota APPARTIENE al preferito: FK composta (user_id, restaurant_id) ->
--   favorites(user_id, restaurant_id) ON DELETE CASCADE. Togliere il preferito
--   da QUALSIASI punto (scheda, cuore sulla mappa, auto-cleanup del ristorante
--   sparito) cancella la nota a livello DB. Nessun orfano possibile per
--   costruzione, nessuna logica di cancellazione sparsa lato app.
-- - Una sola nota per (utente, ristorante): PK composta + upsert.
-- - PRIVATA: RLS owner-only su tutte le operazioni. NON esiste un SELECT
--   pubblico (a differenza di `favorites`, che e' USING(true) per i conteggi):
--   nessun altro utente puo' leggere la nota. L'admin via service_role bypassa
--   l'RLS, quindi la nota semplicemente NON va esposta nella dashboard.
-- - Nessun CHECK rigido sulla lunghezza: il limite (~300) e' lato client,
--   morbido e modificabile via OTA senza migration.

CREATE TABLE favorite_notes (
  user_id       UUID NOT NULL,
  restaurant_id UUID NOT NULL,
  note          TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, restaurant_id),
  FOREIGN KEY (user_id, restaurant_id)
    REFERENCES favorites (user_id, restaurant_id) ON DELETE CASCADE
);

ALTER TABLE favorite_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own notes"
  ON favorite_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own notes"
  ON favorite_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own notes"
  ON favorite_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own notes"
  ON favorite_notes FOR DELETE
  USING (auth.uid() = user_id);
