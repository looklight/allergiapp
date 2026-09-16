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

// L'ABBONAMENTO: i due bottoni che aprono il pagamento su Stripe.
//
// ⚠️ SPENTO fino al passaggio ai pagamenti veri. La catena funziona tutta
// (migration 716, tre funzioni su Supabase, pagina Abbonamenti), ma Stripe è
// ancora in sandbox: acceso, un ristoratore vero si troverebbe davanti un
// pagamento finto che non gli dà niente.
//
// Cosa resta visibile da spento: lo STATO dell'abbonamento del locale. Serve
// agli abbonamenti concessi a mano dall'admin, che esistono già e devono
// potersi vedere.
//
// Si accende quando: l'account Stripe è attivato e intestato alla P.IVA, i
// prezzi sono rifatti in modalità reale, e le condizioni d'uso col P2B sono
// online (MONETIZATION.md, «Piano operativo dell'abbonamento», passo 4).
export const SUBSCRIPTIONS: boolean = false;

// L'ASPETTO DEL MENÙ È PREMIUM: l'etichetta e la frase che lo dicono nella
// scatola «Aspetto del menù».
//
// ⚠️ VA TENUTO ALLINEATO ALLA MIGRATION 718, che è dove il muro esiste
// davvero (nello scatto di pubblicazione, non qui). Acceso senza la 718
// direbbe una bugia al contrario — «serve l'abbonamento» mentre in sala
// l'aspetto ci arriva lo stesso.
//
// Non è un lucchetto: le manopole restano tutte usabili e l'anteprima le
// mostra. L'etichetta serve a non far scoprire il confine DOPO aver
// lavorato mezz'ora (DIGITAL_MENU.md, Tema 27).
// ⚠️ ACCESO il 2026-09-16, il giorno in cui la 718 è stata applicata: da qui
// in poi l'etichetta dice il vero, perché il muro nello scatto esiste davvero.
export const APPEARANCE_PREMIUM: boolean = true;
