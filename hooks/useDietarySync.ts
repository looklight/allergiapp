/**
 * Sync bidirezionale tra AppContext (AsyncStorage) e AuthContext (Supabase profiles).
 *
 * Direzione 1 — Supabase → AppContext: al login / profile refresh
 * Direzione 2 — AppContext → Supabase: su modifica locale (debounced 500ms)
 *
 * Chiamare una sola volta in AppContent (_layout.tsx).
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../contexts/AppContext';
import { AuthService } from '../services/auth';
import { ALLERGENS } from '../constants/allergens';
import type { AllergenId } from '../types';
import type { OtherFoodId } from '../constants/otherFoods';
import type { DietModeId, VegetarianLevel } from '../constants/dietModes';
import { DEFAULT_VEGETARIAN_LEVEL } from '../constants/dietModes';

// ─── Helper: set di AllergenId conosciuti ───────────────────────────────────
const ALLERGEN_ID_SET = new Set<string>(ALLERGENS.map(a => a.id));

// ─── Helper: confronto array ignorando ordine ──────────────────────────────
function setsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every(x => setB.has(x));
}

// ─── Mapping: Supabase dietary_preferences → DietModeId + VegetarianLevel ──
function mapDietsToModes(supabaseDiets: readonly string[]): {
  dietModes: DietModeId[];
  vegetarianLevel: VegetarianLevel;
} {
  const dietModes: DietModeId[] = [];
  let vegetarianLevel: VegetarianLevel = DEFAULT_VEGETARIAN_LEVEL;

  for (const d of supabaseDiets) {
    switch (d) {
      case 'vegan':
        if (!dietModes.includes('vegetarian')) dietModes.push('vegetarian');
        vegetarianLevel = 'no_animal_products';
        break;
      case 'vegetarian':
        if (!dietModes.includes('vegetarian')) dietModes.push('vegetarian');
        // vegetarianLevel rimane default (no_meat) se non c'è anche 'vegan'
        break;
      case 'nickel':
      case 'histamine':
      case 'diabetes':
        dietModes.push(d);
        break;
      // Ignora DietId sconosciuti
    }
  }

  return { dietModes, vegetarianLevel };
}

// ─── Mapping: DietModeId + VegetarianLevel → Supabase dietary_preferences ──
function mapModesToDiets(
  dietModes: readonly DietModeId[],
  vegetarianLevel: VegetarianLevel,
): string[] {
  const diets: string[] = [];

  for (const m of dietModes) {
    switch (m) {
      case 'vegetarian':
        diets.push(vegetarianLevel === 'no_animal_products' ? 'vegan' : 'vegetarian');
        break;
      case 'nickel':
      case 'histamine':
      case 'diabetes':
        diets.push(m);
        break;
      // 'pregnancy' → solo locale, non sincronizzato
    }
  }

  return diets;
}

// ─── Partizionamento allergens Supabase → AllergenId + OtherFoodId ──────────
function partitionAllergens(supabaseAllergens: readonly string[]): {
  allergenIds: AllergenId[];
  otherFoodIds: OtherFoodId[];
} {
  const allergenIds: AllergenId[] = [];
  const otherFoodIds: OtherFoodId[] = [];

  for (const id of supabaseAllergens) {
    if (ALLERGEN_ID_SET.has(id)) {
      allergenIds.push(id as AllergenId);
    } else {
      otherFoodIds.push(id as OtherFoodId);
    }
  }

  return { allergenIds, otherFoodIds };
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useDietarySync() {
  const { user, userProfile, refreshProfile } = useAuth();
  const {
    selectedAllergens,
    selectedOtherFoods,
    activeDietModes,
    vegetarianLevel,
    setSelectedAllergens,
    setSelectedOtherFoods,
    setActiveDietModes,
    setVegetarianLevel,
  } = useAppContext();

  // Ultimo stato sincronizzato — usato per prevenire echo loops
  const lastSyncedRef = useRef<{ allergens: string[]; diets: string[] } | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Ref correnti per l'effetto AppContext → Supabase (evita dipendenze instabili)
  const allergensRef = useRef(selectedAllergens);
  const otherFoodsRef = useRef(selectedOtherFoods);
  const dietModesRef = useRef(activeDietModes);
  const vegLevelRef = useRef(vegetarianLevel);
  allergensRef.current = selectedAllergens;
  otherFoodsRef.current = selectedOtherFoods;
  dietModesRef.current = activeDietModes;
  vegLevelRef.current = vegetarianLevel;

  // ─── Direzione 1: Supabase → AppContext ─────────────────────────────────
  useEffect(() => {
    if (!userProfile || !user) return;

    const remoteAllergens = userProfile.allergens ?? [];
    const remoteDiets = userProfile.dietary_preferences ?? [];
    const remoteIsEmpty = remoteAllergens.length === 0 && remoteDiets.length === 0;

    // Se Supabase è vuoto ma AppContext ha dati → migra locale → Supabase
    const localAllergens = [...allergensRef.current, ...otherFoodsRef.current];
    const localDiets = mapModesToDiets(dietModesRef.current, vegLevelRef.current);
    const localHasData = localAllergens.length > 0 || localDiets.length > 0;

    if (remoteIsEmpty && localHasData) {
      // Migrazione: push locale → Supabase
      lastSyncedRef.current = { allergens: localAllergens, diets: localDiets };
      AuthService.updateDietaryNeeds(user.uid, { allergens: localAllergens, diets: localDiets })
        .then(() => refreshProfile())
        .catch(err => console.warn('[DietarySync] Migration push failed:', err));
      return;
    }

    // Supabase ha dati → aggiorna AppContext
    const { allergenIds, otherFoodIds } = partitionAllergens(remoteAllergens);
    const { dietModes, vegetarianLevel: vegLevel } = mapDietsToModes(remoteDiets);

    // Imposta ref PRIMA di aggiornare lo stato, così l'effetto Direzione 2
    // vedrà che i valori sono uguali e non farà push
    lastSyncedRef.current = {
      allergens: [...remoteAllergens],
      diets: [...remoteDiets],
    };

    // Aggiorna solo se diverso (evita re-render e scritture AsyncStorage inutili)
    if (!setsEqual(allergensRef.current, allergenIds)) {
      setSelectedAllergens(allergenIds);
    }
    if (!setsEqual(otherFoodsRef.current, otherFoodIds)) {
      setSelectedOtherFoods(otherFoodIds);
    }
    // Per dietModes: preserva 'pregnancy' se era attivo localmente (non sincronizzato)
    const localPregnancy = dietModesRef.current.includes('pregnancy');
    const newDietModes = localPregnancy ? [...dietModes, 'pregnancy' as DietModeId] : dietModes;
    if (!setsEqual(dietModesRef.current, newDietModes)) {
      setActiveDietModes(newDietModes);
    }
    if (vegLevelRef.current !== vegLevel) {
      setVegetarianLevel(vegLevel);
    }
  }, [userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Direzione 2: AppContext → Supabase (debounced) ─────────────────────
  useEffect(() => {
    if (!user) return;

    const allergens = [...selectedAllergens, ...selectedOtherFoods];
    const diets = mapModesToDiets(activeDietModes, vegetarianLevel);

    // Skip se uguale all'ultimo stato sincronizzato (previene echo loop)
    if (
      lastSyncedRef.current &&
      setsEqual(allergens, lastSyncedRef.current.allergens) &&
      setsEqual(diets, lastSyncedRef.current.diets)
    ) {
      return;
    }

    // Debounce: aspetta 500ms prima di pushare
    clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(async () => {
      try {
        lastSyncedRef.current = { allergens, diets };
        await AuthService.updateDietaryNeeds(user.uid, { allergens, diets });
        await refreshProfile();
      } catch (err) {
        console.warn('[DietarySync] Push to Supabase failed:', err);
      }
    }, 500);

    return () => clearTimeout(pushTimerRef.current);
  }, [selectedAllergens, selectedOtherFoods, activeDietModes, vegetarianLevel, user]); // eslint-disable-line react-hooks/exhaustive-deps
}
