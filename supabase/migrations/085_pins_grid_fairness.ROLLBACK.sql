-- ROLLBACK della 085 — riporta get_pins_in_bounds alla versione precedente.
--
-- NON serve ricreare niente: la 085 è stata applicata con due rinomine, e la
-- versione precedente (la 073) è ancora nel database, parcheggiata sotto il
-- nome `get_pins_in_bounds_073`. Il ritorno indietro sono le stesse due
-- rinomine al contrario. Nessun DROP, nessuna finestra in cui la funzione non
-- esiste, nessuna transazione.

ALTER FUNCTION get_pins_in_bounds(double precision, double precision, double precision, double precision, integer, boolean) RENAME TO get_pins_in_bounds_085;

ALTER FUNCTION get_pins_in_bounds_073(double precision, double precision, double precision, double precision, integer, boolean) RENAME TO get_pins_in_bounds;

-- Conferma: deve dare false (cioè è tornata la 073, che non ha row_number).
--
-- SELECT pg_get_functiondef(p.oid) LIKE '%row_number%' AS e_la_085
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'get_pins_in_bounds';
--
-- ⚠️ Le due funzioni parcheggiate (_073 e _085) restano nel database finché
-- qualcuno non le rimuove. Vanno tolte SOLO quando la scelta è definitiva e
-- dopo aver salvato il corpo di quella che si butta:
--   DROP FUNCTION get_pins_in_bounds_073(double precision, double precision, double precision, double precision, integer, boolean);
