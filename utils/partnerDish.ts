import type { PartnerCardDish } from '../services/partnerCardService';

// ─── Compatibilita' di un piatto con chi lo guarda ───────────────────────────
// Il conto si fa QUI, nell'app, e non nel database: le esigenze di chi legge
// sono dati sanitari e non hanno motivo di viaggiare fino a Supabase per
// farsi ordinare una lista.
//
// Tre livelli, gli stessi dell'anteprima del portale (SchedaPreview):
//   amber  il piatto contiene almeno un allergene di chi guarda
//   gray   allergeni a posto, ma una sua dieta non e' dichiarata dal
//          ristoratore — assenza di dichiarazione NON e' incompatibilita'
//   green  tutto quello che ha chiesto e' soddisfatto
// Senza esigenze nel profilo non c'e' compatibilita' da mostrare: null.

export type CompatLevel = 'green' | 'gray' | 'amber';

export interface ViewerNeeds {
  allergens: string[];
  diets: string[];
}

export interface DishCompat {
  level: CompatLevel;
  /** Allergeni di chi guarda presenti nel piatto. */
  contained: string[];
  /** Sue diete che il ristoratore non ha dichiarato. */
  missingDiets: string[];
}

export function dishCompat(dish: PartnerCardDish, viewer: ViewerNeeds): DishCompat | null {
  if (viewer.allergens.length === 0 && viewer.diets.length === 0) return null;
  const contained = viewer.allergens.filter((code) => dish.allergens.includes(code));
  const missingDiets = viewer.diets.filter((code) => !dish.diets.includes(code));
  const level: CompatLevel =
    contained.length > 0 ? 'amber' : missingDiets.length > 0 ? 'gray' : 'green';
  return { level, contained, missingDiets };
}

const COMPAT_RANK: Record<CompatLevel, number> = { green: 0, gray: 1, amber: 2 };

/**
 * Nel carosello, con otto posti soli, prima quelli che puo' mangiare: mostrargli
 * per primi i piatti col suo allergene vorrebbe dire sprecarli. Si RIORDINA e
 * non si nasconde, come il filtro del menu' al tavolo — i piatti ambra restano,
 * dopo. L'ordinamento e' stabile: a parita' resta l'ordine della scheda.
 */
export function sortByCompat(dishes: PartnerCardDish[], viewer: ViewerNeeds): PartnerCardDish[] {
  return [...dishes].sort(
    (a, b) =>
      COMPAT_RANK[dishCompat(a, viewer)?.level ?? 'green'] -
      COMPAT_RANK[dishCompat(b, viewer)?.level ?? 'green'],
  );
}

/** Quanti piatti entrano nel carosello della scheda, prima di "+N · Vedi tutto". */
export const CAROUSEL_MAX = 8;
