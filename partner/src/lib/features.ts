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

// LA FORMA DELLE MINIATURE dei piatti nel menù al tavolo: tonde o squadrate.
//
// Spento il 2026-09-03 per una ragione diversa da MULTI_MENU: non è una
// scelta di prodotto, è che la colonna NON C'È ANCORA. La migration 711 è
// scritta ma l'utente la applicherà più avanti, insieme ad altre cose.
//
// Finché è `false` il portale non NOMINA mai `dish_photo_shape` — non la
// chiede nella select dei locali e non la scrive — perché PostgREST, davanti
// a una colonna che non esiste, rifiuta l'interrogazione INTERA: non
// tornerebbe un locale con un campo in meno, non tornerebbe nessun locale.
// La forma resta 'square', cioè il menù di sempre, e la terza scelta non si
// mostra: offrirla vorrebbe dire un bottone che non salva niente.
//
// COME SI ACCENDE: si applica la 711 dal SQL editor, si mette `true` qui, si
// rilascia. Non c'è altro da fare — il resto del codice è già scritto.
export const DISH_PHOTO_SHAPE: boolean = false;
