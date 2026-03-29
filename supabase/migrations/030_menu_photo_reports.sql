-- 030: Segnalazioni su foto menu
-- Aggiunge menu_photo_id a reports e permette all'admin di eliminare foto del menu

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS menu_photo_id UUID REFERENCES menu_photos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_menu_photo
  ON reports(menu_photo_id)
  WHERE menu_photo_id IS NOT NULL;

-- Admin puo eliminare qualsiasi foto del menu (necessario per "Elimina foto" dalla dashboard)
CREATE POLICY "Admins can delete menu photos"
  ON menu_photos FOR DELETE
  USING (is_admin());
