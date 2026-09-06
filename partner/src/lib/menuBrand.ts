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
  // ⚠️ L'ORDINE: prima i due NEUTRI, poi la ruota dei colori dal rosso al
  // rosa passando per giallo, verde, blu e viola. Non l'ordine di arrivo:
  // una fila ordinata per tinta si scorre come uno spettro, e le coppie
  // vicine (bosco/pino, blu/inchiostro) si leggono come famiglie invece che
  // come doppioni sparsi. Il carbone resta PRIMO: DEFAULT_ACCENT legge la
  // posizione 0.
  { code: 'charcoal', hex: '#333333', it: 'Carbone', en: 'Charcoal' },      // neutro
  { code: 'slate', hex: '#3F4A5A', it: 'Ardesia', en: 'Slate' },            // neutro freddo
  { code: 'grey', hex: '#5A5A5A', it: 'Grigio', en: 'Grey' },               // neutro medio
  { code: 'brick', hex: '#8C3A2B', it: 'Mattone', en: 'Brick' },            //   9°
  { code: 'cocoa', hex: '#5A3A2E', it: 'Cacao', en: 'Cocoa' },              //  16°
  { code: 'sand', hex: '#6B5A3C', it: 'Sabbia', en: 'Sand' },               //  40°, più spenta
  { code: 'olive', hex: '#4A5D23', it: 'Verde oliva', en: 'Olive' },        //  80°
  { code: 'grass', hex: '#2F5E28', it: 'Verde prato', en: 'Grass green' },  // 112°
  { code: 'pine', hex: '#1E3B2A', it: 'Verde pino', en: 'Pine' },           // 145°, profondo
  { code: 'forest', hex: '#2E6B4F', it: 'Verde bosco', en: 'Forest green' },// 152°
  { code: 'teal', hex: '#1F5F5B', it: 'Petrolio', en: 'Teal' },             // 176°
  { code: 'navy', hex: '#1F4E79', it: 'Blu notte', en: 'Navy' },            // 209°
  { code: 'ink', hex: '#1A2340', it: 'Inchiostro', en: 'Ink' },             // 227°, profondo
  { code: 'indigo', hex: '#443A78', it: 'Indaco', en: 'Indigo' },           // 250°
  { code: 'plum', hex: '#6B3F6E', it: 'Prugna', en: 'Plum' },               // 296°
  { code: 'mulberry', hex: '#78325E', it: 'Mora', en: 'Mulberry' },         // 322°
  { code: 'wine', hex: '#6E2438', it: 'Bordeaux', en: 'Wine' },             // 344°
  { code: 'rose', hex: '#8C4A57', it: 'Rosa antico', en: 'Dusty rose' },    // 348°, più chiara
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
