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
