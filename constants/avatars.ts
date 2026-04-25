import { ImageSourcePropType } from 'react-native';

export type AvatarRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type UnlockCondition =
  | { type: 'free' }
  | { type: 'reviews'; count: number }
  | { type: 'restaurants'; count: number };

export interface AvatarOption {
  id: string;
  source: ImageSourcePropType | null;
  name: string;
  description: string;
  rarity: AvatarRarity;
  unlock: UnlockCondition;
}

/**
 * Colori per rarità avatar.
 */
export const RARITY_COLORS: Record<AvatarRarity, string> = {
  common: '#9E9E9E',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
};

export const RARITY_LABELS: Record<AvatarRarity, string> = {
  common: 'Comune',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Leggendario',
};

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
    description: 'Un classico per chi ama mangiare bene.',
    rarity: 'common',
    unlock: { type: 'free' },
  },
  {
    id: 'plate_language',
    source: require('../assets/avatars/plate_language.png'),
    name: 'Il Poliglotta',
    description: 'Per chi parla la lingua del cibo.',
    rarity: 'common',
    unlock: { type: 'free' },
  },
  {
    // TODO: master da ridisegnare con disco centrato e proporzionato (vecchia versione mantenuta 1:1)
    id: 'plate_passport',
    source: require('../assets/avatars/plate_passport.png'),
    name: 'Il Viaggiatore',
    description: 'Sempre in viaggio, sempre a tavola.',
    rarity: 'common',
    unlock: { type: 'free' },
  },

  // ── Reviews ───────────────────────────────────────────
  {
    id: 'plate_wolfe',
    source: require('../assets/avatars/plate_wolfe.png'),
    name: 'Il Critico',
    description: 'Scrivi 5 recensioni per sbloccarlo.',
    rarity: 'rare',
    unlock: { type: 'reviews', count: 5 },
  },
  {
    id: 'plate_veget',
    source: require('../assets/avatars/plate_veget.png'),
    name: 'Il Gourmet',
    description: 'Scrivi 15 recensioni per sbloccarlo.',
    rarity: 'epic',
    unlock: { type: 'reviews', count: 15 },
  },
  {
    id: 'plate_wizard',
    source: require('../assets/avatars/plate_wizard.png'),
    name: 'La Guida Michelin',
    description: 'Scrivi 30 recensioni per sbloccarlo.',
    rarity: 'legendary',
    unlock: { type: 'reviews', count: 30 },
  },

  // ── Restaurants ───────────────────────────────────────
  {
    id: 'plate_straw',
    source: require('../assets/avatars/plate_straw.png'),
    name: "L'Esploratore",
    description: 'Aggiungi 5 ristoranti per sbloccarlo.',
    rarity: 'rare',
    unlock: { type: 'restaurants', count: 5 },
  },
  {
    id: 'plate_bat',
    source: require('../assets/avatars/plate_bat.png'),
    name: 'Il Mappatore',
    description: 'Aggiungi 15 ristoranti per sbloccarlo.',
    rarity: 'epic',
    unlock: { type: 'restaurants', count: 15 },
  },
  {
    id: 'plate_bl_mask',
    source: require('../assets/avatars/plate_bl_mask.png'),
    name: "L'Atlante Vivente",
    description: 'Aggiungi 30 ristoranti per sbloccarlo.',
    rarity: 'legendary',
    unlock: { type: 'restaurants', count: 30 },
  },

  // ── Belts (TBD: regole di sblocco da definire) ────────
  {
    id: 'plate_green_belt',
    source: require('../assets/avatars/plate_green_belt.png'),
    name: 'Cintura Verde',
    description: 'Avatar speciale.',
    rarity: 'rare',
    unlock: { type: 'free' },
  },
  {
    id: 'plate_pink_belt',
    source: require('../assets/avatars/plate_pink_belt.png'),
    name: 'Cintura Rosa',
    description: 'Avatar speciale.',
    rarity: 'epic',
    unlock: { type: 'free' },
  },
];

export function getAvatarById(id: string): AvatarOption | undefined {
  return AVATARS.find((a) => a.id === id);
}

/**
 * TEMP: se true sblocca tutti gli avatar a prescindere dalle condizioni.
 * Usato per test del catalogo. Rimettere a false prima del rilascio.
 */
const UNLOCK_ALL_FOR_TESTING = true;

/**
 * Determina se un avatar è sbloccato in base alle stats dell'utente.
 */
export function isAvatarUnlocked(
  avatar: AvatarOption,
  stats: { reviews: number; restaurants: number },
): boolean {
  if (UNLOCK_ALL_FOR_TESTING) return true;
  switch (avatar.unlock.type) {
    case 'free':
      return true;
    case 'reviews':
      return stats.reviews >= avatar.unlock.count;
    case 'restaurants':
      return stats.restaurants >= avatar.unlock.count;
    default:
      return false;
  }
}

/**
 * Progresso (0‥1) verso lo sblocco di un avatar.
 */
export function getUnlockProgress(
  avatar: AvatarOption,
  stats: { reviews: number; restaurants: number },
): number {
  switch (avatar.unlock.type) {
    case 'free':
      return 1;
    case 'reviews':
      return Math.min(stats.reviews / avatar.unlock.count, 1);
    case 'restaurants':
      return Math.min(stats.restaurants / avatar.unlock.count, 1);
    default:
      return 0;
  }
}
