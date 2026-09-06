// Le note del piatto: le cose che al tavolo vanno DETTE.
//
// Asse diverso dalle compatibilità (diets.ts). «Per vegani» dice a chi va bene
// il piatto; «surgelato» dice un fatto sul prodotto, e vale per chiunque.
// Tenerle separate serve a non far dire al ristoratore, con un clic distratto,
// una cosa che non può sostenere.
//
// Codici e non testo libero, per la stessa ragione degli allergeni: si
// traducono da soli in ogni lingua. Se il ristoratore le scrivesse nella
// descrizione, resterebbero in italiano davanti al cliente straniero — che è
// il cliente per cui esiste l'app.
//
// ⚠️ Restano DICHIARAZIONI DEL RISTORANTE: noi le mostriamo e non le
// verifichiamo, come tutto il resto del prodotto.
//
// Codici allineati al CHECK di partner_dishes.notes (713).
// ⚠️ COPIA GEMELLA in landing/lib/dish-notes.js: le confronta `npm run gemelle`.

import type { CategoryLanguage } from './categories';

export interface DishNote {
  code: string;
  // vero = nasce da un obbligo del ristoratore, non da una gentilezza.
  // Cambia solo come sono raggruppate nella maschera: al tavolo si vedono uguali.
  legal: boolean;
  names: Record<CategoryLanguage, string>;
  // il disegno, senza il tag <svg>: lo avvolge chi lo mostra, con la sua misura.
  icon: string;
}

// ⚠️ STESSA GRIGLIA DEGLI ALLERGENI (allergenIcons.ts): 24×24, tratto 2,
// contenuto di un <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">.
// Non è una preferenza: le due famiglie compaiono nella stessa riga sotto il
// piatto, e a 16px un tratto più sottile si vede subito che è di un altro set.
// Vale anche la regola imparata lì: a questa misura conta la SAGOMA, ogni
// linea interna che non cambia il profilo è rumore.
//
// Monocromatiche perché il ristoratore sceglie la tinta del suo menù: un'icona
// colorata a modo nostro litiga con ogni tavolozza tranne una.

export const DISH_NOTES: DishNote[] = [
  {
    code: 'frozen',
    legal: true,
    names: {
      it: 'Surgelato', en: 'Frozen', fr: 'Surgelé', de: 'Tiefgekühlt', es: 'Congelado',
      pt: 'Congelado', nl: 'Diepvries', pl: 'Mrożone', ru: 'Замороженное', sv: 'Fryst',
      zh: '冷冻', ja: '冷凍', ko: '냉동', th: 'แช่แข็ง', ar: 'مجمّد',
    },
    // Tre assi incrociati, senza ramificazioni: alla misura del tavolo i
    // rametti impastano, e questa sagoma è comunque l'ASTERISCO con cui i
    // menù di carta segnano il surgelato da sempre. Niente da imparare.
    icon: '<path d="M12 3.5v17"/><path d="m4.6 7.75 14.8 8.5"/><path d="M19.4 7.75 4.6 16.25"/>',
  },
  {
    code: 'defrosted',
    legal: true,
    names: {
      it: 'Decongelato', en: 'Defrosted', fr: 'Décongelé', de: 'Aufgetaut', es: 'Descongelado',
      pt: 'Descongelado', nl: 'Ontdooid', pl: 'Rozmrożone', ru: 'Размороженное', sv: 'Upptinat',
      zh: '解冻', ja: '解凍', ko: '해동', th: 'ละลายน้ำแข็งแล้ว', ar: 'مذاب',
    },
    // Mezzo fiocco che cola in una goccia: «era congelato, adesso non più».
    // La goccia da sola sarebbe il latte, il fiocco da solo il surgelato:
    // qui il senso sta nei due insieme.
    icon: '<path d="M8.5 3v10"/><path d="m4.2 5.5 8.6 5"/><path d="m12.8 5.5-8.6 5"/><path d="M16.5 12.5c2.6 3.3 3.6 4.9 3.6 6.1a3.6 3.6 0 0 1-7.2 0c0-1.2 1-2.8 3.6-6.1Z"/>',
  },
  {
    code: 'blast_frozen',
    legal: true,
    names: {
      it: 'Abbattuto', en: 'Blast-frozen', fr: 'Congelé à cœur', de: 'Schockgefrostet', es: 'Abatido',
      pt: 'Abatido', nl: 'Schokgevroren', pl: 'Mrożone szokowo', ru: 'Шоковая заморозка', sv: 'Chockfryst',
      zh: '急冻处理', ja: '瞬間冷凍', ko: '급속 냉동', th: 'แช่แข็งฉับพลัน', ar: 'مجمّد صدمياً',
    },
    // Pesce col fiocco. Senza il pesce sarebbe il terzo fiocco della fila e
    // non si distinguerebbe più dagli altri due; ed è il pesce crudo la
    // ragione per cui questa nota esiste (Reg. CE 853/2004).
    icon: '<path d="M2.5 15c3.2-4.8 9.4-4.8 12.6 0-3.2 4.8-9.4 4.8-12.6 0Z"/><path d="m15.1 15 4.4-2.9v5.8Z"/><path d="M17.8 2.4v5.8"/><path d="m15.3 3.8 5 2.9"/><path d="m20.3 3.8-5 2.9"/>',
  },
  {
    code: 'raw',
    legal: false,
    names: {
      it: 'Crudo', en: 'Raw', fr: 'Cru', de: 'Roh', es: 'Crudo',
      pt: 'Cru', nl: 'Rauw', pl: 'Surowe', ru: 'Сырое', sv: 'Rått',
      zh: '生食', ja: '生', ko: '생식', th: 'ดิบ', ar: 'نيء',
    },
    // Fiamma sbarrata: «non cotto». L'uovo sarebbe stato la scelta ovvia, ma
    // l'icona dell'allergene uova è già un uovo e nella stessa riga si
    // confonderebbero. La fiamma da sola sarebbe la goccia del latte: è la
    // sbarra a dire la cosa.
    icon: '<path d="M12 4.4c3.6 3 5.6 5.8 5.6 8.3a5.6 5.6 0 1 1-11.2 0c0-2.5 2-5.3 5.6-8.3Z"/><path d="M4.6 19.4 19.4 4.6"/>',
  },
  {
    code: 'spicy',
    legal: false,
    names: {
      it: 'Piccante', en: 'Spicy', fr: 'Épicé', de: 'Scharf', es: 'Picante',
      pt: 'Picante', nl: 'Pittig', pl: 'Ostre', ru: 'Острое', sv: 'Stark',
      zh: '辣', ja: '辛口', ko: '매운맛', th: 'เผ็ด', ar: 'حار',
    },
    icon: '<path d="M17.4 7.4c.6 5.4-3.3 11.1-8.4 12.3-1.5.3-2.7-.9-2.1-2.3 1.8-4.5 6-8.9 10.5-10Z"/><path d="M17.4 7.4c.3-1.7 1.4-3 3-3.7"/>',
  },
  {
    code: 'alcohol',
    legal: false,
    names: {
      it: 'Contiene alcol', en: 'Contains alcohol', fr: 'Contient de l’alcool', de: 'Enthält Alkohol', es: 'Contiene alcohol',
      pt: 'Contém álcool', nl: 'Bevat alcohol', pl: 'Zawiera alkohol', ru: 'Содержит алкоголь', sv: 'Innehåller alkohol',
      zh: '含酒精', ja: 'アルコール入り', ko: '알코올 함유', th: 'มีแอลกอฮอล์', ar: 'يحتوي على كحول',
    },
    // Coppa da cocktail: il calice da vino ha lo stelo sottile e a questa
    // misura sparisce, il triangolo no.
    icon: '<path d="M4.8 5.1h14.4L12 13.3Z"/><path d="M12 13.3v5.3"/><path d="M8.1 18.6h7.8"/>',
  },
];

export function noteName(code: string, locale: string): string {
  const found = DISH_NOTES.find((n) => n.code === code);
  if (!found) return code;
  const lang = (Object.keys(found.names) as CategoryLanguage[]).includes(locale as CategoryLanguage)
    ? (locale as CategoryLanguage)
    : 'en';
  return found.names[lang];
}

export function noteIcon(code: string): string {
  return DISH_NOTES.find((n) => n.code === code)?.icon ?? '';
}

// Nell'ordine dichiarato, non in quello in cui il ristoratore ha spuntato le
// caselle: due piatti con le stesse note devono leggersi uguali.
export function sortNotes(codes: string[]): string[] {
  return DISH_NOTES.filter((n) => codes.includes(n.code)).map((n) => n.code);
}
