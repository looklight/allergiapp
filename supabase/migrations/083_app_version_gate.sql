-- 083: Gate versione minima (forzare / suggerire l'aggiornamento dell'app)
--
-- Riga singola di configurazione remota letta dall'app a ogni avvio. Serve come
-- ASSICURAZIONE: il gate e' utile solo se e' gia' dentro le build installate
-- *prima* che serva (aggiungerlo il giorno dell'emergenza non copre chi ha la
-- build vecchia — e' esattamente il caso delle foto menu').
--
-- Due livelli, convenzione standard (Play "immediate" vs "flexible"):
--   min_supported_version  -> sotto questa versione l'app mostra un MURO non
--                             chiudibile con link allo store. Da usare RARAMENTE
--                             (sicurezza, dati a rischio, API spenta).
--   recommended_version    -> sotto questa versione l'app mostra un avviso
--                             CHIUDIBILE, una volta sola per versione.
--
-- Valori iniziali '0.0.0': il gate nasce DORMIENTE, nessuno vede niente.
-- Si attiva con una UPDATE, e una UPDATE lo spegne. Mai hardcodare la soglia
-- nell'app: con le OTA bloccate, un valore sbagliato nel codice richiederebbe
-- una build nativa + review store per essere corretto.
--
-- Scialuppa per chi NON PUO' aggiornare: min_os_ios / min_os_android. Se
-- valorizzate, i device con OS inferiore sono ESENTATI dal muro (vedrebbero
-- una schermata che non possono superare: sullo store la build nuova non
-- e' installabile per loro). Oggi NULL = nessuna esenzione, da valorizzare
-- il giorno in cui una build alza il requisito di sistema.
--
-- Lato app il comportamento e' FAIL-OPEN: rete assente, timeout, riga mancante
-- o valore malformato -> l'app parte normalmente. Si blocca solo se il server
-- lo dice esplicitamente.

CREATE TABLE app_config (
  -- Riga unica: il CHECK + PRIMARY KEY rendono impossibile inserirne una seconda.
  id                    BOOLEAN     PRIMARY KEY DEFAULT true CHECK (id = true),
  min_supported_version TEXT        NOT NULL DEFAULT '0.0.0',
  recommended_version   TEXT        NOT NULL DEFAULT '0.0.0',
  min_os_ios            TEXT,
  min_os_android        TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica: il check parte all'avvio, anche prima del login.
CREATE POLICY "Public can read app config"
  ON app_config FOR SELECT
  USING (true);

-- Scrittura solo admin (in pratica: SQL editor / dashboard).
CREATE POLICY "Admins can update app config"
  ON app_config FOR UPDATE
  USING (is_admin());

-- GRANT esplicito come in 069: se la lettura fallisse, il client va in
-- fail-open e il gate resterebbe muto per sempre senza dare segnale.
GRANT SELECT ON app_config TO anon, authenticated;

INSERT INTO app_config (id) VALUES (true);
