'use client';

// Il livello che parla col localStorage, condiviso da vetrine e catalogo.
// Qui non si sa cosa siano una vetrina o un piatto: si leggono e si scrivono
// liste sotto una chiave, e si avvisa chi le sta mostrando. Con la migration
// 700 al suo posto arriveranno le query alle tabelle partner_*.
import { useEffect, useState } from 'react';

// Ogni scrittura si annuncia alle altre istanze degli hook (la sidebar mostra
// le vetrine mentre le stai modificando altrove). Un evento solo per catalogo
// e vetrine: eliminare un piatto tocca tutti e due.
const CHANGE_EVENT = 'partner-storage-changed';

export function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// null = non c'è niente da leggere, né una lista salvata né una leggibile.
// Chi chiama decide cosa farne: liste vuote e dati corrotti non sono la
// stessa cosa per chi deve ancora convertire una bozza vecchia.
//
// `any` deliberato: qui è il confine con dati non tipizzati (JSON arbitrario
// scritto anche da versioni precedenti del portale). Dichiararlo `unknown`
// costringerebbe a un cast per ogni campo dei parser, che esistono apposta
// per essere tolleranti.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function readList<T>(key: string, normalize: (raw: any) => T): T[] | null {
  try {
    const raw = localStorage.getItem(key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (raw) return (JSON.parse(raw) as any[]).map(normalize);
  } catch {
    // dati corrotti: come se non ci fosse niente
  }
  return null;
}

export function writeList<T>(key: string, list: T[]) {
  localStorage.setItem(key, JSON.stringify(list));
  notifyChange();
}

// La lista è null finché il localStorage non è stato letto: si legge solo nel
// browser, quindi al primo render (che avviene anche sul server) non c'è.
// Si ricarica a ogni scrittura, di chiunque sia.
export function useStoredList<T>(load: () => T[]): [T[] | null, (next: T[]) => void] {
  const [list, setList] = useState<T[] | null>(null);

  useEffect(() => {
    setList(load());
    const reload = () => setList(load());
    window.addEventListener(CHANGE_EVENT, reload);
    return () => window.removeEventListener(CHANGE_EVENT, reload);
    // load è stabile: le implementazioni sono funzioni di modulo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [list, setList];
}
