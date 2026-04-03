/**
 * Implicazioni logiche tra restrizioni alimentari.
 *
 * Se un reviewer ha la restrizione `source`, la sua review positiva
 * copre implicitamente anche le restrizioni in `covers`.
 *
 * Esempio: un utente vegano non consuma uova, latte, pesce, crostacei
 * né molluschi. Una sua review positiva implica che il ristorante
 * è in grado di gestire anche quelle allergie.
 *
 * La mappa è unidirezionale: vegan -> eggs, ma NON eggs -> vegan.
 *
 * ── Criteri per aggiungere un'implicazione ──────────────────────────
 *
 * Un'implicazione è valida SOLO se la restrizione source GARANTISCE
 * l'assenza dell'ingrediente target. In caso di dubbio, NON aggiungere:
 * un'implicazione sbagliata è un rischio per la salute.
 *
 * Implicazioni valutate e SCARTATE:
 *   - vegetarian -> fish/crustaceans/mollusks
 *     Motivo: lo snapshot non salva il livello (no_meat permette pesce)
 *   - nickel -> nuts
 *     Motivo: il ristorante evita noci per il nichel, non gestisce
 *     necessariamente la cross-contaminazione proteica
 *   - histamine -> fish
 *     Motivo: l'istaminico evita solo pesce conservato/stagionato
 *   - peanuts <-> lupin
 *     Motivo: cross-reattività probabile ma non garantita
 *   - diabetes -> (nessun allergene)
 *     Motivo: nessun overlap con allergeni EU
 *
 * ── Come estendere ──────────────────────────────────────────────────
 *
 * Per nuove restrizioni (es. no_pork, halal, kosher):
 *   1. Aggiungere il tipo in types/index.ts
 *   2. Aggiungere le righe qui sotto
 *   3. Aggiungere le stesse righe nella CTE `implications` della
 *      migrazione SQL (get_restaurants_for_my_needs)
 *
 * Esempio futuro:
 *   { source: 'vegan', covers: 'no_pork' }  // vegano non mangia maiale
 *   { source: 'halal', covers: 'no_pork' }  // halal esclude maiale
 */

import type { AllergenId, DietId } from '../types';

type RestrictionId = AllergenId | DietId;

export interface Implication {
  source: RestrictionId;
  covers: RestrictionId;
}

export const IMPLICATIONS: Implication[] = [
  // Vegano: nessun prodotto animale
  { source: 'vegan', covers: 'vegetarian' },
  { source: 'vegan', covers: 'eggs' },
  { source: 'vegan', covers: 'milk' },
  { source: 'vegan', covers: 'fish' },
  { source: 'vegan', covers: 'crustaceans' },
  { source: 'vegan', covers: 'mollusks' },
];

// ── Helper functions ─────────────────────────────────────────────────

/** Mappa source -> covers[] (pre-calcolata) */
export const forwardMap = new Map<string, string[]>();
/** Mappa covers -> source[] (reverse, pre-calcolata) */
const reverseMap = new Map<string, string[]>();

for (const { source, covers } of IMPLICATIONS) {
  forwardMap.set(source, [...(forwardMap.get(source) ?? []), covers]);
  reverseMap.set(covers, [...(reverseMap.get(covers) ?? []), source]);
}

/**
 * Dato uno snapshot di review, restituisce tutte le restrizioni
 * coperte (dirette + dedotte).
 */
export function getExpandedCoverage(snapshot: string[]): Set<string> {
  const expanded = new Set(snapshot);
  for (const item of snapshot) {
    const implied = forwardMap.get(item);
    if (implied) implied.forEach(r => expanded.add(r));
  }
  return expanded;
}

/**
 * Per un bisogno dell'utente, restituisce quali restrizioni nel
 * reviewer lo coprirebbero indirettamente.
 * Es: getImplicationSources('eggs') -> ['vegan']
 */
export function getImplicationSources(need: string): string[] {
  return reverseMap.get(need) ?? [];
}
