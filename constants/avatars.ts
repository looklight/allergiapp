import { ImageSourcePropType } from 'react-native';

export type UnlockCondition =
  | { type: 'free' }
  | { type: 'reviews'; count: number }
  | { type: 'restaurants'; count: number }
  | { type: 'likes_received'; count: number }
  | { type: 'countries_reviewed'; count: number }
  | { type: 'likes_to_dietary_reviews'; count: number; dietary: string };

/**
 * Stats utente usate per valutare le condizioni di sblocco.
 * Per aggiungere un nuovo tipo di condizione: estendi `UnlockCondition`,
 * aggiungi il campo qui, gestiscilo in `isAvatarUnlocked` / `getUnlockProgress`,
 * e popolalo in `services/unlockedAvatarsService.fetchUnlockStats`.
 */
export interface UnlockStats {
  reviews: number;
  restaurants: number;
  likes: number;
  countriesReviewed: number;
  /** Like dati a recensioni filtrati per dieta (chiave = id della dieta nel snapshot). */
  likesToDietaryReviews: Record<string, number>;
}

export interface AvatarOption {
  id: string;
  source: ImageSourcePropType | null;
  name: string;
  unlock: UnlockCondition;
}

/**
 * Catalogo avatar.
 *
 * Workflow per aggiungere/modificare un avatar:
 *   1. Salva il master in `_design/avatars/plate_<nome>.png`
 *   2. Lancia `npm run build:avatars` (genera il bundle 400×400 in assets/avatars/)
 *   3. Aggiungi una riga qui sotto con `source: require('../assets/avatars/plate_<nome>.png')`
 *
 * Note: nomi e condizioni di sblocco sotto sono PLACEHOLDER — da rivedere quando si
 * disegnerà la struttura definitiva delle "task" per gli utenti (segrete + dichiarate).
 */
export const AVATARS: AvatarOption[] = [
  // ── Free ──────────────────────────────────────────────
  {
    id: 'plate_main_logo',
    source: require('../assets/avatars/plate_main_logo.png'),
    name: 'Il Buongustaio',
    unlock: { type: 'free' },
  },
  {
    id: 'plate_passport',
    source: require('../assets/avatars/plate_passport.png'),
    name: 'Il Viaggiatore',
    unlock: { type: 'free' },
  },
  {
    id: 'plate_language',
    source: require('../assets/avatars/plate_language.png'),
    name: 'Il Poliglotta',
    unlock: { type: 'countries_reviewed', count: 3 },
  },

  // ── Reviews ───────────────────────────────────────────
  {
    id: 'plate_wolfe',
    source: require('../assets/avatars/plate_wolfe.png'),
    name: 'Il Critico',
    unlock: { type: 'reviews', count: 5 },
  },
  {
    id: 'plate_veget',
    source: require('../assets/avatars/plate_veget.png'),
    name: 'Il Gourmet',
    unlock: { type: 'reviews', count: 15 },
  },
  {
    id: 'plate_wizard',
    source: require('../assets/avatars/plate_wizard.png'),
    name: 'La Guida Michelin',
    unlock: { type: 'reviews', count: 30 },
  },

  // ── Restaurants ───────────────────────────────────────
  {
    id: 'plate_straw',
    source: require('../assets/avatars/plate_straw.png'),
    name: "L'Esploratore",
    unlock: { type: 'countries_reviewed', count: 2 },
  },
  {
    id: 'plate_bat',
    source: require('../assets/avatars/plate_bat.png'),
    name: 'Il Mappatore',
    unlock: { type: 'restaurants', count: 15 },
  },
  {
    id: 'plate_bl_mask',
    source: require('../assets/avatars/plate_bl_mask.png'),
    name: "L'Atlante Vivente",
    unlock: { type: 'restaurants', count: 30 },
  },

  // ── Belts (TBD: regole di sblocco da definire) ────────
  {
    id: 'plate_green_belt',
    source: require('../assets/avatars/plate_green_belt.png'),
    name: 'Cintura Verde',
    unlock: { type: 'likes_to_dietary_reviews', count: 3, dietary: 'vegan' },
  },
  {
    id: 'plate_pink_belt',
    source: require('../assets/avatars/plate_pink_belt.png'),
    name: 'Cintura Rosa',
    unlock: { type: 'likes_to_dietary_reviews', count: 5, dietary: 'vegetarian' },
  },
];

export function getAvatarById(id: string): AvatarOption | undefined {
  return AVATARS.find((a) => a.id === id);
}

/**
 * TEMP: se true sblocca tutti gli avatar a prescindere dalle condizioni.
 * Usato per test del catalogo. Rimettere a false prima del rilascio.
 */
const UNLOCK_ALL_FOR_TESTING = false;

/**
 * Determina se un avatar è sbloccato in base alle stats dell'utente.
 */
export function isAvatarUnlocked(
  avatar: AvatarOption,
  stats: { reviews: number; restaurants: number; likes?: number; countriesReviewed?: number; likesToDietaryReviews?: Record<string, number> },
): boolean {
  if (UNLOCK_ALL_FOR_TESTING) return true;
  switch (avatar.unlock.type) {
    case 'free':
      return true;
    case 'reviews':
      return stats.reviews >= avatar.unlock.count;
    case 'restaurants':
      return stats.restaurants >= avatar.unlock.count;
    case 'likes_received':
      return (stats.likes ?? 0) >= avatar.unlock.count;
    case 'countries_reviewed':
      return (stats.countriesReviewed ?? 0) >= avatar.unlock.count;
    case 'likes_to_dietary_reviews':
      return (stats.likesToDietaryReviews?.[avatar.unlock.dietary] ?? 0) >= avatar.unlock.count;
    default:
      return false;
  }
}

/**
 * Progresso (0‥1) verso lo sblocco di un avatar.
 */
export function getUnlockProgress(
  avatar: AvatarOption,
  stats: { reviews: number; restaurants: number; likes?: number; countriesReviewed?: number; likesToDietaryReviews?: Record<string, number> },
): number {
  switch (avatar.unlock.type) {
    case 'free':
      return 1;
    case 'reviews':
      return Math.min(stats.reviews / avatar.unlock.count, 1);
    case 'restaurants':
      return Math.min(stats.restaurants / avatar.unlock.count, 1);
    case 'likes_received':
      return Math.min((stats.likes ?? 0) / avatar.unlock.count, 1);
    case 'countries_reviewed':
      return Math.min((stats.countriesReviewed ?? 0) / avatar.unlock.count, 1);
    case 'likes_to_dietary_reviews':
      return Math.min((stats.likesToDietaryReviews?.[avatar.unlock.dietary] ?? 0) / avatar.unlock.count, 1);
    default:
      return 0;
  }
}
