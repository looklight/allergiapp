// Le note del piatto: le cose che al tavolo vanno DETTE — surgelato,
// decongelato, abbattuto, crudo, piccante, alcol e le altre.
//
// Asse diverso dalle compatibilita' (constants/diets.ts): «per vegani» dice a
// chi va bene il piatto, «surgelato» dice un fatto sul prodotto e vale per
// chiunque. Per questo nella scheda stanno IN FONDO e sono grigie: il verde
// dice «va bene per te», e «contiene alcol» non e' una buona notizia per
// nessuno.
//
// COPIA GEMELLA di partner/src/lib/dishNotes.ts, senza le icone: quelle
// restano nel portale finche' non e' deciso come si vedono qui (v. TODO.md,
// «Decisioni aperte sulle icone del piatto»).
//
// ⚠️ I codici devono combaciare col CHECK di partner_dishes.notes (713).

import { CATEGORY_LANGUAGES, type CategoryLanguage } from './dishCategories';

export interface DishNote {
  code: string;
  names: Record<CategoryLanguage, string>;
}

export const DISH_NOTES: DishNote[] = [
  {
    code: 'frozen',
    names: {
      it: 'Surgelato', en: 'Frozen', fr: 'Surgelé', de: 'Tiefgekühlt', es: 'Congelado',
      pt: 'Congelado', nl: 'Diepvries', pl: 'Mrożone', ru: 'Замороженное', sv: 'Fryst',
      zh: '冷冻', ja: '冷凍', ko: '냉동', th: 'แช่แข็ง', ar: 'مجمّد',
    },
  },
  {
    code: 'defrosted',
    names: {
      it: 'Decongelato', en: 'Defrosted', fr: 'Décongelé', de: 'Aufgetaut', es: 'Descongelado',
      pt: 'Descongelado', nl: 'Ontdooid', pl: 'Rozmrożone', ru: 'Размороженное', sv: 'Upptinat',
      zh: '解冻', ja: '解凍', ko: '해동', th: 'ละลายน้ำแข็งแล้ว', ar: 'مذاب',
    },
  },
  {
    code: 'blast_frozen',
    names: {
      it: 'Abbattuto', en: 'Blast-frozen', fr: 'Congelé à cœur', de: 'Schockgefrostet', es: 'Abatido',
      pt: 'Abatido', nl: 'Schokgevroren', pl: 'Mrożone szokowo', ru: 'Шоковая заморозка', sv: 'Chockfryst',
      zh: '急冻处理', ja: '瞬間冷凍', ko: '급속 냉동', th: 'แช่แข็งฉับพลัน', ar: 'مجمّد صدمياً',
    },
  },
  {
    code: 'raw',
    names: {
      it: 'Crudo', en: 'Raw', fr: 'Cru', de: 'Roh', es: 'Crudo',
      pt: 'Cru', nl: 'Rauw', pl: 'Surowe', ru: 'Сырое', sv: 'Rått',
      zh: '生食', ja: '生', ko: '생식', th: 'ดิบ', ar: 'نيء',
    },
  },
  {
    code: 'spicy',
    names: {
      it: 'Piccante', en: 'Spicy', fr: 'Épicé', de: 'Scharf', es: 'Picante',
      pt: 'Picante', nl: 'Pittig', pl: 'Ostre', ru: 'Острое', sv: 'Stark',
      zh: '辣', ja: '辛口', ko: '매운맛', th: 'เผ็ด', ar: 'حار',
    },
  },
  {
    code: 'alcohol',
    names: {
      it: 'Contiene alcol', en: 'Contains alcohol', fr: 'Contient de l’alcool', de: 'Enthält Alkohol', es: 'Contiene alcohol',
      pt: 'Contém álcool', nl: 'Bevat alcohol', pl: 'Zawiera alkohol', ru: 'Содержит алкоголь', sv: 'Innehåller alkohol',
      zh: '含酒精', ja: 'アルコール入り', ko: '알코올 함유', th: 'มีแอลกอฮอล์', ar: 'يحتوي على كحول',
    },
  },
];

export function noteName(code: string, locale: string): string {
  const found = DISH_NOTES.find((n) => n.code === code);
  if (!found) return code;
  const lang = (CATEGORY_LANGUAGES as readonly string[]).includes(locale)
    ? (locale as CategoryLanguage)
    : 'en';
  return found.names[lang];
}

// Nell'ordine dichiarato qui, non in quello in cui il ristoratore ha spuntato
// le caselle: due piatti con le stesse note devono leggersi uguali.
export function sortNotes(codes: string[]): string[] {
  return DISH_NOTES.filter((n) => codes.includes(n.code)).map((n) => n.code);
}
