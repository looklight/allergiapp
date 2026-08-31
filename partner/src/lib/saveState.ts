'use client';

// Lo stato delle scritture, condiviso da tutte le schermate.
//
// Il portale scrive in modo OTTIMISTICO: l'interfaccia si aggiorna subito e la
// richiesta parte dietro. Fino al 31/08 un rifiuto del server finiva solo in
// console, quindi il ristoratore vedeva il suo dato come salvato e se ne
// accorgeva ricaricando la pagina, quando ormai era andato. Su un prezzo di un
// menù quello non è un dato impreciso: è una discussione al tavolo.
//
// Sta fuori da React apposta. Le scritture partono dal livello dati
// (showcases.ts, dishes.ts), che non vive dentro nessun componente, e l'avviso
// deve restare a schermo anche cambiando schermata.
import { useSyncExternalStore } from 'react';
import { reportError } from './storage';

export interface SaveState {
  saving: boolean;
  // Quando l'ultima scrittura è riuscita, per il "Salvato" che poi sfuma.
  // null finché non ne è riuscita nessuna in questa sessione.
  savedAt: number | null;
  failed: number;
}

// Una scrittura rifiutata, tenuta da parte per poterla rifare. È la funzione
// che la esegue, non il suo risultato: "Riprova" deve poterla rilanciare.
interface Fallita {
  dove: string;
  chiave: string | null;
  esegui: () => PromiseLike<{ error: unknown }>;
}

let inCorso = 0;
let riuscitaAlle: number | null = null;
let fallite: Fallita[] = [];

const ascoltatori = new Set<() => void>();

// useSyncExternalStore confronta gli oggetti per identità: se ne restituissimo
// uno nuovo a ogni lettura React ridisegnerebbe all'infinito. Quindi
// l'istantanea si ricostruisce solo quando cambia davvero qualcosa.
let istantanea: SaveState = { saving: false, savedAt: null, failed: 0 };

function aggiorna() {
  istantanea = { saving: inCorso > 0, savedAt: riuscitaAlle, failed: fallite.length };
  for (const ascolta of ascoltatori) ascolta();
}

function subscribe(ascolta: () => void) {
  ascoltatori.add(ascolta);
  return () => {
    ascoltatori.delete(ascolta);
  };
}

const fermo: SaveState = { saving: false, savedAt: null, failed: 0 };

export function useSaveState(): SaveState {
  // Sul server non esistono scritture: l'istantanea è ferma, e sarebbe un
  // oggetto nuovo a ogni chiamata se non fosse una costante
  return useSyncExternalStore(
    subscribe,
    () => istantanea,
    () => fermo
  );
}

// Ogni scrittura del portale passa di qui.
//
// `dove` è l'etichetta che finisce in console: dice quale scrittura è, non su
// cosa. `chiave` invece identifica il BERSAGLIO, e serve solo alle scritture
// che riscrivono per intero qualcosa di preciso — il nome di quella vetrina,
// le traduzioni di quel piatto. Fra due scritture con la stessa chiave l'ultima
// vince: nell'editor si riscrive il contenuto intero a ogni pausa di battitura,
// e rifare la vecchia dopo che l'utente ha continuato a scrivere rimetterebbe
// indietro dati già superati.
//
// SENZA chiave non si sostituisce niente, ed è la scelta prudente per
// definizione: creazioni ed eliminazioni riguardano righe diverse fra loro
// anche quando l'etichetta è la stessa, e scartarne una vorrebbe dire perdere
// per sempre un piatto che l'utente crede salvato.
//
// NON lancia mai, per scelta: chi scrive lo fa dentro un gestore di evento e
// quasi mai dentro un try. Un'eccezione qui vorrebbe dire un rifiuto non
// gestito e, peggio, le istruzioni successive saltate — la traduzione non
// salvata perché è fallito il piatto. Un guasto di rete torna quindi con la
// stessa forma di un rifiuto del server: data a null ed error valorizzato.
export async function write<T extends { error: unknown }>(
  dove: string,
  esegui: () => PromiseLike<T>,
  chiave: string | null = null
): Promise<T | { data: null; error: unknown }> {
  if (chiave !== null) fallite = fallite.filter((f) => f.chiave !== chiave);
  inCorso++;
  aggiorna();

  let esito: T;
  try {
    esito = await esegui();
  } catch (errore) {
    // Rete assente: supabase-js qui rifiuta invece di restituire un errore
    inCorso--;
    fallite.push({ dove, chiave, esegui });
    reportError(dove, errore);
    aggiorna();
    return { data: null, error: errore };
  }

  inCorso--;
  if (esito.error) {
    fallite.push({ dove, chiave, esegui });
    reportError(dove, esito.error);
  } else if (fallite.length === 0) {
    riuscitaAlle = Date.now();
  }
  aggiorna();
  return esito;
}

// Rilancia le scritture rifiutate, nell'ordine in cui erano partite: quelle
// che passano escono dalla lista da sole, perché ripassano da write().
export async function retryFailed() {
  const daRifare = fallite;
  fallite = [];
  aggiorna();
  for (const f of daRifare) await write(f.dove, f.esegui, f.chiave);
}
