'use client';

// Il livello che parla col database, condiviso da vetrine e catalogo.
// Qui non si sa cosa siano una vetrina o un piatto: si carica una lista, si
// aspetta che arrivi, e si avvisa chi la sta mostrando quando cambia.
//
// Fino al 30/08 al posto di Supabase c'era il localStorage. La differenza che
// si sente è una sola ma pesa: le letture non sono più istantanee, quindi
// "non lo so ancora" (null) è uno stato vero e non un lampo.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

// Un cambiamento STRUTTURALE si annuncia alle altre viste montate: la barra
// laterale elenca le vetrine, e deve accorgersi se ne nasce o ne sparisce una.
// NON si annunciano le modifiche di contenuto (un link che si scrive, un
// piatto acceso): fuori dalla schermata che le fa non le guarda nessuno, e
// annunciarle vorrebbe dire una rilettura di rete a ogni pausa di battitura.
const CHANGE_EVENT = 'partner-storage-changed';

export function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// L'id del partner autenticato. Serve a scrivere le righe: le RLS pretendono
// che owner_user_id sia il proprio, e la colonna non ha default.
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// Carica una lista e la ricarica quando qualcuno annuncia un cambiamento.
// list è null finché la prima lettura non è tornata.
export function useRemoteList<T>(load: () => Promise<T[]>) {
  const [list, setList] = useState<T[] | null>(null);
  // load arriva quasi sempre come funzione scritta al volo: in un ref, così
  // l'effetto non riparte a ogni render rifacendo la stessa query
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(async () => {
    const righe = await loadRef.current();
    setList(righe);
  }, []);

  useEffect(() => {
    reload();
    const onChange = () => {
      reload();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [reload]);

  return { list, setList, reload };
}

// Salvataggio che aspetta la fine della battitura.
//
// Nell'editor della vetrina ogni tasto premuto cambia la bozza: sul
// localStorage era gratis, su un database sarebbe una richiesta per carattere.
// Qui lo stato dell'interfaccia si aggiorna subito e la scrittura parte dopo
// una pausa — con `flush()` da chiamare quando si lascia la pagina, o l'ultima
// battuta non arriverebbe mai al server.
const PAUSA_MS = 800;

export function useDebouncedSave<T>(save: (valore: T) => Promise<void>) {
  const inSospeso = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const valore = inSospeso.current;
    inSospeso.current = null;
    if (valore !== null) void saveRef.current(valore);
  }, []);

  const schedule = useCallback(
    (valore: T) => {
      inSospeso.current = valore;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, PAUSA_MS);
    },
    [flush]
  );

  // Chiudere la scheda o cambiare pagina non deve costare l'ultima modifica
  useEffect(() => {
    const onLeave = () => flush();
    window.addEventListener('pagehide', onLeave);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      flush();
    };
  }, [flush]);

  return { schedule, flush };
}
