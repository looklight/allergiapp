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
// tinte già decise, tutte scure abbastanza da reggere il testo bianco sopra.
//
// ⚠️ IL METRO, misurato il 2026-09-06 e non a occhio: il rapporto di
// contrasto col bianco della fila va da **6.30 (verde bosco)** a 15.46
// (inchiostro). **L'asticella è quindi 6.3, non il 4.5 di WCAG AA**: una
// tinta che passasse appena il minimo di legge starebbe comunque peggio
// della peggiore di queste, e nella fila si vedrebbe. Per questo
// «terracotta» (#A0522D, 5.62) e «senape» (#6E6420, 5.99) sono state provate
// e SCARTATE.
// (Fino al 06/09 l'asticella era 6.22, cioè l'ottone: tolto lui, il gradino
// più basso è salito da sé.)
//
// ⚠️ SECONDO CRITERIO, altrettanto vincolante: SI RIEMPIONO I BUCHI DELLA
// RUOTA, non si aggiungono vicini. Misurate le tinte già presenti, i soli
// vuoti veri erano tre — 80→152° (fra oliva e bosco), 209→296° (fra blu e
// prugna, il più largo di tutti) e 296→344° (fra prugna e bordeaux) — e sono
// esattamente prato, indaco e mora. Scartati perché quasi-doppioni, pur
// avendo il contrasto giusto: ink (vicino a navy), moss (a bosco), aubergine
// (a prugna), rust (a mattone e ottone) e azure a 196° (fra petrolio e blu ci
// sono 33°, non è un buco). Una fila in cui quattro coppie si somigliano non
// è più una scelta, è un quiz.
//
// ⚠️ QUANDO LA RUOTA È PIENA non si aggiungono tinte, si aggiunge
// PROFONDITÀ. Cercate cinque tinte nuove il 2026-09-06 con una ricerca a
// punto più lontano (distanza CIELAB da tutte quelle presenti), il risultato
// spingeva la saturazione al massimo — cioè tornava ai colori da segnaletica
// scartati dal criterio qui sotto: dentro il carattere della tavolozza, la
// ruota non ha più posto. Le cinque aggiunte sono quindi due VERSIONI
// PROFONDE di famiglie che c'erano (pino sotto bosco, inchiostro sotto blu),
// un NEUTRO freddo (ardesia) e due tinte spente (sabbia, rosa antico).
//
// ⚠️ IL METRO DELLA SOMIGLIANZA, e non è a occhio: distanza CIELAB **ΔE ≥
// 11.6**, che è la distanza della coppia più vicina che già convive nella
// fila (oliva/prato). Chi ne aggiunge una la misuri così. Scartate per questo,
// pur avendo il contrasto: talpa (11.3 da carbone), pietra (10.4), espresso
// (11.0), senape (10.4 da ottone — e comunque sotto il contrasto, 5.99).
//
// ⚠️ TERZO CRITERIO: la SATURAZIONE. Le tinte di questa fila stanno fra 0.43
// e 0.75; le stesse posizioni sulla ruota a saturazione piena (#B00B0B,
// #0B50B8) passano il contrasto ma sono colori da segnaletica, non da carta
// di ristorante. Le tre nuove sono state cercate dentro quella forbice.
//
// ⚠️ UN CODICE SI TOGLIE SOLO SE NESSUNO LO USA, e va verificato sul
// database prima — non a memoria. `partner_venues.accent` conserva il codice
// scelto, E LO CONSERVA ANCHE LO SCATTO PUBBLICATO: vanno guardati tutti e
// due, o un menù già in sala cambia colore da solo.
//
//   select name, accent, published_menu->>'accent' from partner_venues;
//
// L'OTTONE è stato tolto così il 2026-09-06 (sostituito dal grigio, su
// richiesta dell'utente): nessun locale lo usava, né in editor né in sala.
// ⚠️ Sul SITO invece resta (`ACCENTI` in landing/lib/render-menu.js): il
// portale smette di offrirlo, il renderer continua a saperlo disegnare. È
// l'asimmetria giusta — costa una riga e copre gli scatti che non abbiamo
// guardato, per esempio un locale nato fra la verifica e il rilascio.
//
// ⚠️ COPIA GEMELLA sul sito: ACCENTI in landing/lib/render-menu.js. Un colore
// aggiunto solo di qua non spegne niente ma **al tavolo ricade su carbone**
// (`ACCENTI[accent] || ACCENTI.charcoal`), quindi il ristoratore sceglierebbe
// una tinta che il suo cliente non vede. Si controlla con `npm run gemelle`.
// Nessuna migration: `partner_venues.accent` è testo libero di proposito
// (703), l'elenco chiuso vive qui.
// ------------------------------------------------------------------
export const MENU_ACCENTS = [
  // ⚠️ SEI, ED È UN RITORNO: dal 05/09 erano diciotto, ordinate per tinta.
  // Rimesse a sei il 2026-09-06 — «creano più confusione che utilità»: davanti
  // a diciotto pastiglie una scelta che si fa una volta sola diventa un
  // esercizio di gusto, e nessuna delle dodici in mezzo faceva qualcosa che
  // queste sei non facciano.
  //
  // ⚠️ LE ALTRE TREDICI RESTANO DISEGNABILI dal sito (ACCENTI in
  // landing/lib/render-menu.js). Un colore ritirato sparisce dalla SCELTA, non
  // dalla resa: uno scatto pubblicato conserva il codice con cui è nato, e se
  // il sito non lo conoscesse più quel menù cambierebbe colore da solo, in
  // sala, senza che nessuno l'abbia toccato. La differenza è dichiarata in
  // SOLO_SITO dentro scripts/gemelle.mjs.
  //
  // ⚠️ IL VERDE BOSCO È PRIMO dal 2026-09-16 (scelta dell'utente), e la
  // posizione 0 non è un dettaglio: DEFAULT_ACCENT legge di lì, ed è il
  // colore di TUTTI i menù senza abbonamento — cioè la faccia più vista del
  // prodotto, non più "come nasce un menù prima di essere sistemato".
  // Il valore deve restare uguale a venue_appearance_defaults() nel database
  // (migration 721): se i due divergono, il portale mostra un colore e il
  // tavolo un altro.
  { code: 'forest', hex: '#2E6B4F', it: 'Verde bosco', en: 'Forest green' },
  { code: 'charcoal', hex: '#333333', it: 'Carbone', en: 'Charcoal' },
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

// LE TINTE RITIRATE, che il portale deve ancora saper DISEGNARE anche se non
// le offre più. Senza, un locale rimasto su «verde prato» si vedrebbe carbone
// nell'editor mentre al tavolo resta verde: il ristoratore crederebbe di aver
// perso il suo colore, e cambiandolo lo perderebbe davvero.
//
// ⚠️ Sono le stesse tredici dichiarate in SOLO_SITO dentro scripts/gemelle.mjs
// e ancora presenti in ACCENTI su landing/lib/render-menu.js.
const ACCENTI_RITIRATI: Record<string, string> = {
  slate: '#3F4A5A',
  grey: '#5A5A5A',
  cocoa: '#5A3A2E',
  sand: '#6B5A3C',
  olive: '#4A5D23',
  grass: '#2F5E28',
  pine: '#1E3B2A',
  teal: '#1F5F5B',
  ink: '#1A2340',
  indigo: '#443A78',
  mulberry: '#78325E',
  wine: '#6E2438',
  rose: '#8C4A57',
};

export function accentHex(code: string): string {
  return (
    MENU_ACCENTS.find((a) => a.code === code)?.hex ??
    ACCENTI_RITIRATI[code] ??
    MENU_ACCENTS[0].hex
  );
}

// Una tinta ritirata ma ANCORA IN USO resta nella fila, in coda: toglierla
// sotto gli occhi di chi ce l'ha vorrebbe dire fargli sparire il suo colore
// senza spiegazioni. Stessa regola delle categorie nascoste che restano
// visibili quando un piatto le usa.
export function accentiSceglibili(inUso: string) {
  const offerte = MENU_ACCENTS.map((a) => ({ ...a }));
  if (offerte.some((a) => a.code === inUso)) return offerte;
  const hex = ACCENTI_RITIRATI[inUso];
  if (!hex) return offerte;
  return [...offerte, { code: inUso, hex, it: 'Tinta ritirata', en: 'Retired colour' }];
}

// ------------------------------------------------------------------
// IL LOGO NON STA PIÙ QUI (2026-09-02)
// Ci stava `logoDataUrl`, che riduceva il logo e lo restituiva come
// data-URL da mettere dentro la riga del locale. Adesso il logo è un file
// su Storage e passa da photos.ts (`uploadLogo`), che è il posto dove vive
// tutto ciò che si carica — stessa riduzione, altro posto dove finisce.
// Era già scritto qui che sarebbe successo.
// ------------------------------------------------------------------
