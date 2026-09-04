// L'ORDINE DELLE PASTIGLIE del filtro, sul menù che legge il cliente.
//
// Fino al 2026-09-01 era quello delle costanti: prima TUTTI gli allergeni
// (gluten, milk, eggs, nuts…) e poi TUTTE le esigenze, su una riga sola che
// scorre. Chi è vegetariano doveva scorrere oltre nove allergeni per
// trovarsi, e con la riga che scorre voleva dire non trovarsi affatto.
//
// Qui la graduatoria è UNA SOLA e MESCOLATA: al tavolo nessuno pensa
// "allergene o esigenza", pensa alla cosa sua. La separazione fra le due
// famiglie resta dov'è utile — nel pannello "Filtri", dove c'è spazio per due
// titoletti e serve a scorrere l'elenco intero.
//
// ED È FISSA, non calcolata sul menù che si sta guardando: chi ha
// un'allergia cerca la sua parola, e la trova sempre nello stesso punto in
// ogni ristorante. Una graduatoria che cambia di locale in locale
// risparmierebbe mezzo dito di scorrimento e costerebbe l'abitudine.
import { ALLERGENS } from './allergens';
import { DIETS, dietNeedName } from './diets';

export type FilterKind = 'allergens' | 'diets';

export interface FilterPill {
  kind: FilterKind;
  code: string;
}

// Le prime della fila: le due allergie più diffuse e le due esigenze che
// riguardano un menù intero, poi il resto degli allergeni comuni.
const PRIMI: FilterPill[] = [
  { kind: 'allergens', code: 'gluten' },
  { kind: 'diets', code: 'vegetarian' },
  { kind: 'diets', code: 'vegan' },
  { kind: 'allergens', code: 'milk' },
  { kind: 'allergens', code: 'eggs' },
  { kind: 'allergens', code: 'nuts' },
  { kind: 'allergens', code: 'peanuts' },
];

function primo(kind: FilterKind, code: string): boolean {
  return PRIMI.some((p) => p.kind === kind && p.code === code);
}

// Dopo i primi vengono gli altri allergeni e poi le altre esigenze,
// ciascuno nell'ordine della sua costante — che per gli allergeni è già
// quello del regolamento, e per le esigenze quello dell'app.
export const FILTER_ORDER: FilterPill[] = [
  ...PRIMI,
  ...ALLERGENS.filter((a) => !primo('allergens', a.code)).map((a) => ({
    kind: 'allergens' as const,
    code: a.code,
  })),
  ...DIETS.filter((t) => !primo('diets', t.code)).map((t) => ({
    kind: 'diets' as const,
    code: t.code,
  })),
];

function posizione(pill: FilterPill): number {
  const i = FILTER_ORDER.findIndex((p) => p.kind === pill.kind && p.code === pill.code);
  // Un codice che non è in graduatoria (arriverà da un allergene aggiunto
  // all'app e non ancora qui) va in fondo invece che sparire
  return i < 0 ? FILTER_ORDER.length : i;
}

export function inOrdine(pills: FilterPill[]): FilterPill[] {
  return [...pills].sort((a, b) => posizione(a) - posizione(b));
}

// ⚠️ QUI C'ERA `filaPastiglie`, che portava in testa le pastiglie accese:
// tolta il 2026-09-04, perché la fila cambiava sotto il dito. La graduatoria
// è la stessa sempre, accese o spente (DIGITAL_MENU.md, Temi 18 e 28).

// L'etichetta che si legge sulla pastiglia. Il prefisso arriva da fuori
// perché è testo tradotto ("Senza" / "Without") e i dizionari stanno nelle
// schermate: qui c'è la regola — gli allergeni si dicono per negazione, le
// esigenze col nome con cui l'utente si descrive.
export function filterLabel(
  pill: FilterPill,
  locale: 'it' | 'en',
  withoutPrefix: string
): string {
  if (pill.kind === 'diets') return dietNeedName(pill.code, locale);
  const a = ALLERGENS.find((x) => x.code === pill.code);
  return `${withoutPrefix} ${(a ? a[locale] : pill.code).toLowerCase()}`;
}
