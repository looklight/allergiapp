-- ============================================================
-- 712_partner_terms_version.sql
-- STATO: DA APPLICARE a mano via SQL editor.
-- Il tracking locale delle migration è fermo alla 045: questa,
-- come tutte le 046+, va applicata a mano — MAI db push.
--
-- La 700 registra QUANDO il partner ha accettato le condizioni
-- (terms_accepted_at) ma non A COSA ha detto sì. Finché i
-- documenti erano quelli dell'app — e non parlavano di
-- ristoratori — la domanda non aveva risposta comunque; dal
-- 06/09 l'informativa e le condizioni hanno una sezione partner,
-- quindi esistono versioni diverse e la differenza conta.
--
-- Il GDPR chiede di poter dimostrare il consenso (art. 7 §1): una
-- data da sola non dimostra niente se il testo nel frattempo è
-- cambiato.
--
-- La versione è la DATA DEI DOCUMENTI in forma AAAA-MM-GG, non un
-- numero progressivo: è già l'etichetta che si legge in cima alle
-- due pagine ("Ultimo aggiornamento"), e così la prova si verifica
-- guardando il sito invece che una tabella di corrispondenze.
--
-- TEXT e non una data vera: è un'etichetta di edizione, non un
-- istante. Nullable: le righe già esistenti hanno accettato un
-- testo che non aveva ancora versione, e inventargliene una sarebbe
-- il contrario di una prova.
--
-- Additiva: il portale in produzione continua a funzionare senza
-- sapere che questa colonna esiste.
-- ============================================================

BEGIN;

ALTER TABLE partner_accounts
  ADD COLUMN terms_version TEXT;

COMMENT ON COLUMN partner_accounts.terms_version IS
  'Edizione dei documenti accettati, come data AAAA-MM-GG uguale a "Ultimo aggiornamento" su allergiapp.com/terms e /privacy. NULL = iscrizione anteriore alla versione dei documenti (v. terms_accepted_at).';

COMMIT;
