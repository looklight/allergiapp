-- Migration 711: le manopole dell'aspetto del menù al tavolo
--                (foto tonde o squadrate, interlinea, impaginazione,
--                 separatore fra i piatti)
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
-- QUATTRO MANOPOLE IN UNA MIGRATION SOLA, e non è pigrizia: sono
-- state chieste una dopo l'altra mentre questa migration era già
-- scritta e non ancora applicata. Aprirne una nuova per ognuna
-- avrebbe voluto dire quattro esecuzioni a mano al posto di una.
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

-- ------------------------------------------------------------
-- 1. L'ASPETTO, con quattro voci in più
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
           'dishSeparator', v.dish_separator
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
           'dishSeparator', 'none'
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
         dish_separator = in_sala->>'dishSeparator'
   where id = p_venue_id
     and owner_user_id = auth.uid();

  return in_sala;
end;
$$;

revoke all on function revert_appearance(uuid) from public;
grant execute on function revert_appearance(uuid) to authenticated;

COMMIT;
