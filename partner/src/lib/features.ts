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
// ⚠️ RIACCESO il 2026-09-06, insieme alla migration 714 che porta in sala
// tutte le carte attive (prima build_public_menu ne prendeva una sola, quindi
// questo interruttore da solo non avrebbe cambiato niente al tavolo).
//
// Era spento dal 01/09 non per una ragione tecnica ma di listino: più menù è
// una delle voci che si sarebbero pagate (DIGITAL_MENU.md, "Il confine del
// freemium"). Decisione dell'utente: si accende per tutti adesso e la
// divisione free/premium si disegna dopo, con i ristoratori davanti.
// ⚠️ Chi ci tornerà sopra sappia che togliere una cosa già data costa più che
// non averla mai data: se il confine tornerà qui, serve un piano per chi nel
// frattempo si è fatto due carte.
//
// L'indirizzo resta UNO: il QR è incollato al tavolo e non cambia a
// mezzogiorno, quindi le carte sono linguette dentro la stessa pagina, non
// pagine diverse (Tema 13).
export const MULTI_MENU: boolean = true;

// LE QUATTRO MANOPOLE DELLA MIGRATION 711: forma delle miniature dei piatti
// (tonde o squadrate), interlinea, impaginazione (a riga / a blocco) e segno
// fra un piatto e l'altro.
//
// ⚠️ ACCESO dal 2026-09-06, il giorno in cui la 711 è stata applicata e
// verificata sul database di produzione (colonne, vincolo, pg_get_functiondef).
// Prima era spento per una ragione diversa da MULTI_MENU: non una scelta di
// prodotto, ma il fatto che LE COLONNE NON C'ERANO — e PostgREST, davanti a
// una colonna che non esiste, rifiuta l'interrogazione INTERA: non un locale
// con un campo in meno, nessun locale.
//
// A cosa serve adesso: è la leva per tornare indietro senza revert, se una di
// quelle quattro si rivelasse rotta in produzione. ⚠️ Va tolto — lui e le
// guardie `APPEARANCE_711 &&` sparse in BrandBar e venues.ts — quando le
// manopole saranno state usate da qualcuno per qualche giorno. Finché resta,
// spegnerlo NON è una rollback completa: `allergen_display` e il kind
// 'social', arrivati con la stessa migration, non passano di qui perché le
// loro colonne esistono già.
export const APPEARANCE_711: boolean = true;
