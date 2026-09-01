'use client';

// Il menù digitale: la COMPOSIZIONE che il ristoratore fa dei piatti che ha
// già in catalogo — quali, in che sezioni, in che ordine, a che prezzo.
// Il catalogo (dishes.ts) tiene i fatti del piatto; qui c'è tutto il resto.
// Direzione e decisioni in ../../DIGITAL_MENU.md, Temi 3, 4 e 15.
//
// Dal 2026-08-31 sul database (migration 704), dopo una settimana in memoria
// mentre si disegnava la schermata. L'interfaccia era stata scritta fin
// dall'inizio come quella definitiva — useMenus, useMenu, save — e infatti il
// passaggio ha riscritto solo l'interno di questo file: le pagine non sono
// state toccate.
import { useCallback } from 'react';
import { supabase } from './supabase';
import { currentUserId, reportError, useDebouncedSave, useRemoteList } from './storage';
import { write } from './saveState';

export interface MenuItem {
  id: string;
  dishId: string; // un piatto del catalogo: qui non se ne duplica nessun dato
  // Prezzo in CENTESIMI INTERI. Sui soldi la virgola mobile sbaglia, e un
  // prezzo sbagliato sul menù è una discussione al tavolo (Tema 7).
  // null = senza prezzo, ed è un caso vero: dentro un degustazione i piatti
  // non hanno prezzo, ce l'ha il menù.
  priceCents: number | null;
  // In evidenza: un'offerta, un consigliato dallo chef. Cambia solo il PESO
  // VISIVO della riga, mai la sua posizione — spostarla in cima aprirebbe un
  // secondo criterio d'ordine oltre a quello già usato dal filtro allergeni
  // (i piatti esclusi che scivolano in fondo alla sezione), e i due si
  // confonderebbero.
  highlighted: boolean;
  // Rilevante solo quando highlighted è true: l'editor la svuota spegnendo la
  // stella, così non resta testo nascosto che nessuno vede più.
  highlightNote: string;
}

export interface MenuSection {
  id: string;
  name: string; // testo libero: "Le nostre paste fresche", "Dalla brace"
  description: string; // riga sotto il nome, facoltativa: "Tutti fatti in casa"
  items: MenuItem[];
}

export interface Menu {
  id: string;
  venueId: string;
  name: string; // "Carta", "Pranzo", "Bevande"
  description: string; // sotto il titolo: orari, avvisi, due righe di presentazione
  currency: string; // ISO 4217, sul MENÙ e non sulla riga
  // Le righe fuori sezione stanno in cima, come i piatti senza categoria nel
  // catalogo: chi butta dentro dieci piatti prima di pensare agli intertitoli
  // non va fermato da un campo obbligatorio.
  loose: MenuItem[];
  sections: MenuSection[];
}

// L'ordine è la posizione negli array, non un campo: nell'interfaccia si
// riordina trascinando o con le frecce, e un numero da tenere allineato a
// mano sarebbe solo un secondo posto in cui sbagliare. Diventerà sort_order
// al salvataggio, che è dove serve.

// ------------------------------------------------------------------
// VALUTE
// Poche e quelle vere per un ristorante europeo. Non è l'elenco ISO intero:
// una tendina con centosessanta voci per una scelta che si fa una volta sola
// è peggio di una con otto.
// ------------------------------------------------------------------
export const CURRENCIES = [
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'CHF', symbol: 'CHF' },
  { code: 'USD', symbol: '$' },
  { code: 'SEK', symbol: 'kr' },
  { code: 'DKK', symbol: 'kr' },
  { code: 'NOK', symbol: 'kr' },
  { code: 'PLN', symbol: 'zł' },
] as const;

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

// ------------------------------------------------------------------
// PREZZI
// Il ristoratore scrive "12,50" o "12.50" o "12": tutte e tre vogliono dire
// la stessa cosa, e correggergli la punteggiatura mentre digita è il modo più
// rapido di fargli odiare il campo. Si accettano entrambi i separatori e si
// ignora tutto il resto (spazi, il simbolo della valuta incollato per
// abitudine); quello che non è un numero non diventa zero, diventa NIENTE —
// zero è un prezzo, e scriverlo per errore vuol dire regalare un piatto.
// ------------------------------------------------------------------
export function parsePrice(text: string): number | null {
  const pulito = text.replace(/[^\d.,]/g, '').replace(',', '.');
  if (pulito === '') return null;
  const valore = Number(pulito);
  if (!Number.isFinite(valore) || valore < 0) return null;
  return Math.round(valore * 100);
}

// Per il campo di scrittura: due decimali sempre, perché "12,5" su un menù
// non si è mai visto.
export function formatPrice(cents: number | null, locale: string): string {
  if (cents === null) return '';
  return (cents / 100).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Per la lettura: prezzo e valuta insieme, nell'ordine giusto per la lingua
// (12,50 € in italiano, €12.50 in inglese).
export function displayPrice(cents: number | null, currency: string, locale: string): string {
  if (cents === null) return '';
  return (cents / 100).toLocaleString(locale, { style: 'currency', currency });
}

// Tutte le righe del menù, sezioni comprese: serve ai conteggi e a sapere se
// un piatto è già dentro senza guardare in due posti.
export function menuItems(menu: Menu): MenuItem[] {
  return [...menu.loose, ...menu.sections.flatMap((s) => s.items)];
}

export function hasDish(menu: Menu, dishId: string): boolean {
  return menuItems(menu).some((item) => item.dishId === dishId);
}

// ------------------------------------------------------------------
// LETTURA
// Un'interrogazione sola con gli innesti: menù, sezioni e righe. L'ordine
// arriva da sort_order e diventa la posizione negli array — da lì in poi
// l'interfaccia ragiona per posizione, che è l'unica cosa che sa fare il
// trascinamento.
// ------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function perOrdine(a: any, b: any) {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

function toMenu(row: any): Menu {
  const righe = [...(row.partner_menu_items ?? [])].sort(perOrdine);
  const item = (r: any): MenuItem => ({
    id: r.id,
    dishId: r.dish_id,
    priceCents: r.price_cents ?? null,
    highlighted: r.highlighted ?? false,
    highlightNote: r.highlight_note ?? '',
  });
  return {
    id: row.id,
    venueId: row.venue_id,
    name: row.name ?? '',
    description: row.description ?? '',
    currency: row.currency ?? 'EUR',
    loose: righe.filter((r: any) => r.section_id === null).map(item),
    sections: [...(row.partner_menu_sections ?? [])].sort(perOrdine).map((s: any) => ({
      id: s.id,
      name: s.name ?? '',
      description: s.description ?? '',
      items: righe.filter((r: any) => r.section_id === s.id).map(item),
    })),
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

async function loadMenus(): Promise<Menu[]> {
  const { data, error } = await supabase
    .from('partner_menus')
    .select(
      'id, venue_id, name, description, currency, sort_order, ' +
        'partner_menu_sections(id, name, description, sort_order), ' +
        'partner_menu_items(id, dish_id, section_id, price_cents, highlighted, highlight_note, sort_order)'
    )
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  reportError('lettura menù', error);
  return (data ?? []).map(toMenu);
}

// ------------------------------------------------------------------
// SCRITTURA
// Il menù si riscrive intero, ma NON cancellando e reinserendo: gli id delle
// righe li generiamo noi, quindi si sovrascrive per id e si cancella solo
// quello che è sparito davvero. Cancellare e reinserire darebbe id nuovi a
// ogni salvataggio, e l'interfaccia li usa come chiavi — una riga che si
// stava trascinando cambierebbe identità sotto le dita.
// ------------------------------------------------------------------
async function saveMenu(menu: Menu) {
  const ownerId = await currentUserId();
  if (!ownerId) return;

  await write(
    'salvataggio menù',
    () =>
      supabase
        .from('partner_menus')
        .update({ name: menu.name, description: menu.description, currency: menu.currency })
        .eq('id', menu.id),
    `menu:${menu.id}`
  );

  const sezioni = menu.sections.map((s, i) => ({
    id: s.id,
    menu_id: menu.id,
    owner_user_id: ownerId,
    name: s.name,
    description: s.description,
    sort_order: i,
  }));
  // Le righe fuori sezione prima, come si vedono: sort_order riparte da zero
  // dentro ogni sezione, quindi l'ordine globale non serve.
  const righe = [
    ...menu.loose.map((r, i) => ({ riga: r, sectionId: null as string | null, i })),
    ...menu.sections.flatMap((s) => s.items.map((r, i) => ({ riga: r, sectionId: s.id, i }))),
  ].map(({ riga, sectionId, i }) => ({
    id: riga.id,
    menu_id: menu.id,
    section_id: sectionId,
    dish_id: riga.dishId,
    owner_user_id: ownerId,
    price_cents: riga.priceCents,
    highlighted: riga.highlighted,
    highlight_note: riga.highlightNote,
    sort_order: i,
  }));

  // Le RIGHE si cancellano PRIMA delle sezioni sparite: hanno un vincolo che
  // punta alla sezione, e cancellare una sezione che ha ancora righe dentro
  // le farebbe risalire fuori sezione (ON DELETE SET NULL della 704) —
  // riapparirebbero in cima al menù invece di sparire.
  await write(
    'pulizia righe del menù',
    () =>
      righe.length === 0
        ? supabase.from('partner_menu_items').delete().eq('menu_id', menu.id)
        : supabase
            .from('partner_menu_items')
            .delete()
            .eq('menu_id', menu.id)
            .not('id', 'in', `(${righe.map((r) => r.id).join(',')})`),
    `righe-pulisci:${menu.id}`
  );
  await write(
    'pulizia sezioni del menù',
    () =>
      sezioni.length === 0
        ? supabase.from('partner_menu_sections').delete().eq('menu_id', menu.id)
        : supabase
            .from('partner_menu_sections')
            .delete()
            .eq('menu_id', menu.id)
            .not('id', 'in', `(${sezioni.map((s) => s.id).join(',')})`),
    `sezioni-pulisci:${menu.id}`
  );

  // Sezioni prima delle righe, che ci puntano.
  if (sezioni.length > 0) {
    await write(
      'salvataggio sezioni',
      () => supabase.from('partner_menu_sections').upsert(sezioni),
      `sezioni:${menu.id}`
    );
  }
  if (righe.length > 0) {
    await write(
      'salvataggio righe del menù',
      () => supabase.from('partner_menu_items').upsert(righe),
      `righe:${menu.id}`
    );
  }
}

// ------------------------------------------------------------------
// L'INTERFACCIA CHE USANO LE SCHERMATE
// ------------------------------------------------------------------

function nuovoId(): string {
  return crypto.randomUUID();
}

// menus è null finché la prima lettura non è tornata
export function useMenus() {
  const { list: menus, setList } = useRemoteList('menu', loadMenus);

  const create = useCallback(
    async (venueId: string, name: string): Promise<Menu | null> => {
      const ownerId = await currentUserId();
      if (!ownerId) return null;
      const menu: Menu = {
        id: nuovoId(),
        venueId,
        name,
        description: '',
        currency: 'EUR',
        loose: [],
        sections: [],
      };
      // L'id lo generiamo noi e lo mandiamo: così la schermata può aprire
      // subito l'editor di questo menù senza aspettare la risposta.
      const { error } = await write('creazione menù', () =>
        supabase.from('partner_menus').insert({
          id: menu.id,
          venue_id: venueId,
          owner_user_id: ownerId,
          name,
          currency: menu.currency,
        })
      );
      if (error) return null;
      setList([...(menus ?? []), menu]);
      return menu;
    },
    [menus, setList]
  );

  const remove = useCallback(
    async (id: string) => {
      setList((menus ?? []).filter((menu) => menu.id !== id));
      // Sezioni e righe se ne vanno con la cascata del database
      await write('eliminazione menù', () =>
        supabase.from('partner_menus').delete().eq('id', id)
      );
    },
    [menus, setList]
  );

  // Eliminando un LOCALE il database si porta via anche i suoi menù (cascata
  // della 704). Qui si toglie dalla lista in memoria quello che là è già
  // sparito: senza, la pagina Menù continuerebbe a mostrare i menù di un
  // locale che non c'è più finché qualcuno non ricarica.
  const forgetVenue = useCallback(
    (venueId: string) => {
      setList((menus ?? []).filter((menu) => menu.venueId !== venueId));
    },
    [menus, setList]
  );

  // …e annullando quell'eliminazione i menù devono tornare, o l'annulla
  // sarebbe una bugia: rimetterebbe in piedi il locale e lascerebbe perso il
  // lavoro vero, che è la carta con le sue sezioni e i suoi prezzi.
  // Il LOCALE va ripristinato PRIMA: la chiave esterna della 704 rifiuta un
  // menù appeso a un locale che non esiste.
  const restore = useCallback(
    async (daRimettere: Menu[]) => {
      if (daRimettere.length === 0) return;
      const ownerId = await currentUserId();
      if (!ownerId) return;
      const { error } = await write('ripristino menù', () =>
        supabase.from('partner_menus').insert(
          daRimettere.map((menu, i) => ({
            id: menu.id,
            venue_id: menu.venueId,
            owner_user_id: ownerId,
            name: menu.name,
            description: menu.description,
            currency: menu.currency,
            sort_order: i,
          }))
        )
      );
      if (error) return;
      // Sezioni e righe le riscrive saveMenu, che scrive per id: gli stessi
      // di prima, quindi tornano i menù di prima e non delle copie.
      for (const menu of daRimettere) await saveMenu(menu);
      setList([...(menus ?? []), ...daRimettere]);
    },
    [menus, setList]
  );

  // Rinomina secca, senza passare dall'editor: serve alla finestra del nuovo
  // menù, che deve poter battezzare anche quello che c'era già (v. sotto).
  const rename = useCallback(
    async (id: string, name: string) => {
      setList((menus ?? []).map((menu) => (menu.id === id ? { ...menu, name } : menu)));
      await write(
        'rinomina menù',
        () => supabase.from('partner_menus').update({ name }).eq('id', id),
        `menu-nome:${id}`
      );
    },
    [menus, setList]
  );

  return { menus, create, remove, rename, forgetVenue, restore };
}

export function useMenu(id: string) {
  const { list: menus, setList } = useRemoteList('menu', loadMenus);
  const menu = menus?.find((m) => m.id === id) ?? null;

  // Il menù si riscrive dopo una pausa: nell'editor ogni tasto premuto su un
  // prezzo o su un nome di sezione cambia la bozza, e una richiesta per
  // carattere non ha senso. Stessa scelta dell'editor del locale.
  const { schedule, flush } = useDebouncedSave<Menu>(saveMenu);

  // Lo stato a schermo cambia subito, la scrittura parte dopo la pausa: senza
  // il primo, ogni tasto premuto tornerebbe indietro per 800 millisecondi.
  const save = useCallback(
    (bozza: Menu) => {
      setList((menus ?? []).map((m) => (m.id === bozza.id ? bozza : m)));
      schedule(bozza);
    },
    [menus, setList, schedule]
  );

  // menus null ⇒ "non lo so ancora"; letto e nessun menù con quell'id ⇒ non
  // esiste. Sono due cose diverse e la pagina le mostra diverse.
  return { menu, loading: menus === null, save, flush };
}

// ------------------------------------------------------------------
// LE MODIFICHE, COME FUNZIONI PURE
// L'editor le compone e passa il risultato a save(): niente logica di
// struttura sparsa nelle schermate, e niente stato locale che possa divergere
// da quello mostrato.
// ------------------------------------------------------------------

// La sezione con quell'id, oppure le righe fuori sezione se è null. Restituire
// la LISTA e non la sezione tiene un caso solo dove ce ne sarebbero due.
function conRighe(menu: Menu, sectionId: string | null, cambia: (items: MenuItem[]) => MenuItem[]): Menu {
  if (sectionId === null) return { ...menu, loose: cambia(menu.loose) };
  return {
    ...menu,
    sections: menu.sections.map((s) => (s.id === sectionId ? { ...s, items: cambia(s.items) } : s)),
  };
}

export function addSection(menu: Menu, name: string): Menu {
  return {
    ...menu,
    sections: [...menu.sections, { id: nuovoId(), name, description: '', items: [] }],
  };
}

export function renameSection(menu: Menu, sectionId: string, name: string): Menu {
  return {
    ...menu,
    sections: menu.sections.map((s) => (s.id === sectionId ? { ...s, name } : s)),
  };
}

export function setSectionDescription(menu: Menu, sectionId: string, description: string): Menu {
  return {
    ...menu,
    sections: menu.sections.map((s) => (s.id === sectionId ? { ...s, description } : s)),
  };
}

// Eliminare una sezione NON porta via i piatti: risalgono fuori sezione, col
// loro prezzo. Perdere sei prezzi per aver rinominato male un intertitolo
// sarebbe un castigo sproporzionato, e silenzioso. Lo dice anche il vincolo
// della 703 (ON DELETE SET NULL sulla sola colonna della sezione).
export function removeSection(menu: Menu, sectionId: string): Menu {
  const sezione = menu.sections.find((s) => s.id === sectionId);
  if (!sezione) return menu;
  return {
    ...menu,
    loose: [...menu.loose, ...sezione.items],
    sections: menu.sections.filter((s) => s.id !== sectionId),
  };
}

export function moveSection(menu: Menu, sectionId: string, verso: -1 | 1): Menu {
  const da = menu.sections.findIndex((s) => s.id === sectionId);
  const a = da + verso;
  if (da < 0 || a < 0 || a >= menu.sections.length) return menu;
  const sections = [...menu.sections];
  [sections[da], sections[a]] = [sections[a], sections[da]];
  return { ...menu, sections };
}

// I piatti si aggiungono a mazzo: si apre il catalogo, si spuntano quelli che
// servono e si conferma. Uno per volta vorrebbe dire aprire e chiudere il
// pannello quaranta volte.
export function addDishes(menu: Menu, sectionId: string | null, dishIds: string[]): Menu {
  const nuovi = dishIds
    .filter((dishId) => !hasDish(menu, dishId))
    .map((dishId) => ({ id: nuovoId(), dishId, priceCents: null, highlighted: false, highlightNote: '' }));
  return conRighe(menu, sectionId, (items) => [...items, ...nuovi]);
}

export function removeItem(menu: Menu, itemId: string): Menu {
  const senza = (items: MenuItem[]) => items.filter((item) => item.id !== itemId);
  return { ...menu, loose: senza(menu.loose), sections: menu.sections.map((s) => ({ ...s, items: senza(s.items) })) };
}

export function setItemPrice(menu: Menu, itemId: string, priceCents: number | null): Menu {
  const cambia = (items: MenuItem[]) =>
    items.map((item) => (item.id === itemId ? { ...item, priceCents } : item));
  return { ...menu, loose: cambia(menu.loose), sections: menu.sections.map((s) => ({ ...s, items: cambia(s.items) })) };
}

// Spegnendo la stella la nota sparisce con lei: senza, resterebbe un testo
// scritto ma invisibile, pronto a ricomparire com'era se il piatto viene
// evidenziato di nuovo — una sorpresa, non una comodità.
export function setItemHighlighted(menu: Menu, itemId: string, highlighted: boolean): Menu {
  const cambia = (items: MenuItem[]) =>
    items.map((item) =>
      item.id === itemId ? { ...item, highlighted, highlightNote: highlighted ? item.highlightNote : '' } : item
    );
  return { ...menu, loose: cambia(menu.loose), sections: menu.sections.map((s) => ({ ...s, items: cambia(s.items) })) };
}

export function setItemHighlightNote(menu: Menu, itemId: string, highlightNote: string): Menu {
  const cambia = (items: MenuItem[]) =>
    items.map((item) => (item.id === itemId ? { ...item, highlightNote } : item));
  return { ...menu, loose: cambia(menu.loose), sections: menu.sections.map((s) => ({ ...s, items: cambia(s.items) })) };
}

export function moveItem(menu: Menu, sectionId: string | null, itemId: string, verso: -1 | 1): Menu {
  return conRighe(menu, sectionId, (items) => {
    const da = items.findIndex((item) => item.id === itemId);
    const a = da + verso;
    if (da < 0 || a < 0 || a >= items.length) return items;
    const next = [...items];
    [next[da], next[a]] = [next[a], next[da]];
    return next;
  });
}

// Il riordino trascinando dice "mettila PRIMA di quella lì", non "mettila in
// posizione 4". Non è un dettaglio: con gli indici, spostando una riga verso
// il basso nella stessa lista, la posizione di arrivo scivola di uno appena
// la riga viene tolta — ed è il classico fuori-di-uno che si vede solo
// trascinando dall'alto verso il basso e mai al contrario. Con l'id davanti a
// cui inserire il problema non esiste: si toglie, si cerca, si infila.
// beforeItemId null = in fondo a quella sezione.
export function moveItemBefore(
  menu: Menu,
  itemId: string,
  sectionId: string | null,
  beforeItemId: string | null
): Menu {
  const riga = menuItems(menu).find((item) => item.id === itemId);
  // Lasciata dov'era: trascinare una riga su sé stessa non è un movimento
  if (!riga || itemId === beforeItemId) return menu;
  return conRighe(removeItem(menu, itemId), sectionId, (items) => {
    const dove = beforeItemId === null ? -1 : items.findIndex((x) => x.id === beforeItemId);
    if (dove < 0) return [...items, riga];
    return [...items.slice(0, dove), riga, ...items.slice(dove)];
  });
}

// Stessa cosa per le sezioni, stesso motivo.
export function moveSectionBefore(
  menu: Menu,
  sectionId: string,
  beforeSectionId: string | null
): Menu {
  const sezione = menu.sections.find((s) => s.id === sectionId);
  if (!sezione || sectionId === beforeSectionId) return menu;
  const senza = menu.sections.filter((s) => s.id !== sectionId);
  const dove = beforeSectionId === null ? -1 : senza.findIndex((s) => s.id === beforeSectionId);
  const sections =
    dove < 0 ? [...senza, sezione] : [...senza.slice(0, dove), sezione, ...senza.slice(dove)];
  return { ...menu, sections };
}

// Spostare una riga in un'altra sezione: la si toglie di dove sta e la si
// appende in fondo alla destinazione, con lo stesso id e lo stesso prezzo.
// È quello che fa la tendina "Sposta in", che resta il modo da tastiera.
export function moveItemToSection(menu: Menu, itemId: string, sectionId: string | null): Menu {
  const riga = menuItems(menu).find((item) => item.id === itemId);
  if (!riga) return menu;
  const senza = removeItem(menu, itemId);
  return conRighe(senza, sectionId, (items) => [...items, riga]);
}

export function setMenuDescription(menu: Menu, description: string): Menu {
  return { ...menu, description };
}

export function setMenuCurrency(menu: Menu, currency: string): Menu {
  return { ...menu, currency };
}
