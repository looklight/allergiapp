'use client';

// Il livello che parla col database, condiviso da vetrine e catalogo.
// Qui non si sa cosa siano una vetrina o un piatto: si carica una lista, si
// aspetta che arrivi, e si avvisa chi la sta mostrando quando cambia.
//
// Fino al 30/08 al posto di Supabase c'era il localStorage. La differenza che
// si sente è una sola ma pesa: le letture non sono più istantanee, quindi
// "non lo so ancora" (null) è uno stato vero e non un lampo.
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { supabase } from './supabase';

// Ogni scrittura passa di qui: se il database rifiuta, almeno si vede.
// L'avviso a schermo lo mette saveState.ts; questo resta il posto in cui il
// dettaglio tecnico finisce in console.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function reportError(dove: string, error: any) {
  if (error) console.error(`[partner] ${dove}:`, error.message ?? error, error.details ?? '');
  return error;
}

// L'id del partner autenticato. Serve a scrivere le righe: le RLS pretendono
// che owner_user_id sia il proprio, e la colonna non ha default.
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ------------------------------------------------------------------
// LE LISTE LETTE DAL DATABASE, IN UN POSTO SOLO
//
// Prima ogni componente che chiamava useDishes o useShowcases faceva la SUA
// interrogazione: aprire /piatti ne faceva tre, due delle quali identiche —
// la pagina e la barra laterale chiedevano le stesse vetrine — e aprire la
// scheda di un piatto ne aggiungeva una quarta che rileggeva l'intero
// catalogo con tutte le traduzioni. Adesso la lista è una, e chi la guarda
// ci si affaccia.
//
// Ne è sparita anche la sveglia: c'era un evento del browser per dire alla
// barra laterale di rileggere quando nasceva o spariva una vetrina. Con una
// lista sola non serve più, perché chi la cambia la cambia per tutti — ed è
// pure più veloce, visto che prima significava tornare al server.
// ------------------------------------------------------------------

interface Lista {
  righe: unknown[] | null;
  carica: () => Promise<unknown[]>;
  ascoltatori: Set<() => void>;
  // La prima lettura parte una volta sola anche se tre componenti si
  // affacciano nello stesso istante
  inCorso: Promise<void> | null;
}

const liste = new Map<string, Lista>();

// Il primo che si affaccia dice anche come si carica. Con una chiave sola per
// tipo di lista non c'è modo che due modi diversi si contendano lo stesso
// posto, ed è il motivo per cui la chiave è una costante e non un valore.
function lista(chiave: string, carica: () => Promise<unknown[]>): Lista {
  const esistente = liste.get(chiave);
  if (esistente) return esistente;
  const nuova: Lista = { righe: null, carica, ascoltatori: new Set(), inCorso: null };
  liste.set(chiave, nuova);
  return nuova;
}

function annuncia(l: Lista) {
  for (const ascolta of l.ascoltatori) ascolta();
}

async function rileggi(l: Lista) {
  l.righe = await l.carica();
  annuncia(l);
}

// Chi tiene da parte una convinzione su cosa c'è sul server la registra qui.
// Serve perché "dimentica tutto" resti UNA cosa sola: con le liste svuotate
// da una parte e gli altri depositi dall'altra, chi ne aggiunge uno domani
// non ha modo di accorgersi che andava svuotato anche il suo.
const dimenticanze = new Set<() => void>();

export function onForget(dimentica: () => void) {
  dimenticanze.add(dimentica);
}

// Cambiando partner nella stessa scheda, tutto quello che credevamo del
// server è di un'altra persona. Senza questo, chi esce e rientra con un altro
// account vedrebbe i piatti del precedente finché non ricarica: il portale
// non ricarica la pagina al cambio di sessione, la aggiorna e basta.
export function forgetServerState() {
  for (const l of liste.values()) {
    l.righe = null;
    l.inCorso = null;
    annuncia(l);
  }
  for (const dimentica of dimenticanze) dimentica();
}

// list è null finché la prima lettura non è tornata
export function useRemoteList<T>(chiave: string, carica: () => Promise<T[]>) {
  const l = lista(chiave, carica as () => Promise<unknown[]>);

  const subscribe = useCallback(
    (ascolta: () => void) => {
      l.ascoltatori.add(ascolta);
      return () => {
        l.ascoltatori.delete(ascolta);
      };
    },
    [l]
  );

  const list = useSyncExternalStore(
    subscribe,
    () => l.righe as T[] | null,
    // Sul server non si legge niente: la lista è sempre "non lo so ancora"
    () => null
  );

  const reload = useCallback(() => rileggi(l), [l]);

  // Riparte anche dopo resetLists(), che riporta le righe a null
  useEffect(() => {
    if (l.righe === null && l.inCorso === null) {
      l.inCorso = rileggi(l).finally(() => {
        l.inCorso = null;
      });
    }
  }, [l, list]);

  const setList = useCallback(
    (righe: T[]) => {
      l.righe = righe;
      annuncia(l);
    },
    [l]
  );

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
