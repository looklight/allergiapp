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
 * Per aggiungerne di nuovi: salva l'immagine 400×400 PNG in assets/avatars/
 * con nome plate_<nome>.png, imposta source e aggiungi una riga qui sotto.
 * Se il disegno non è ancora pronto, usa source: null (verrà mostrato un placeholder).
 */
export const AVATARS: AvatarOption[] = [
  // ── Free ──────────────────────────────────────────────
  {
    id: 'plate_forks',
    source: require('../assets/avatars/plate_forks.png'),
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
    id: 'plate_passport',
    source: require('../assets/avatars/plate_passport.png'),
    name: 'Il Viaggiatore',
    description: 'Sempre in viaggio, sempre a tavola.',
    rarity: 'common',
    unlock: { type: 'free' },
  },

  // ── Reviews ───────────────────────────────────────────
  {
    id: 'plate_critic',
    source: null,
    name: 'Il Critico',
    description: 'Scrivi 5 recensioni per sbloccarlo.',
    rarity: 'rare',
    unlock: { type: 'reviews', count: 5 },
  },
  {
    id: 'plate_gourmet',
    source: null,
    name: 'Il Gourmet',
    description: 'Scrivi 15 recensioni per sbloccarlo.',
    rarity: 'epic',
    unlock: { type: 'reviews', count: 15 },
  },
  {
    id: 'plate_michelin',
    source: null,
    name: 'La Guida Michelin',
    description: 'Scrivi 30 recensioni per sbloccarlo.',
    rarity: 'legendary',
    unlock: { type: 'reviews', count: 30 },
  },

  // ── Restaurants ───────────────────────────────────────
  {
    id: 'plate_explorer',
    source: null,
    name: "L'Esploratore",
    description: 'Aggiungi 5 ristoranti per sbloccarlo.',
    rarity: 'rare',
    unlock: { type: 'restaurants', count: 5 },
  },
  {
    id: 'plate_mapper',
    source: null,
    name: 'Il Mappatore',
    description: 'Aggiungi 15 ristoranti per sbloccarlo.',
    rarity: 'epic',
    unlock: { type: 'restaurants', count: 15 },
  },
  {
    id: 'plate_atlas',
    source: null,
    name: "L'Atlante Vivente",
    description: 'Aggiungi 30 ristoranti per sbloccarlo.',
    rarity: 'legendary',
    unlock: { type: 'restaurants', count: 30 },
  },
];

export function getAvatarById(id: string): AvatarOption | undefined {
  return AVATARS.find((a) => a.id === id);
}

/**
 * Determina se un avatar è sbloccato in base alle stats dell'utente.
 */
export function isAvatarUnlocked(
  avatar: AvatarOption,
  stats: { reviews: number; restaurants: number },
): boolean {
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
