/**
 * Elenco centralizzato di tutte le restrizioni alimentari.
 *
 * Categorie:
 *   - diet:             diete (vegetariano, vegano, diabete)
 *   - eu_allergen:      14 allergeni EU obbligatori + favismo
 *   - intolerance:      intolleranze (istamina, nichel)
 *   - food_sensitivity: sensibilità alimentari comuni
 *
 * Per aggiungere una nuova voce, inserirla nel file sorgente appropriato
 * (allergens.ts, diets.ts, otherFoods.ts). Apparirà automaticamente qui.
 */

import { ALLERGENS } from './allergens';
import { DIETS } from './diets';
import { OTHER_FOODS } from './otherFoods';
import type { Language } from '../types';

export type FoodRestrictionCategory = 'diet' | 'eu_allergen' | 'intolerance' | 'food_sensitivity';

export interface FoodRestriction {
  id: string;
  category: FoodRestrictionCategory;
  icon?: string;
  translations: Record<Language, string>;
}

// ID delle diete (distinti dalle intolleranze che restano in DIETS)
const DIET_IDS = new Set(['vegetarian', 'vegan', 'diabetes']);

export const FOOD_RESTRICTIONS: readonly FoodRestriction[] = [
  // Diete (senza emoji)
  ...DIETS
    .filter(d => DIET_IDS.has(d.id))
    .map(d => ({ id: d.id, category: 'diet' as const, translations: d.translations })),

  // 14 allergeni EU + favismo
  ...ALLERGENS.map(a => ({
    id: a.id, category: 'eu_allergen' as const, icon: a.icon, translations: a.translations,
  })),

  // Intolleranze
  ...DIETS
    .filter(d => !DIET_IDS.has(d.id))
    .map(d => ({ id: d.id, category: 'intolerance' as const, icon: d.icon, translations: d.translations })),

  // Sensibilità alimentari (ordine alfabetico IT)
  ...[...OTHER_FOODS]
    .sort((a, b) => a.translations.it.localeCompare(b.translations.it, 'it'))
    .map(f => ({ id: f.id, category: 'food_sensitivity' as const, icon: f.icon, translations: f.translations })),
];

// ─── Helper ──────────────────────────────────────────────────────────────────

export function getRestrictionsByCategory(category: FoodRestrictionCategory): FoodRestriction[] {
  return FOOD_RESTRICTIONS.filter(r => r.category === category);
}

export function getRestrictionById(id: string): FoodRestriction | undefined {
  return FOOD_RESTRICTIONS.find(r => r.id === id);
}

/** ID che appartengono alla categoria "diet" */
export const DIET_RESTRICTION_IDS = new Set(
  FOOD_RESTRICTIONS.filter(r => r.category === 'diet').map(r => r.id),
);

/** ID che appartengono a intolleranze (istamina, nichel — salvate come DietId) */
export const INTOLERANCE_RESTRICTION_IDS = new Set(
  FOOD_RESTRICTIONS.filter(r => r.category === 'intolerance').map(r => r.id),
);
