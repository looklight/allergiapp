-- Migration 705: personalizzazione del menù — descrizioni ed evidenza
--
-- Descrizioni libere su menù e sezioni: testo facoltativo che il ristoratore
-- scrive sotto il titolo del menù (es. orari, un avviso) e sotto il nome di
-- ogni sezione (es. "tutti fatti in casa"). Nullable e senza default: un
-- menù/sezione esistente resta senza descrizione finché qualcuno non la
-- scrive, e l'editor legge NULL come stringa vuota (vedi toMenu() in
-- partner/src/lib/menus.ts).
alter table partner_menus
  add column description text;

alter table partner_menu_sections
  add column description text;

-- Piatti in evidenza: un piatto può essere segnalato nel menù (un'offerta, un
-- consigliato dallo chef) con un flag e una nota facoltativa che spiega
-- perché. La nota conta solo quando il piatto è evidenziato: è l'editor a
-- svuotarla quando la stella si spegne (vedi setItemHighlighted in
-- partner/src/lib/menus.ts), quindi qui non serve un CHECK a tenerle
-- allineate.
alter table partner_menu_items
  add column highlighted boolean not null default false,
  add column highlight_note text;
