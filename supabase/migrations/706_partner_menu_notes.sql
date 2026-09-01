-- ============================================================
-- 706_partner_menu_notes.sql
-- STATO: APPLICATA il 2026-09-01 via SQL editor, dopo la 705 (il
-- tracking locale è fermo alla 045: questa, come tutte le 046+, va
-- eseguita a mano — MAI db push). Colonne verificate sul database
-- lo stesso giorno: kind NOT NULL DEFAULT 'section',
-- table_conditions nullable.
--
-- Due campi di testo che il cliente legge al tavolo, decisi il
-- 2026-09-01 (DIGITAL_MENU.md, Tema 18):
--
--   1. i BLOCCHI DI TESTO fra una sezione e l'altra
--   2. le CONDIZIONI AL TAVOLO in fondo a ogni menù del locale
--
-- Nascono dalla stessa conversazione in cui è CADUTO il disclaimer
-- dal menù al tavolo ("dichiarato dal ristorante, non verificato
-- da AllergiApp"). Al tavolo è il ristorante che ti porge il suo
-- menù col QR, e nessuno pensa che una carta stampata sia stata
-- verificata da un terzo: quella frase resta dov'era già e dove
-- serve davvero, cioè sulla SCHEDA in app, dove siamo NOI a
-- presentare un ristorante a chi lo sta scegliendo da lontano.
-- Il fondo del menù diventa così del ristoratore, ed è lì che
-- vanno coperto e servizio.
--
-- Nessuna delle due colonne è un dato privato: finiscono
-- entrambe sulla pagina che leggerà chiunque inquadri il QR
-- (Tema 6). Vale la pena ripeterlo qui perché `partner_venues`
-- tiene anche roba che pubblica non è.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. LE SEZIONI HANNO UN TIPO
-- Una sezione con dentro dei piatti, o un blocco di solo testo.
-- Sono la stessa riga perché sono la stessa cosa nell'ordine del
-- menù: si trascinano insieme, stanno nella stessa fila, e
-- l'ordine è già la posizione in sort_order. Un'altra tabella
-- avrebbe voluto un secondo ordinamento da fondere col primo.
--
-- Il blocco riusa le colonne che ci sono: `name` è il titolo
-- (facoltativo) e `description` è il testo. Non sono usi
-- forzati — un blocco È un titolo più un testo — e una colonna
-- `body` in più sarebbe stata vuota su ogni sezione vera.
--
-- 'section' come default: tutte le righe che esistono oggi sono
-- sezioni di piatti, e chi scrive senza specificare il tipo (il
-- ripristino dopo un undo, un domani un "duplica menù") ottiene
-- il caso normale.
--
-- Niente vincolo che impedisca a un blocco di avere piatti
-- dentro: costerebbe un trigger per un caso che l'editor non
-- offre — sui blocchi non c'è nessun "Aggiungi piatti" e nessuna
-- destinazione nella tendina "Sposta in". Se un domani si
-- volesse trasformare una sezione in blocco, i piatti dovranno
-- risalire fuori sezione come fa già l'eliminazione.
-- ------------------------------------------------------------
ALTER TABLE partner_menu_sections
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'section'
    CHECK (kind IN ('section', 'note'));


-- ------------------------------------------------------------
-- 2. LE CONDIZIONI AL TAVOLO, SUL LOCALE
-- Coperto, servizio, pagamenti: le poche righe che valgono
-- comunque, in fondo a ogni menù.
--
-- Stanno sul LOCALE e non sul menù perché le linguette in cima
-- alla pagina pubblica (carta, pranzo, bevande) sono lo stesso
-- tavolo: il coperto non cambia passando da una all'altra, e
-- scritto sul menù andrebbe ricopiato in tutte e tre — poi
-- corretto in tutte e tre. Quello che invece è del singolo menù
-- si scrive in un blocco di testo, che a questo punto esiste.
--
-- Nullable e senza default, come le descrizioni della 705: un
-- locale esistente resta senza finché qualcuno non le scrive, e
-- il portale legge NULL come stringa vuota.
-- ------------------------------------------------------------
ALTER TABLE partner_venues
  ADD COLUMN table_conditions TEXT;

COMMIT;
