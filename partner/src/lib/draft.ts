'use client';

// Bozza vetrina: per ora persiste in localStorage.
// Passerà alle tabelle partner_* (migration 700) quando verrà applicata.
import { useEffect, useRef, useState } from 'react';

export interface DraftDish {
  id: string;
  name: string;
  description: string;
  allergens: string[]; // codici da allergens.code (presenti nel piatto)
}

export interface DraftLinks {
  booking: string;
  delivery: string;
  menu: string;
  website: string;
}

export interface ShowcaseDraft {
  venueName: string;
  dishes: DraftDish[];
  links: DraftLinks;
}

export const EMPTY_DRAFT: ShowcaseDraft = {
  venueName: '',
  dishes: [],
  links: { booking: '', delivery: '', menu: '', website: '' },
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
        setDraft({ ...EMPTY_DRAFT, ...parsed, links: { ...EMPTY_DRAFT.links, ...parsed.links } });
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
