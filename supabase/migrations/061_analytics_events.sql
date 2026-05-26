-- Migration 061: tabella analytics_events + RPC track_event
-- Sostituisce/affianca Firebase Analytics per gli eventi nuovi
-- (vedi memory project_firebase_removal: niente nuovi eventi su Firebase,
-- tracking su Supabase).
-- Prima esigenza concreta: evento restaurant_shared dalla feature share.

-- 1. Tabella eventi
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  TEXT NOT NULL,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  properties  JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
  ON analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events (user_id) WHERE user_id IS NOT NULL;

-- 2. RLS: nessuna lettura da client (admin via service role / dashboard).
--    Scrittura via RPC SECURITY DEFINER, non insert diretto da client.
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- (Nessuna policy = nessun accesso. Solo SECURITY DEFINER RPC puo' inserire.)

-- 3. RPC track_event: inserisce un evento dal client (anon o autenticato).
--    Cattura automaticamente auth.uid() se l'utente e' loggato, NULL altrimenti.
CREATE OR REPLACE FUNCTION track_event(
  p_event_name TEXT,
  p_properties JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Difesa minima: blocca event_name vuoti o troppo lunghi
  IF p_event_name IS NULL OR length(p_event_name) < 1 OR length(p_event_name) > 100 THEN
    RAISE EXCEPTION 'invalid event_name';
  END IF;

  INSERT INTO analytics_events (event_name, user_id, properties)
  VALUES (p_event_name, auth.uid(), COALESCE(p_properties, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION track_event(TEXT, JSONB) TO anon, authenticated;
