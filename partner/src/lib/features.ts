// Gli interruttori delle cose che ESISTONO ma non sono accese per tutti.
//
// Stanno qui e non in una variabile d'ambiente perché la loro forma
// successiva non è una configurazione del sito: è il piano del ristoratore,
// letto dal database (DIGITAL_MENU.md, Tema 19). Una variabile d'ambiente
// andrebbe buttata via il giorno dopo, e nel frattempo avrebbe sparso la
// stessa decisione fra il codice e la configurazione di Vercel.
//
// Come si accende: si mette `true` qui, si rilascia, e torna tutto quello che
// c'era prima — niente è stato tolto, solo reso invisibile.

// PIÙ MENÙ PER LO STESSO LOCALE (carta, pranzo, bevande: al tavolo sono le
// linguette in cima alla pagina).
//
// Spento il 2026-09-01: in questa fase un locale ha UN menù. Il modello dati
// resta multiplo — `partner_menus` ha una riga per menù e nessun vincolo che
// lo impedisca — perché più menù è una delle voci che si pagheranno
// (DIGITAL_MENU.md, "Il confine del freemium"): un vincolo sul database
// sarebbe stato la cosa difficile da togliere.
//
// Con l'interruttore spento non si può CREARE un secondo menù, ma quelli che
// esistono già restano visibili e apribili: spegnere una funzione non è
// nascondere il lavoro di chi l'aveva usata.
export const MULTI_MENU: boolean = false;

// LE MANOPOLE CHE ASPETTANO LA MIGRATION 711: la forma delle miniature dei
// piatti (tonde o squadrate) e l'interlinea.
//
// Spento per una ragione diversa da MULTI_MENU: non è una scelta di prodotto,
// è che le COLONNE NON CI SONO ANCORA. La 711 è scritta ma l'utente la
// applicherà più avanti, insieme ad altre modifiche.
//
// Un interruttore solo per due manopole, e non due: sono spente per lo stesso
// identico motivo e si accendono nello stesso identico momento. Due
// interruttori da ricordarsi di girare insieme sono un modo di dimenticarne
// uno.
//
// Finché è `false` il portale non NOMINA mai `dish_photo_shape` né
// `line_height` — non le chiede nella select dei locali e non le scrive —
// perché PostgREST, davanti a una colonna che non esiste, rifiuta
// l'interrogazione INTERA: non tornerebbe un locale con un campo in meno,
// non tornerebbe nessun locale. I valori restano quelli di sempre
// ('square' e 'normal') e le scelte che non si possono salvare non si
// mostrano: offrirle vorrebbe dire un bottone che non fa niente.
//
// COME SI ACCENDE: si applica la 711 dal SQL editor, si mette `true` qui, si
// rilascia. Non c'è altro da fare — il resto del codice è già scritto.
export const APPEARANCE_711: boolean = false;
