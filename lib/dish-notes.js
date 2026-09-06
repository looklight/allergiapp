// LE NOTE DEL PIATTO al tavolo: copia gemella di
// allergiapp/partner/src/lib/dishNotes.ts.
//
// Perché due volte e non un pacchetto condiviso: il portale e il sito sono due
// progetti che si rilasciano separatamente, e un pacchetto vorrebbe dire un
// passo di build in mezzo e due treni legati (v. la testa di gemelle.mjs).
// Le tiene allineate `npm run gemelle` dentro partner/.
//
// ⚠️ NON MODIFICARE A MANO SOLO QUI: la copia del portale è quella che il
// ristoratore vede mentre spunta le caselle, questa è quella che il cliente
// legge al tavolo. Se divergono, il ristoratore dichiara una cosa e il tavolo
// ne legge un'altra.
//
// Griglia delle icone 24×24, tratto 2: la stessa degli allergeni.

const DISH_NOTES = [
  {
    code: 'frozen',
    legal: true,
    names: {
      it: 'Surgelato',
      en: 'Frozen',
      fr: 'Surgelé',
      de: 'Tiefgekühlt',
      es: 'Congelado',
      pt: 'Congelado',
      nl: 'Diepvries',
      pl: 'Mrożone',
      ru: 'Замороженное',
      sv: 'Fryst',
      zh: '冷冻',
      ja: '冷凍',
      ko: '냉동',
      th: 'แช่แข็ง',
      ar: 'مجمّد',
    },
    icon: '<path d="M12 3.5v17"/><path d="m4.6 7.75 14.8 8.5"/><path d="M19.4 7.75 4.6 16.25"/>',
  },
  {
    code: 'defrosted',
    legal: true,
    names: {
      it: 'Decongelato',
      en: 'Defrosted',
      fr: 'Décongelé',
      de: 'Aufgetaut',
      es: 'Descongelado',
      pt: 'Descongelado',
      nl: 'Ontdooid',
      pl: 'Rozmrożone',
      ru: 'Размороженное',
      sv: 'Upptinat',
      zh: '解冻',
      ja: '解凍',
      ko: '해동',
      th: 'ละลายน้ำแข็งแล้ว',
      ar: 'مذاب',
    },
    icon: '<path d="M8.5 3v10"/><path d="m4.2 5.5 8.6 5"/><path d="m12.8 5.5-8.6 5"/><path d="M16.5 12.5c2.6 3.3 3.6 4.9 3.6 6.1a3.6 3.6 0 0 1-7.2 0c0-1.2 1-2.8 3.6-6.1Z"/>',
  },
  {
    code: 'blast_frozen',
    legal: true,
    names: {
      it: 'Abbattuto',
      en: 'Blast-frozen',
      fr: 'Congelé à cœur',
      de: 'Schockgefrostet',
      es: 'Abatido',
      pt: 'Abatido',
      nl: 'Schokgevroren',
      pl: 'Mrożone szokowo',
      ru: 'Шоковая заморозка',
      sv: 'Chockfryst',
      zh: '急冻处理',
      ja: '瞬間冷凍',
      ko: '급속 냉동',
      th: 'แช่แข็งฉับพลัน',
      ar: 'مجمّد صدمياً',
    },
    icon: '<path d="M2.5 15c3.2-4.8 9.4-4.8 12.6 0-3.2 4.8-9.4 4.8-12.6 0Z"/><path d="m15.1 15 4.4-2.9v5.8Z"/><path d="M17.8 2.4v5.8"/><path d="m15.3 3.8 5 2.9"/><path d="m20.3 3.8-5 2.9"/>',
  },
  {
    code: 'raw',
    legal: false,
    names: {
      it: 'Crudo',
      en: 'Raw',
      fr: 'Cru',
      de: 'Roh',
      es: 'Crudo',
      pt: 'Cru',
      nl: 'Rauw',
      pl: 'Surowe',
      ru: 'Сырое',
      sv: 'Rått',
      zh: '生食',
      ja: '生',
      ko: '생식',
      th: 'ดิบ',
      ar: 'نيء',
    },
    icon: '<path d="M12 4.4c3.6 3 5.6 5.8 5.6 8.3a5.6 5.6 0 1 1-11.2 0c0-2.5 2-5.3 5.6-8.3Z"/><path d="M4.6 19.4 19.4 4.6"/>',
  },
  {
    code: 'spicy',
    legal: false,
    names: {
      it: 'Piccante',
      en: 'Spicy',
      fr: 'Épicé',
      de: 'Scharf',
      es: 'Picante',
      pt: 'Picante',
      nl: 'Pittig',
      pl: 'Ostre',
      ru: 'Острое',
      sv: 'Stark',
      zh: '辣',
      ja: '辛口',
      ko: '매운맛',
      th: 'เผ็ด',
      ar: 'حار',
    },
    icon: '<path d="M17.4 7.4c.6 5.4-3.3 11.1-8.4 12.3-1.5.3-2.7-.9-2.1-2.3 1.8-4.5 6-8.9 10.5-10Z"/><path d="M17.4 7.4c.3-1.7 1.4-3 3-3.7"/>',
  },
  {
    code: 'alcohol',
    legal: false,
    names: {
      it: 'Contiene alcol',
      en: 'Contains alcohol',
      fr: 'Contient de l’alcool',
      de: 'Enthält Alkohol',
      es: 'Contiene alcohol',
      pt: 'Contém álcool',
      nl: 'Bevat alcohol',
      pl: 'Zawiera alkohol',
      ru: 'Содержит алкоголь',
      sv: 'Innehåller alkohol',
      zh: '含酒精',
      ja: 'アルコール入り',
      ko: '알코올 함유',
      th: 'มีแอลกอฮอล์',
      ar: 'يحتوي على كحول',
    },
    icon: '<path d="M4.8 5.1h14.4L12 13.3Z"/><path d="M12 13.3v5.3"/><path d="M8.1 18.6h7.8"/>',
  },
];

// L'ordine è quello dichiarato qui sopra, non quello in cui il ristoratore ha
// spuntato: due piatti con le stesse note devono leggersi uguali.
function notesOf(item) {
  const dichiarate = item.notes || [];
  return DISH_NOTES.filter((n) => dichiarate.includes(n.code));
}

function noteName(nota, locale) {
  return nota.names[locale] || nota.names.en;
}

module.exports = { DISH_NOTES, notesOf, noteName };
