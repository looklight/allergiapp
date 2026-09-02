// L'ORDINE DELLE PASTIGLIE del filtro, sul menù che legge il cliente.
//
// Copia fedele di partner/src/lib/menuFilters.ts, e la copia è voluta: il
// portale è React e TypeScript, questo sito è JavaScript semplice, e la fonte
// unica costerebbe un pacchetto condiviso fra due progetti che si rilasciano
// separatamente. ⚠️ Cambiando la graduatoria di là, va cambiata anche qui: se
// le due divergono, il ristoratore vede nell'anteprima un ordine e il suo
// cliente ne trova un altro.
//
// La graduatoria è UNA SOLA e MESCOLATA: al tavolo nessuno pensa "allergene o
// esigenza", pensa alla cosa sua. Ed è FISSA, non calcolata sul menù che si
// sta guardando — chi ha un'allergia cerca la sua parola e la trova sempre
// nello stesso punto, in ogni ristorante.
const { ALLERGEN_LABELS, DIET_LABELS } = require('./labels');

// Le prime della fila: le due allergie più diffuse e le due esigenze che
// riguardano un menù intero, poi il resto degli allergeni comuni.
const PRIMI = [
  { kind: 'allergens', code: 'gluten' },
  { kind: 'diets', code: 'vegetarian' },
  { kind: 'diets', code: 'vegan' },
  { kind: 'allergens', code: 'milk' },
  { kind: 'allergens', code: 'eggs' },
  { kind: 'allergens', code: 'nuts' },
  { kind: 'allergens', code: 'peanuts' },
];

function primo(kind, code) {
  return PRIMI.some((p) => p.kind === kind && p.code === code);
}

// Dopo i primi vengono gli altri allergeni e poi le altre esigenze, ciascuno
// nell'ordine della sua costante — che per gli allergeni è quello del
// regolamento europeo.
const FILTER_ORDER = [
  ...PRIMI,
  ...Object.keys(ALLERGEN_LABELS)
    .filter((code) => !primo('allergens', code))
    .map((code) => ({ kind: 'allergens', code })),
  ...Object.keys(DIET_LABELS)
    .filter((code) => !primo('diets', code))
    .map((code) => ({ kind: 'diets', code })),
];

function posizione(pill) {
  const i = FILTER_ORDER.findIndex((p) => p.kind === pill.kind && p.code === pill.code);
  // Un codice che non è in graduatoria (arriverà da un allergene aggiunto
  // all'app e non ancora qui) va in fondo invece che sparire
  return i < 0 ? FILTER_ORDER.length : i;
}

function inOrdine(pills) {
  return [...pills].sort((a, b) => posizione(a) - posizione(b));
}

module.exports = { FILTER_ORDER, inOrdine };
