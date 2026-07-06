-- Migration 072: posizioni ristoranti per lista di id (fix pin mancanti mappa profilo)
--
-- Contesto: la mappa profilo arricchisce recensioni/preferiti/liste con le
-- coordinate reali via get_all_restaurant_positions (035), che torna TUTTI i
-- ristoranti. PostgREST pero' tronca ogni risposta a max-rows (default 1000,
-- vale anche per le RPC): superati i 1000 ristoranti il client riceve un
-- sottoinsieme arbitrario (nessun ORDER BY) e i pin dei ristoranti esclusi
-- spariscono dalla mappa profilo.
--
-- Fix: il client chiede solo gli id che gli servono (le decine di ristoranti
-- dell'utente), cosi' il tetto non viene mai raggiunto e la query passa da
-- full scan a lookup su PK. Il chunking a 500 id per chiamata e' lato client.
--
-- NOTA: get_all_restaurant_positions (035) resta viva per i client che non
-- hanno ancora ricevuto l'OTA; da ritirare in una migration futura quando il
-- parco client sara' aggiornato.
CREATE OR REPLACE FUNCTION get_restaurant_positions_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, latitude double precision, longitude double precision)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    r.id,
    ST_Y(r.location::geometry) AS latitude,
    ST_X(r.location::geometry) AS longitude
  FROM restaurants r
  WHERE r.id = ANY(p_ids)
    AND r.location IS NOT NULL;
$$;
