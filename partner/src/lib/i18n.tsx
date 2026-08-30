'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import it from './dictionaries/it';
import en from './dictionaries/en';

export type Locale = 'it' | 'en';
export type Dictionary = typeof it;

const dictionaries: Record<Locale, Dictionary> = { it, en };

const STORAGE_KEY = 'partner-locale';

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  d: Dictionary;
}

const I18nContext = createContext<I18nState>({
  locale: 'it',
  setLocale: () => {},
  d: it,
});

// Frasi che contengono un valore: nel dizionario stanno intere, col posto del
// valore segnato da un nome fra graffe. Montarle a pezzi nel JSX vorrebbe dire
// tenere preposizioni sciolte nel dizionario ("di", "su"), che in un'altra
// lingua possono finire da tutt'altra parte della frase o sparire.
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name) => String(values[name] ?? whole));
}

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('it');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'it' || saved === 'en') {
      setLocaleState(saved);
    } else if (!navigator.language.toLowerCase().startsWith('it')) {
      setLocaleState('en');
    }
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  // L'attributo lang dell'HTML segue la lingua scelta: conta per screen
  // reader e traduttori automatici. Si imposta qui e non in layout.tsx
  // perché il layout sta fuori dal provider.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, d: dictionaries[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}
