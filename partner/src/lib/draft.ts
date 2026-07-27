'use client';

// Bozza vetrina: per ora persiste in localStorage.
// Passerà alle tabelle partner_* (migration 700) quando verrà applicata.
import { useEffect, useRef, useState } from 'react';

export interface DraftDish {
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

export interface DraftLinks {
  booking: string;
  website: string;
  // più servizi delivery: un link solo apre diretto, con più link l'app
  // mostra un bottom sheet di scelta
  deliveries: DeliveryLink[];
  // più menù per lingua: l'app mostra quello nella lingua dell'utente,
  // altrimenti il predefinito
  menus: MenuLink[];
}

export interface ShowcaseDraft {
  venueName: string;
  dishes: DraftDish[];
  links: DraftLinks;
}

export const EMPTY_DRAFT: ShowcaseDraft = {
  venueName: '',
  dishes: [],
  links: {
    booking: '',
    website: '',
    deliveries: [{ provider: '', label: '', url: '' }],
    menus: [{ language: '', url: '' }],
  },
};

const STORAGE_KEY = 'partner-showcase-draft';

export function useDraft() {
  const [draft, setDraft] = useState<ShowcaseDraft>(EMPTY_DRAFT);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const rawLinks = parsed.links ?? {};
        setDraft({
          ...EMPTY_DRAFT,
          ...parsed,
          links: {
            booking: rawLinks.booking ?? '',
            website: rawLinks.website ?? '',
            deliveries:
              Array.isArray(rawLinks.deliveries) && rawLinks.deliveries.length > 0
                ? rawLinks.deliveries
                // bozze salvate col vecchio campo `delivery` singolo
                : [{ provider: '', label: '', url: typeof rawLinks.delivery === 'string' ? rawLinks.delivery : '' }],
            menus:
              Array.isArray(rawLinks.menus) && rawLinks.menus.length > 0
                ? rawLinks.menus
                // bozze salvate col vecchio campo `menu` singolo
                : [{ language: '', url: typeof rawLinks.menu === 'string' ? rawLinks.menu : '' }],
          },
          dishes: (parsed.dishes ?? []).map((dish: Partial<DraftDish>) => ({
            category: '',
            photoUrl: '',
            dietTags: [],
            ...dish,
          })),
        });
      }
    } catch {
      // bozza corrotta: si riparte vuoti
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  return { draft, setDraft };
}
