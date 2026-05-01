-- 051: Tabella annunci in-app
-- Permette all'admin di pubblicare messaggi popup agli utenti.
-- Un solo annuncio può essere attivo alla volta.
-- Gli utenti vedono l'annuncio una volta sola (dismissal salvato in AsyncStorage).
-- title, body, button_label e share_text sono JSONB per supportare le 5 lingue (it, en, fr, de, es).
--
-- PREREQUISITO STORAGE: creare manualmente il bucket "announcements" dalla Dashboard Supabase
--   (Storage → New bucket → nome: "announcements", Public: ON)
-- Le policy storage sotto si applicano a quel bucket.

CREATE TABLE announcements (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         JSONB       NOT NULL,
  body          JSONB       NOT NULL,
  image_url     TEXT,
  button_label  JSONB,
  button_action TEXT        CHECK (button_action IN ('share', 'url')),
  button_url    TEXT,
  share_text    JSONB,
  is_active           BOOLEAN     NOT NULL DEFAULT false,
  view_count          INTEGER     NOT NULL DEFAULT 0,
  button_click_count  INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere gli annunci attivi (app pubblica, anche utenti non loggati)
CREATE POLICY "Public can read active announcements"
  ON announcements FOR SELECT
  USING (is_active = true);

-- Admin vede tutti gli annunci, anche quelli inattivi
CREATE POLICY "Admins can read all announcements"
  ON announcements FOR SELECT
  USING (is_admin());

-- Solo admin può creare, modificare ed eliminare annunci
CREATE POLICY "Admins can insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  USING (is_admin());

-- STORAGE: bucket "announcements" (immagini degli annunci, solo admin)

-- SELECT: lettura pubblica (l'app carica l'immagine senza autenticazione)
CREATE POLICY "Public read access for announcement images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'announcements');

-- INSERT: solo admin può caricare immagini
CREATE POLICY "Admins can upload announcement images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'announcements' AND is_admin());

-- UPDATE: solo admin può sovrascrivere immagini
CREATE POLICY "Admins can update announcement images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'announcements' AND is_admin())
  WITH CHECK (bucket_id = 'announcements' AND is_admin());

-- DELETE: solo admin può eliminare immagini
CREATE POLICY "Admins can delete announcement images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'announcements' AND is_admin());

-- ANALYTICS: contatori view e click (chiamabili anche da utenti non loggati)

CREATE OR REPLACE FUNCTION track_announcement_view(announcement_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE announcements
  SET view_count = view_count + 1
  WHERE id = announcement_id AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION track_announcement_click(announcement_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE announcements
  SET button_click_count = button_click_count + 1
  WHERE id = announcement_id AND is_active = true;
$$;
