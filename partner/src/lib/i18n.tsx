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

  // ⚠️ Il deposito del browser va chiesto dentro un try, e qui più che
  // altrove: con lo storage negato (navigazione privata su certi browser,
  // cookie di terze parti bloccati) leggerlo non restituisce null, LANCIA — e
  // questo provider avvolge tutta l'app, quindi non si degraderebbe alla
  // lingua di partenza, si spegnerebbe la pagina intera. Lo fa già venues.ts
  // col locale ricordato; qui era rimasto scoperto.
  useEffect(() => {
    let salvata: string | null = null;
    try {
      salvata = localStorage.getItem(STORAGE_KEY);
    } catch {
      // deposito negato: si riparte da quello che dice il browser
    }
    if (salvata === 'it' || salvata === 'en') {
      setLocaleState(salvata);
    } else if (!navigator.language.toLowerCase().startsWith('it')) {
      setLocaleState('en');
    }
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // se non si può ricordare, pazienza: la scelta vale per questa visita
    }
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
