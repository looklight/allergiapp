-- ============================================================
-- 701_partner_marketing_consent.sql
-- STATO: APPLICATA il 2026-08-30 via SQL editor (verificato: le due
-- colonne esistono, il default è false e la data è nullable).
-- Il tracking locale delle migration è fermo alla 045: questa,
-- come tutte le 046+, è stata applicata a mano — MAI db push.
--
-- Il modulo di iscrizione partner raccoglie un consenso marketing
-- facoltativo dal 22/08, ma la 700 non gli ha dato una colonna:
-- finora viveva nei metadati dell'utente, che il client può
-- modificare da sé. Un consenso conservato dove l'interessato
-- può riscriverselo non è dimostrabile, ed è proprio la
-- dimostrabilità che il GDPR chiede (art. 7 §1).
--
-- Due colonne e non una: serve sapere QUANDO è stato dato o
-- ritirato, altrimenti resta un sì o un no senza data. Non è un
-- registro storico completo — se servirà tenere tutta la catena
-- dei cambi diventerà una tabella a parte, e questa resterà lo
-- stato corrente.
--
-- Additiva e con default: il portale già in produzione continua
-- a funzionare senza sapere che queste colonne esistono.
-- ============================================================

BEGIN;

ALTER TABLE partner_accounts
  ADD COLUMN marketing_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN marketing_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN partner_accounts.marketing_consent IS
  'Consenso facoltativo agli aggiornamenti AllergiApp Partner. Falso = mai dato o ritirato.';
COMMENT ON COLUMN partner_accounts.marketing_consent_at IS
  'Quando il consenso è stato dato o ritirato l''ultima volta. NULL = mai espresso.';

COMMIT;
