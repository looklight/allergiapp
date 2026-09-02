'use client';

// L'aspetto del menù pubblico: il logo e il colore. Poche manopole e basta —
// non un configuratore con caratteri e disposizioni (DIGITAL_MENU.md, Tema 8).
//
// ⚠️ APPARTIENE AL LOCALE, NON AL MENÙ, ed è la cosa da non cambiare per
// comodità: al tavolo carta, pranzo e bevande sono LINGUETTE DELLA STESSA
// PAGINA (Tema 13, un indirizzo per locale). Un logo per menù darebbe tre
// intestazioni diverse allo stesso ristorante nella stessa pagina.
//
// I VALORI non stanno qui: vivono su partner_venues e si leggono da
// venues.ts, che quella riga la legge già. Qui restano solo le costanti e
// la riduzione del logo.
//
// ⚠️ Il logo è ancora un data URL dentro la riga, non un file su Storage.
// È il passo che manca: va portato su photos.ts come le foto dei piatti,
// per la stessa ragione scritta nella 702 — un'immagine dentro il testo
// della riga viaggia intera a ogni lettura.

// L'identità del locale: le tre cose che il cliente vede in cima alla pagina
// del menù. Con la 703 il nome è diventato `partner_venues.name` — prima era
// `venue_name`, che la 700 dichiarava un appunto privato del partner, e
// infatti finiva sullo schermo del cliente.
export interface MenuBrand {
  name: string;    // vuoto = non ancora chiesto
  logoUrl: string; // vuoto = compare quello di AllergiApp
  accent: string;  // uno dei codici di MENU_ACCENTS
}

// ------------------------------------------------------------------
// I COLORI, SCELTI DA NOI
// Il Tema 8 dice che il contrasto non è un'opzione del ristoratore: un menù
// che si vende come leggibile da chi ha un'allergia non può lasciar scegliere
// testo beige su panna. Quindi non un selettore di colore ma una fila di
// tinte già decise, tutte scure abbastanza da reggere il testo sul bianco.
// Chi ne aggiunge una: va verificata allo stesso metro, non a occhio.
// ------------------------------------------------------------------
export const MENU_ACCENTS = [
  { code: 'charcoal', hex: '#333333', it: 'Carbone', en: 'Charcoal' },
  { code: 'forest', hex: '#2E6B4F', it: 'Verde bosco', en: 'Forest green' },
  { code: 'navy', hex: '#1F4E79', it: 'Blu notte', en: 'Navy' },
  { code: 'brick', hex: '#8C3A2B', it: 'Mattone', en: 'Brick' },
  { code: 'plum', hex: '#6B3F6E', it: 'Prugna', en: 'Plum' },
  { code: 'brass', hex: '#7A5C1E', it: 'Ottone', en: 'Brass' },
] as const;

export const DEFAULT_ACCENT = MENU_ACCENTS[0].code;

// Il logo che compare quando il ristoratore non ne ha caricato uno suo.
// È coerente col Tema 13: sui piani gratuiti — che saranno i più — il nostro
// marchio letto a ogni tavolo è forse il ritorno principale.
// ⚠️ DUE COSE DA RICORDARE QUANDO SI ARRIVA AI PREZZI:
//   1. sta nel posto dell'identità DEL RISTORANTE, quindi è un ripiego
//      dichiarato e non un ornamento: "logo proprio" è una voce che si vende,
//      e questa è la sua controparte gratuita;
//   2. oggi è l'icona del PORTALE (la mascotte con le posate), che è
//      deliberatamente diversa da quella dell'app. Al tavolo però chi guarda
//      conosce l'app, non il portale: prima di andare in pubblico va messa
//      l'icona dell'app.
export const DEFAULT_LOGO = '/icons/icon-192.png';

export function accentHex(code: string): string {
  return MENU_ACCENTS.find((a) => a.code === code)?.hex ?? MENU_ACCENTS[0].hex;
}

// ------------------------------------------------------------------
// IL LOGO NON STA PIÙ QUI (2026-09-02)
// Ci stava `logoDataUrl`, che riduceva il logo e lo restituiva come
// data-URL da mettere dentro la riga del locale. Adesso il logo è un file
// su Storage e passa da photos.ts (`uploadLogo`), che è il posto dove vive
// tutto ciò che si carica — stessa riduzione, altro posto dove finisce.
// Era già scritto qui che sarebbe successo.
// ------------------------------------------------------------------
