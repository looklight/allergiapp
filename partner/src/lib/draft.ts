'use client';

// Catalogo piatti e vetrine del partner: per ora persistono in localStorage.
// Passeranno alle tabelle partner_* (migration 700) quando verrà applicata.
import { useEffect, useState } from 'react';

// Il piatto appartiene al PARTNER, non alla singola vetrina: lo stesso
// ristoratore con due locali riusa la sua carbonara in tutte e due.
export interface Dish {
  id: string;
  name: string;
  description: string;
  category: string; // codici da DISH_CATEGORIES; '' = nessuna categoria
  photoUrl: string; // data-URL ridimensionato (localStorage); Storage in futuro
  allergens: string[]; // codici da allergens.code (presenti nel piatto)
  dietTags: string[]; // codici da DIETS (compatibilità dichiarate)
}

export interface MenuLink {
  language: string; // codice lingua; '' = predefinito (fallback)
  url: string;
}

export interface DeliveryLink {
  provider: string; // codice da DELIVERY_PROVIDERS, 'other' o '' (non scelto)
  label: string; // nome del servizio quando provider = 'other'
  url: string;
}

// Prenotazione: link, telefono o entrambi. Con tutti e due la scheda
// mostra sempre una pill sola e fa scegliere all'utente.
export interface BookingLink {
  url: string;
  phone: string; // come l'ha scritto il ristoratore; il tel: lo ripulisce
}

export interface DraftLinks {
  booking: BookingLink;
  website: string;
  // più servizi delivery: un link solo apre diretto, con più link l'app
  // mostra un bottom sheet di scelta
  deliveries: DeliveryLink[];
  // più menù per lingua: l'app mostra quello nella lingua dell'utente,
  // altrimenti il primo della lista
  menus: MenuLink[];
}

export interface ShowcaseDraft {
  // Nome della vetrina: la identifica nella lista, NON è il nome del locale
  // (quello arriverà dall'associazione; l'anteprima mostra un nome di esempio).
  venueName: string;
  // Piatti del catalogo accesi in questa vetrina. È l'UNICO stato di
  // disponibilità: spegnerne uno qui non lo tocca nelle altre vetrine, e
  // il piatto resta comunque nel catalogo.
  dishIds: string[];
  links: DraftLinks;
}

export interface Showcase extends ShowcaseDraft {
  id: string;
}

export function emptyDraft(): ShowcaseDraft {
  return {
    venueName: '',
    // una vetrina nuova nasce con tutti i piatti spenti: li accende il partner
    dishIds: [],
    links: {
      booking: { url: '', phone: '' },
      website: '',
      // vuoti: i link si accendono dalle pill dell'editor
      deliveries: [],
      menus: [],
    },
  };
}

export function emptyDish(): Omit<Dish, 'id'> {
  return { name: '', description: '', category: '', photoUrl: '', allergens: [], dietTags: [] };
}

const STORAGE_KEY = 'partner-showcases';
const DISHES_KEY = 'partner-dishes';
const LEGACY_KEY = 'partner-showcase-draft'; // bozza singola pre-lista
// Ogni salvataggio lo annuncia alle altre istanze degli hook (es. sidebar).
// Uno solo per catalogo e vetrine: eliminare un piatto tocca tutti e due.
const CHANGE_EVENT = 'partner-storage-changed';

// `any` deliberato in tutto il livello di lettura: qui è il confine con dati
// non tipizzati (JSON arbitrario dal localStorage, scritto anche da versioni
// precedenti del portale). Dichiararlo `unknown` costringerebbe a un cast per
// ogni singolo campo di parser che esistono apposta per essere tolleranti.
// Spariscono con la migration 700, quando i dati arriveranno dal database.
/* eslint-disable @typescript-eslint/no-explicit-any */

function normalizeDish(parsed: any): Dish {
  return {
    id: typeof parsed?.id === 'string' ? parsed.id : crypto.randomUUID(),
    name: typeof parsed?.name === 'string' ? parsed.name : '',
    description: typeof parsed?.description === 'string' ? parsed.description : '',
    category: typeof parsed?.category === 'string' ? parsed.category : '',
    photoUrl: typeof parsed?.photoUrl === 'string' ? parsed.photoUrl : '',
    allergens: Array.isArray(parsed?.allergens) ? parsed.allergens : [],
    dietTags: Array.isArray(parsed?.dietTags) ? parsed.dietTags : [],
  };
}

// Riporta qualunque bozza salvata (anche da versioni precedenti) alla forma corrente.
function normalizeDraft(parsed: any): ShowcaseDraft {
  const rawLinks = parsed?.links ?? {};
  return {
    venueName: typeof parsed?.venueName === 'string' ? parsed.venueName : '',
    dishIds: Array.isArray(parsed?.dishIds) ? parsed.dishIds : [],
    links: {
      // bozze salvate quando la prenotazione era solo un link
      booking:
        typeof rawLinks.booking === 'string'
          ? { url: rawLinks.booking, phone: '' }
          : { url: rawLinks.booking?.url ?? '', phone: rawLinks.booking?.phone ?? '' },
      website: rawLinks.website ?? '',
      // liste vuote ammesse: il link semplicemente non è attivo
      deliveries: Array.isArray(rawLinks.deliveries)
        ? rawLinks.deliveries
        // bozze salvate col vecchio campo `delivery` singolo
        : typeof rawLinks.delivery === 'string' && rawLinks.delivery.trim() !== ''
          ? [{ provider: '', label: '', url: rawLinks.delivery }]
          : [],
      menus: Array.isArray(rawLinks.menus)
        ? rawLinks.menus
        // bozze salvate col vecchio campo `menu` singolo
        : typeof rawLinks.menu === 'string' && rawLinks.menu.trim() !== ''
          ? [{ language: '', url: rawLinks.menu }]
          : [],
    },
  };
}

// Porta il localStorage alla forma corrente prima di qualsiasi lettura.
// Gira a ogni load ed è idempotente: quando non c'è niente da spostare esce subito.
function migrateStorage() {
  try {
    // 1. la vecchia bozza singola diventa la prima vetrina
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const first = { id: crypto.randomUUID(), ...JSON.parse(legacy) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([first]));
      }
      localStorage.removeItem(LEGACY_KEY);
    }

    // 2. i piatti stavano dentro ogni vetrina: diventano il catalogo del
    //    partner e la vetrina ne tiene solo gli id accesi. `available: false`
    //    non si perde, diventa "piatto nel catalogo ma spento in quella vetrina".
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const showcases = JSON.parse(raw);
    if (!Array.isArray(showcases) || !showcases.some((s) => Array.isArray(s?.dishes))) return;

    const catalogRaw = localStorage.getItem(DISHES_KEY);
    const parsedCatalog = catalogRaw ? JSON.parse(catalogRaw) : null;
    const catalog: Dish[] = Array.isArray(parsedCatalog) ? parsedCatalog.map(normalizeDish) : [];

    const migrated = showcases.map((showcase: any) => {
      if (!Array.isArray(showcase?.dishes)) return showcase;
      const dishIds: string[] = Array.isArray(showcase.dishIds) ? [...showcase.dishIds] : [];
      for (const legacyDish of showcase.dishes) {
        const dish = normalizeDish(legacyDish);
        catalog.push(dish);
        // spento solo chi era esplicitamente nascosto
        if (legacyDish?.available !== false) dishIds.push(dish.id);
      }
      const migrated = { ...showcase, dishIds };
      delete migrated.dishes; // il campo vecchio sparisce: la migrazione non si ripete
      return migrated;
    });

    localStorage.setItem(DISHES_KEY, JSON.stringify(catalog));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  } catch {
    // dati corrotti: le load qui sotto ripartono vuote
  }
}

function loadShowcases(): Showcase[] {
  migrateStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return (JSON.parse(raw) as any[]).map((s) => ({ id: s.id, ...normalizeDraft(s) }));
    }
  } catch {
    // dati corrotti: si riparte vuoti
  }
  return [];
}

function loadDishes(): Dish[] {
  migrateStorage();
  try {
    const raw = localStorage.getItem(DISHES_KEY);
    if (raw) return (JSON.parse(raw) as any[]).map(normalizeDish);
  } catch {
    // dati corrotti: si riparte vuoti
  }
  return [];
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// Ricarica ogni volta che qualcuno scrive: le due liste vivono in pagine
// diverse ma si toccano (un piatto eliminato sparisce dalle vetrine).
function useStoredList<T>(load: () => T[]): [T[] | null, (next: T[]) => void] {
  const [list, setList] = useState<T[] | null>(null);

  useEffect(() => {
    setList(load());
    const reload = () => setList(load());
    window.addEventListener(CHANGE_EVENT, reload);
    return () => window.removeEventListener(CHANGE_EVENT, reload);
    // load è stabile: le due implementazioni sono funzioni di modulo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [list, setList];
}

// showcases è null finché localStorage non è stato letto (solo client)
export function useShowcases() {
  const [showcases, setShowcases] = useStoredList(loadShowcases);

  function persist(next: Showcase[]) {
    setShowcases(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function create(venueName = ''): Showcase {
    const created: Showcase = { id: crypto.randomUUID(), ...emptyDraft(), venueName };
    persist([...(showcases ?? []), created]);
    return created;
  }

  function update(id: string, draft: ShowcaseDraft) {
    persist((showcases ?? []).map((s) => (s.id === id ? { ...draft, id } : s)));
  }

  // Rinomina dalla lista: tocca solo il nome, il resto della bozza resta com'è
  function rename(id: string, venueName: string) {
    persist((showcases ?? []).map((s) => (s.id === id ? { ...s, venueName } : s)));
  }

  function remove(id: string) {
    persist((showcases ?? []).filter((s) => s.id !== id));
  }

  // Ripristino dopo l'undo: la vetrina torna dov'era, non in fondo alla lista
  function restore(showcase: Showcase, index: number) {
    const next = [...(showcases ?? [])];
    next.splice(index, 0, showcase);
    persist(next);
  }

  // Accende o spegne un piatto in una vetrina: il toggle della griglia e le
  // caselle "In vetrina" del gestionale passano tutti di qui.
  function setDishOn(showcaseId: string, dishId: string, on: boolean) {
    persist(
      (showcases ?? []).map((s) =>
        s.id !== showcaseId
          ? s
          : {
              ...s,
              dishIds: on
                ? s.dishIds.includes(dishId)
                  ? s.dishIds
                  : [...s.dishIds, dishId]
                : s.dishIds.filter((id) => id !== dishId),
            }
      )
    );
  }

  return { showcases, create, update, rename, remove, restore, setDishOn };
}

// dishes è null finché localStorage non è stato letto (solo client)
export function useDishes() {
  const [dishes, setDishes] = useStoredList(loadDishes);

  function persist(next: Dish[]) {
    setDishes(next);
    localStorage.setItem(DISHES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function create(data: Omit<Dish, 'id'>): Dish {
    const created: Dish = { ...data, id: crypto.randomUUID() };
    persist([...(dishes ?? []), created]);
    return created;
  }

  function update(id: string, data: Omit<Dish, 'id'>) {
    persist((dishes ?? []).map((dish) => (dish.id === id ? { ...data, id } : dish)));
  }

  // Il piatto eliminato sparisce anche dalle vetrine in cui era acceso:
  // un id orfano lì dentro non mostrerebbe niente, ma resterebbe nel conteggio.
  function remove(id: string) {
    persist((dishes ?? []).filter((dish) => dish.id !== id));
    detachDishFromShowcases(id);
  }

  // Ripristino dopo l'undo: il piatto torna dov'era nel catalogo e si
  // riaccende nelle vetrine in cui era acceso prima
  function restore(dish: Dish, index: number, showcaseIds: string[]) {
    const next = [...(dishes ?? [])];
    next.splice(index, 0, dish);
    persist(next);
    setDishShowcases(dish.id, showcaseIds);
  }

  return { dishes, create, update, remove, restore };
}

// Scritture sulle vetrine fatte dal catalogo: passano dal localStorage e non
// dallo stato dell'hook, che nella pagina Piatti potrebbe non essere montato.
function rewriteShowcases(change: (showcase: Showcase) => Showcase) {
  const next = loadShowcases().map(change);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function detachDishFromShowcases(dishId: string) {
  rewriteShowcases((s) => ({ ...s, dishIds: s.dishIds.filter((id) => id !== dishId) }));
}

// Accende un piatto esattamente nelle vetrine elencate e lo spegne nelle
// altre, in una scrittura sola: le caselle "In vetrina" del gestionale ne
// cambiano più d'una insieme, e chiamare setDishOn in fila lavorerebbe ogni
// volta su uno stato già vecchio.
export function setDishShowcases(dishId: string, showcaseIds: string[]) {
  rewriteShowcases((s) => {
    const on = showcaseIds.includes(s.id);
    if (on === s.dishIds.includes(dishId)) return s;
    return {
      ...s,
      dishIds: on ? [...s.dishIds, dishId] : s.dishIds.filter((id) => id !== dishId),
    };
  });
}

// Piatti accesi in una vetrina, nell'ordine del catalogo (che è l'ordine in
// cui il partner li ha creati): non c'è un ordinamento per vetrina.
export function showcaseDishes(dishes: Dish[], showcase: ShowcaseDraft): Dish[] {
  return dishes.filter((dish) => showcase.dishIds.includes(dish.id));
}

// In quante vetrine un piatto è acceso (colonna del gestionale)
export function showcasesWithDish(showcases: Showcase[], dishId: string): Showcase[] {
  return showcases.filter((s) => s.dishIds.includes(dishId));
}

// Indirizzo scritto senza schema (www.osteria.it): l'app non saprebbe
// aprirlo, quindi lo completiamo noi quando il campo perde il fuoco.
// Vuoto o già con uno schema: lasciato esattamente com'è.
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '' || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// La pill Prenota si accende col link, col telefono o con entrambi
export function hasBooking(booking: BookingLink): boolean {
  return booking.url.trim() !== '' || booking.phone.trim() !== '';
}

// Quante pill compilate ha una vetrina (riga di riepilogo in lista):
// la prenotazione conta una volta anche con link e telefono insieme
export function countLinks(links: DraftLinks): number {
  return (
    (hasBooking(links.booking) ? 1 : 0) +
    (links.website.trim() !== '' ? 1 : 0) +
    links.deliveries.filter((del) => del.url.trim() !== '').length +
    links.menus.filter((menu) => menu.url.trim() !== '').length
  );
}
