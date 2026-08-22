'use client';

// Vetrine del partner: per ora persistono in localStorage (lista con id).
// Passeranno alle tabelle partner_* (migration 700) quando verrà applicata.
import { useEffect, useState } from 'react';

export interface DraftDish {
  id: string;
  name: string;
  description: string;
  category: string; // codici da DISH_CATEGORIES; '' = nessuna categoria
  photoUrl: string; // data-URL ridimensionato (localStorage); Storage in futuro
  available: boolean; // false = nascosto: resta in bozza ma non appare nella scheda
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

export interface DraftLinks {
  booking: string;
  website: string;
  // più servizi delivery: un link solo apre diretto, con più link l'app
  // mostra un bottom sheet di scelta
  deliveries: DeliveryLink[];
  // più menù per lingua: l'app mostra quello nella lingua dell'utente,
  // altrimenti il primo della lista
  menus: MenuLink[];
}

export interface ShowcaseDraft {
  // Nome della vetrina: la identifica nella lista e l'anteprima lo usa
  // come nome del locale finché non c'è l'associazione al locale reale.
  venueName: string;
  dishes: DraftDish[];
  links: DraftLinks;
}

export interface Showcase extends ShowcaseDraft {
  id: string;
}

export function emptyDraft(): ShowcaseDraft {
  return {
    venueName: '',
    dishes: [],
    links: {
      booking: '',
      website: '',
      // vuoti: i link si accendono dalle pill dell'editor
      deliveries: [],
      menus: [],
    },
  };
}

const STORAGE_KEY = 'partner-showcases';
const LEGACY_KEY = 'partner-showcase-draft'; // bozza singola pre-lista
// Ogni salvataggio lo annuncia alle altre istanze dell'hook (es. sidebar)
const CHANGE_EVENT = 'partner-showcases-changed';

// Riporta qualunque bozza salvata (anche da versioni precedenti) alla forma corrente.
//
// `any` deliberato: qui è il confine con dati non tipizzati (JSON arbitrario
// dal localStorage, scritto anche da versioni precedenti del portale).
// Dichiararlo `unknown` costringerebbe a un cast per ogni singolo campo di un
// parser che esiste apposta per essere tollerante. Sparisce con la migration
// 700, quando i dati arriveranno tipizzati dal database.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDraft(parsed: any): ShowcaseDraft {
  const rawLinks = parsed?.links ?? {};
  return {
    venueName: typeof parsed?.venueName === 'string' ? parsed.venueName : '',
    links: {
      booking: rawLinks.booking ?? '',
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
    dishes: (parsed?.dishes ?? []).map((dish: Partial<DraftDish>) => ({
      category: '',
      photoUrl: '',
      available: true,
      dietTags: [],
      ...dish,
    })),
  };
}

function loadShowcases(): Showcase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- stesso confine non tipizzato di normalizeDraft
      return (JSON.parse(raw) as any[]).map((s) => ({ id: s.id, ...normalizeDraft(s) }));
    }
    // migrazione: la vecchia bozza singola diventa la prima vetrina
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const first: Showcase = { id: crypto.randomUUID(), ...normalizeDraft(JSON.parse(legacy)) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([first]));
      localStorage.removeItem(LEGACY_KEY);
      return [first];
    }
  } catch {
    // dati corrotti: si riparte vuoti
  }
  return [];
}

// showcases è null finché localStorage non è stato letto (solo client)
export function useShowcases() {
  const [showcases, setShowcases] = useState<Showcase[] | null>(null);

  useEffect(() => {
    setShowcases(loadShowcases());
    const reload = () => setShowcases(loadShowcases());
    window.addEventListener(CHANGE_EVENT, reload);
    return () => window.removeEventListener(CHANGE_EVENT, reload);
  }, []);

  function persist(next: Showcase[]) {
    setShowcases(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function create(): Showcase {
    const created: Showcase = { id: crypto.randomUUID(), ...emptyDraft() };
    persist([...(showcases ?? []), created]);
    return created;
  }

  function update(id: string, draft: ShowcaseDraft) {
    persist((showcases ?? []).map((s) => (s.id === id ? { ...draft, id } : s)));
  }

  function remove(id: string) {
    persist((showcases ?? []).filter((s) => s.id !== id));
  }

  return { showcases, create, update, remove };
}

// Quanti link compilati ha una vetrina (riga di riepilogo in lista)
export function countLinks(links: DraftLinks): number {
  return (
    (links.booking.trim() !== '' ? 1 : 0) +
    (links.website.trim() !== '' ? 1 : 0) +
    links.deliveries.filter((del) => del.url.trim() !== '').length +
    links.menus.filter((menu) => menu.url.trim() !== '').length
  );
}
