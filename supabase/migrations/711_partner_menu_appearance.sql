-- Migration 711: le manopole dell'aspetto del menù al tavolo
--                (foto tonde o squadrate, interlinea, impaginazione,
--                 separatore fra i piatti, allergeni a parole o a icone)
--                 + il passeggero: 'social' fra i kind di partner_links
--
-- STATO: DA APPLICARE a mano via SQL editor, dopo la 710 (il
-- tracking locale è fermo alla 045: questa, come tutte le 046+,
-- va eseguita a mano — MAI db push).
--
-- ------------------------------------------------------------
-- PERCHÉ UNA COLONNA E NON TRE STATI IN UNA SOLA
-- Nel portale la scelta si presenta come UNA sola, con tre
-- risposte: nessuna foto, quadrate, tonde. Sotto restano due
-- campi — show_dish_photos, che c'è dalla 705, e questa forma —
-- e non è una complicazione gratuita:
--
--   * gli scatti già pubblicati contengono 'showPhotos' e la
--     pagina al tavolo lo legge da mesi. Trasformarlo in un
--     codice a tre valori vorrebbe dire cambiare quel campo
--     dentro scatti già in sala, cioè rileggerli tutti;
--   * spegnere le foto e poi riaccenderle deve riportare la
--     forma che si era scelta, non farla ricominciare da capo.
--     Con due campi succede da sé.
--
-- La forma vale per le MINIATURE nella lista, che sono l'unica
-- cosa che si vede scorrendo la carta. La foto grande dentro il
-- popup del piatto resta com'è: un cerchio grande al posto di una
-- foto di un piatto non è una scelta di stile, è un ritaglio in
-- meno.
--
-- Terza voce della strada tracciata dalla 710 (colonna + una riga
-- in venue_appearance, una nei default, una nell'annulla): da qui
-- lo scatto pubblicato, il confronto "cosa non è ancora in sala" e
-- "rimetti com'è in sala" se ne occupano da soli. Nel portale la
-- stessa voce va in VenueAppearance (partner/src/lib/venues.ts).
--
-- ------------------------------------------------------------
-- CINQUE MANOPOLE IN UNA MIGRATION SOLA, e non è pigrizia: sono
-- state chieste una dopo l'altra mentre questa migration era già
-- scritta e non ancora applicata. Aprirne una nuova per ognuna
-- avrebbe voluto dire cinque esecuzioni a mano al posto di una.
-- Sono indipendenti fra loro e nessuna sa delle altre: stanno
-- insieme solo perché si applicano insieme.
BEGIN;

-- UN CODICE, non un numero di pixel: 'square' (quello di oggi) e
-- 'round'. Pochi valori decisi da noi, come i caratteri e la
-- grandezza dei testi — e per la stessa ragione: un raggio libero
-- finirebbe a produrre menù con angoli a caso, e nessuno di quei
-- menù somiglierebbe più a quello che l'anteprima aveva promesso.
alter table partner_venues
  add column dish_photo_shape text not null default 'square'
  check (dish_photo_shape in ('square', 'round'));

comment on column partner_venues.dish_photo_shape is
  'Come si vedono le miniature dei piatti nel menù al tavolo: square o round. Vale solo per la lista; la foto grande del popup resta rettangolare.';

-- L'INTERLINEA. Sta accanto alla grandezza dei testi ed è l'altra
-- metà della stessa domanda: quanto è fitta la carta. La
-- grandezza cambia quanto sono grandi le lettere, l'interlinea
-- quanta aria c'è fra una riga e l'altra — e su un menù di una
-- pagina sola la seconda si nota più della prima.
--
-- Tre valori decisi da noi come per il resto (Tema 25): un
-- cursore libero finirebbe schiacciato per far stare la carta in
-- una schermata, e le prime righe a impastarsi sarebbero quelle
-- lunghe — le descrizioni e gli allergeni.
--
-- ⚠️ QUANDO SI IMPLEMENTA vale il pavimento di sempre: la riga
-- degli allergeni non si stringe sotto il leggibile nemmeno con
-- 'tight'. È la stessa promessa che regge text_scale.
alter table partner_venues
  add column line_height text not null default 'normal'
  check (line_height in ('tight', 'normal', 'airy'));

comment on column partner_venues.line_height is
  'Quanta aria fra le righe del menù al tavolo: tight, normal, airy. Elenco chiuso come text_scale. La riga degli allergeni ha un pavimento che tight non sfonda.';

-- L'IMPAGINAZIONE: com'è disposto un piatto nella carta.
--
--   row     foto, nome e prezzo sulla stessa riga, allergeni
--           sotto. È quella di sempre: densa, si scorre in fretta,
--           regge le foto.
--   block   nome, descrizione e prezzo incolonnati e centrati,
--           senza foto. È la carta dei ristoranti che non mettono
--           fotografie, e la ragione per cui questa colonna esiste.
--
-- ⚠️ È UNO STILE, NON UN PRESET (decisione dell'utente, 2026-09-03).
-- La differenza non è una parola: un preset imposterebbe anche il
-- colore, il carattere, la grandezza — cioè riscriverebbe scelte
-- già fatte dal ristoratore. Questa colonna decide una STRUTTURA e
-- non tocca nessun altro valore. L'unica conseguenza è che 'block'
-- non mostra le foto, e quindi nel portale la manopola della loro
-- forma sparisce: il valore però resta scritto qui sotto, e
-- tornando a 'row' le foto ricompaiono come erano.
alter table partner_venues
  add column menu_layout text not null default 'row'
  check (menu_layout in ('row', 'block'));

comment on column partner_venues.menu_layout is
  'Come è disposto un piatto nel menù al tavolo: row (foto+nome+prezzo in riga) o block (nome, descrizione, prezzo incolonnati, senza foto). È uno stile, non un preset: non riscrive nessuna altra voce d''aspetto.';

-- IL SEGNO FRA UN PIATTO E L'ALTRO. Non è una manopola
-- dell'impaginazione verticale e non deve diventarlo: il filetto
-- sta bene anche nella carta a riga, e legarlo a 'block'
-- aggiungerebbe una SECONDA voce che compare e sparisce — mentre
-- il pregio di questa strada è che ne dipende una sola.
--
-- 'none' di partenza: i menù che esistono adesso non cambiano di
-- un pixel finché nessuno la tocca.
alter table partner_venues
  add column dish_separator text not null default 'none'
  check (dish_separator in ('none', 'rule', 'ornament'));

comment on column partner_venues.dish_separator is
  'Cosa separa un piatto dall''altro nel menù al tavolo: none, rule (filetto), ornament. Vale in tutt''e due le impaginazioni.';

-- GLI ALLERGENI A PAROLE O A ICONE. È la riga «Contiene: glutine,
-- uova» sotto ogni piatto, e le icone al posto dell'elenco sono
-- prassi comune nelle carte dei ristoranti.
--
-- ⚠️ IL DATABASE NON SA NIENTE DEI DISEGNI: qui c'è solo un codice.
-- I pittogrammi sono SVG nel repo (app, portale, sito) e si possono
-- ridisegnare, sostituire o rifare da capo senza nessuna migration.
-- Quello che questa colonna fissa è il VOCABOLARIO — 'text' e
-- 'icon' — e un terzo modo, il giorno che servisse, costerebbe un
-- ALTER del vincolo, cioè un'altra esecuzione a mano.
--
-- ⚠️ TRE CONDIZIONI, da rispettare QUANDO SI COSTRUISCE LA RESA.
-- Sono la ragione per cui questa manopola è ammessa mentre
-- «nascondere gli allergeni» non lo sarà mai (Tema 23): cambia come
-- si legge la riga, non se c'è.
--
--   1. LA POLARITÀ VA DETTA. Un simbolo da solo non dice se il piatto
--      contiene o è SENZA — la spiga è usata da moltissimi menù,
--      sbarrata, proprio per «senza glutine».
--      ⚠️ AGGIORNATO IL 2026-09-06, a migration già applicata: la
--      parola «Contiene» su OGNI riga è stata tolta (scelta
--      dell'utente: a icone la riga resta pulita). Il problema che
--      risolveva resta vero, e la risposta adesso è dirlo UNA VOLTA
--      in fondo alla carta — «Le icone dicono cosa contiene ogni
--      piatto», che è anche il comando che apre la legenda. Se un
--      giorno quella riga sparisce, la parola torna sulle righe.
--   2. LA LEGENDA È PARTE DELLA MODALITÀ, non una voce a parte da
--      accendere: con 'icon' la pagina al tavolo deve poterla
--      aprire (premendo le icone o la riga). E ogni icona porta il
--      suo nome come testo alternativo, o chi legge lo schermo con
--      la voce perde la riga per intero. I 15 nomi ci sono già in
--      due lingue (landing/lib/labels.js, partner/src/lib/allergens.ts).
--   3. NEL POPUP DEL PIATTO gli allergeni restano A PAROLE. La
--      lista è la superficie della densità, il dettaglio quella
--      della precisione: chi apre un piatto ha già deciso di
--      leggere. Vale anche per la riga del MOTIVO col filtro acceso
--      («escluso perché contiene…»): è una frase, non un elenco, e
--      una frase non si scrive a icone.
--
-- Vale il pavimento di sempre: con 'compact' le icone non scendono
-- sotto il leggibile, esattamente come il testo che sostituiscono.
alter table partner_venues
  add column allergen_display text not null default 'text'
  check (allergen_display in ('text', 'icon'));

comment on column partner_venues.allergen_display is
  'Come si legge la riga degli allergeni nel menù al tavolo: text (elenco di parole, com''è sempre stato) o icon (pittogrammi con legenda apribile). Il prefisso «Contiene» resta in tutt''e due, e nel dettaglio del piatto gli allergeni sono sempre a parole.';

-- ------------------------------------------------------------
-- UN PASSEGGERO CHE NON È UNA MANOPOLA D'ASPETTO: I LINK SOCIAL
--
-- `partner_links.kind` ammette booking, delivery, menu, website e
-- other, ma non 'social' — e i social sono l'unico link che ha
-- senso in fondo al menù al tavolo (chi è seduto non prenota e non
-- ordina su Glovo). Non c'entra niente con l'aspetto: viaggia qui
-- solo perché questa migration non è ancora applicata, e un ALTER
-- di un vincolo da solo non vale un'esecuzione a mano nel SQL
-- editor. Se un giorno le due cose si separassero, questa riga si
-- sposta senza conseguenze: nessun'altra la guarda.
--
-- Nessuna colonna nuova: 'social' riusa `provider` (il codice del
-- servizio — instagram, facebook, tiktok, tripadvisor — che è già
-- quello con cui il delivery sceglie il logo da mostrare) e
-- `label` per il nome scritto a mano. Il vincolo
-- partner_links_has_target vale anche per lui: senza indirizzo la
-- riga non ha motivo di esistere.
--
-- ⚠️ IL PORTALE E IL SITO NON LO SANNO ANCORA. Ammettere un valore
-- non costruisce niente: finché la fila non è disegnata, righe
-- 'social' non ne scrive nessuno. E quando si disegnerà, il
-- controllo dello SCHEMA dell'indirizzo esce insieme alla fila e
-- non dopo — normalizeUrl completa lo schema quando manca ma
-- lascia passare quello che c'è, 'javascript:' compreso, e in una
-- pagina servita a chiunque inquadri il QR quello diventa un href
-- scritto dal ristoratore (v. TODO.md).
-- ⚠️ IL VINCOLO SI CERCA, NON SI CHIAMA PER NOME. Nella 700 è nato
-- inline sulla colonna, quindi il nome gliel'ha dato Postgres
-- (`partner_links_kind_check`, per convenzione). Un `drop
-- constraint if exists` col nome sbagliato NON fallisce: non
-- trova niente, tira dritto, e il vincolo vecchio resta a
-- rifiutare 'social' — lo stesso genere di successo apparente
-- costato due giorni sulla 085. Qui il nome si legge da pg_constraint
-- (la colonna, non la parola) e se non si trova nulla la
-- migration si ferma.
do $$
declare
  nome text;
begin
  select con.conname
    into nome
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
   where nsp.nspname = 'public'
     and rel.relname = 'partner_links'
     and con.contype = 'c'
     -- SOLO la colonna kind, e sola: `partner_links_has_target`
     -- nomina anche lui `kind` (dice che una prenotazione può
     -- avere il telefono al posto dell'indirizzo), ma guarda tre
     -- colonne. Cercare la parola avrebbe potuto sganciare quello.
     and con.conkey = array[
           (select att.attnum
              from pg_attribute att
             where att.attrelid = rel.oid
               and att.attname = 'kind')
         ]::smallint[];

  if nome is null then
    raise exception 'partner_links: vincolo su kind non trovato, la 711 si ferma';
  end if;

  execute format('alter table partner_links drop constraint %I', nome);
end;
$$;

alter table partner_links
  add constraint partner_links_kind_check
  check (kind in ('booking', 'delivery', 'menu', 'website', 'other', 'social'));

-- ------------------------------------------------------------
-- 1. L'ASPETTO, con cinque voci in più
-- Le chiavi restano PIATTE come nello scatto (v. 710): questa si
-- chiama 'dishPhotoShape' e sta accanto a 'showPhotos', che è il
-- campo con cui lavora in coppia.
create or replace function venue_appearance(p_venue_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
           'logoUrl', coalesce(v.logo_url, ''),
           'accent', v.accent,
           'coverUrl', coalesce(v.cover_url, ''),
           'headingFont', v.heading_font,
           'sectionStyle', v.section_style,
           'showPhotos', v.show_dish_photos,
           'dishPhotoShape', v.dish_photo_shape,
           'showDescriptions', v.show_dish_descriptions,
           'textScale', v.text_scale,
           'lineHeight', v.line_height,
           'menuLayout', v.menu_layout,
           'dishSeparator', v.dish_separator,
           'allergenDisplay', v.allergen_display
         )
    from partner_venues v
   where v.id = p_venue_id;
$$;

revoke all on function venue_appearance(uuid) from public;
grant execute on function venue_appearance(uuid) to authenticated;

-- Il ripiego per gli scatti presi PRIMA che questa manopola
-- esistesse: là dentro 'dishPhotoShape' non c'è, e al tavolo si
-- stanno vedendo miniature squadrate. Senza questa riga il
-- confronto direbbe "hai cambiato la forma delle foto" a chi non
-- ha toccato niente, il primo giorno.
create or replace function venue_appearance_defaults()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
           'logoUrl', '',
           'accent', 'charcoal',
           'coverUrl', '',
           'headingFont', 'modern',
           'sectionStyle', 'underline',
           'showPhotos', true,
           'dishPhotoShape', 'square',
           'showDescriptions', false,
           'textScale', 'normal',
           'lineHeight', 'normal',
           'menuLayout', 'row',
           'dishSeparator', 'none',
           'allergenDisplay', 'text'
         );
$$;

revoke all on function venue_appearance_defaults() from public;
grant execute on function venue_appearance_defaults() to authenticated;

-- ------------------------------------------------------------
-- 2. L'ANNULLA rimette anche questa
-- build_public_menu e menu_publish_state non si toccano: leggono
-- l'aspetto da venue_appearance(), che adesso la contiene già.
create or replace function revert_appearance(p_venue_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  in_sala jsonb;
begin
  select venue_appearance_defaults() || coalesce(
           (select jsonb_object_agg(k.key, v.published_menu -> k.key)
              from jsonb_each(venue_appearance_defaults()) k
             where v.published_menu ? k.key),
           '{}'::jsonb)
    into in_sala
    from partner_venues v
   where v.id = p_venue_id
     and v.owner_user_id = auth.uid()
     and v.published_at is not null
     and v.published_menu is not null;

  if in_sala is null then
    return null;
  end if;

  update partner_venues
     set logo_url = nullif(in_sala->>'logoUrl', ''),
         accent = in_sala->>'accent',
         cover_url = nullif(in_sala->>'coverUrl', ''),
         heading_font = in_sala->>'headingFont',
         section_style = in_sala->>'sectionStyle',
         show_dish_photos = (in_sala->>'showPhotos')::boolean,
         dish_photo_shape = in_sala->>'dishPhotoShape',
         show_dish_descriptions = (in_sala->>'showDescriptions')::boolean,
         text_scale = in_sala->>'textScale',
         line_height = in_sala->>'lineHeight',
         menu_layout = in_sala->>'menuLayout',
         dish_separator = in_sala->>'dishSeparator',
         allergen_display = in_sala->>'allergenDisplay'
   where id = p_venue_id
     and owner_user_id = auth.uid();

  return in_sala;
end;
$$;

revoke all on function revert_appearance(uuid) from public;
grant execute on function revert_appearance(uuid) to authenticated;

COMMIT;

-- ------------------------------------------------------------
-- DOPO L'ESECUZIONE, VERIFICARE. Non è pignoleria: il 2026-09-05,
-- sulla 085, l'editor SQL ha risposto "success" due volte senza
-- installare niente, e per due giri si è misurata una funzione mai
-- cambiata. Qui le funzioni si sostituiscono con CREATE OR REPLACE
-- e non con DROP+CREATE — che è il caso in cui il guasto è stato
-- visto — ma il costo di guardare è una query.
--
--   -- le cinque colonne ci sono?
--   select column_name, column_default
--     from information_schema.columns
--    where table_name = 'partner_venues'
--      and column_name in ('dish_photo_shape', 'line_height',
--                          'menu_layout', 'dish_separator',
--                          'allergen_display');
--
--   -- il vincolo ammette 'social'?
--   select pg_get_constraintdef(con.oid)
--     from pg_constraint con
--     join pg_class rel on rel.oid = con.conrelid
--    where rel.relname = 'partner_links' and con.contype = 'c';
--
--   -- le funzioni sono DAVVERO quelle nuove?
--   select venue_appearance_defaults() ? 'allergenDisplay';   -- t
--   select pg_get_functiondef(p.oid) like '%allergenDisplay%'
--     from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('venue_appearance', 'revert_appearance');  -- t, t
--
-- E SUBITO DOPO, nel portale: `APPEARANCE_711 = true` in
-- partner/src/lib/features.ts, rilascio, e ogni manopola accesa
-- una volta — sono pezzi di codice mai eseguiti che diventano veri
-- insieme. `allergen_display` e 'social' invece non hanno ancora
-- nessuna interfaccia: restano colonne dormienti, come cover_url
-- nella 709.
