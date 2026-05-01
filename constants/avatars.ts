import { ImageSourcePropType } from 'react-native';

export type UnlockCondition =
  | { type: 'free' }
  | { type: 'secret' }
  | { type: 'reviews'; count: number }
  | { type: 'restaurants'; count: number }
  | { type: 'likes_received'; count: number }
  | { type: 'unique_likers_received'; count: number }
  | { type: 'countries_reviewed'; count: number }
  | { type: 'likes_to_restriction_reviews'; count: number; restriction: string };

/**
 * Stats utente usate per valutare le condizioni di sblocco.
 * Per aggiungere un nuovo tipo di condizione: estendi `UnlockCondition`,
 * aggiungi il campo qui, gestiscilo in `isAvatarUnlocked` / `getUnlockProgress`,
 * e popolalo in `services/unlockedAvatarsService.fetchUnlockStats`.
 */
export interface UnlockStats {
  reviews: number;
  restaurants: number;
  /** Eventi like ricevuti totali (somma likes_count su tutte le proprie recensioni). */
  likes: number;
  /** Persone uniche che hanno likato almeno una propria recensione. */
  uniqueLikersReceived: number;
  countriesReviewed: number;
  /**
   * Like dati a recensioni dell'utente filtrati per restrizione alimentare.
   * Chiave = id della restrizione (es. 'vegan', 'gluten'). Il sistema cerca
   * automaticamente nel snapshot giusto (dietary o allergens) tramite
   * `getSnapshotColumnFor` di constants/foodRestrictions.ts.
   */
  likesToRestrictionReviews: Record<string, number>;
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
 *
 * INVARIANTI (non infrangere mai una volta in produzione):
 *  - Mai cambiare l'`id` di un avatar esistente. È la chiave persistita su
 *    `profiles.avatar_url`, `profiles.unlocked_avatars` e `profiles.seen_unlocked_avatars`.
 *    Cambia liberamente `name`, immagine e `unlock`.
 *  - Mai rimuovere un avatar dal catalogo. Se non vuoi più che sia sbloccabile,
 *    impostagli una `unlock` irraggiungibile, ma lasciane qui la voce — gli utenti
 *    che l'hanno già sbloccato in passato continueranno a vederlo come tale.
 *  - Inasprire le condizioni di unlock è sicuro: gli utenti che hanno già sbloccato
 *    mantengono lo sblocco grazie a `profiles.unlocked_avatars` (sblocco "grandfathered").
 */
// Ordine: free → esplorazione geo → cinture (like a restrizioni) → like ricevuti (asc) → segreti.
export const AVATARS: AvatarOption[] = [
  // ── Free ──────────────────────────────────────────────
  {
    id: 'plate_main_logo',
    source: require('../assets/avatars/plate_main_logo.png'),
    name: 'Foodie',
    unlock: { type: 'free' },
  },
  {
    id: 'plate_passport',
    source: require('../assets/avatars/plate_passport.png'),
    name: 'Traveler',
    unlock: { type: 'free' },
  },

  // ── Esplorazione geografica ──────────────────────────
  {
    id: 'plate_language',
    source: require('../assets/avatars/plate_language.png'),
    name: 'Globetrotter',
    unlock: { type: 'countries_reviewed', count: 3 },
  },

  // ── Cinture (like dati a recensioni di utenti con restrizione) ─
  {
    id: 'plate_green_belt',
    source: require('../assets/avatars/plate_green_belt.png'),
    name: 'Green Belt',
    unlock: { type: 'likes_to_restriction_reviews', count: 3, restriction: 'vegan' },
  },
  {
    id: 'plate_blue_belt',
    source: require('../assets/avatars/plate_blue_belt.png'),
    name: 'Blue Belt',
    unlock: { type: 'likes_to_restriction_reviews', count: 5, restriction: 'gluten' },
  },
  {
    id: 'plate_pink_belt',
    source: require('../assets/avatars/plate_pink_belt.png'),
    name: 'Pink Belt',
    unlock: { type: 'likes_to_restriction_reviews', count: 5, restriction: 'vegetarian' },
  },

  // ── Like ricevuti (ladder progressivo) ────────────────
  // Ogni piatto rappresenta un personaggio pop (cappello di paglia → One Piece,
  // bacchetta → Harry Potter, artigli → Wolverine, maschera → Bleach,
  // pipistrello → Batman, armatura → Vegeta). Nomi in inglese: non da tradurre.
  {
    id: 'plate_straw',
    source: require('../assets/avatars/plate_straw.png'),
    name: 'Pirate',
    unlock: { type: 'unique_likers_received', count: 2 },
  },
  {
    id: 'plate_wizard',
    source: require('../assets/avatars/plate_wizard.png'),
    name: 'Patronus',
    unlock: { type: 'unique_likers_received', count: 4 },
  },
  {
    id: 'plate_wolfe',
    source: require('../assets/avatars/plate_wolfe.png'),
    name: 'Wolfe',
    unlock: { type: 'unique_likers_received', count: 6 },
  },
  {
    id: 'plate_bl_mask',
    source: require('../assets/avatars/plate_bl_mask.png'),
    name: 'Soul',
    unlock: { type: 'unique_likers_received', count: 9 },
  },
  {
    id: 'plate_bat',
    source: require('../assets/avatars/plate_bat.png'),
    name: 'Knight',
    unlock: { type: 'unique_likers_received', count: 12 },
  },
  {
    id: 'plate_veget',
    source: require('../assets/avatars/plate_veget.png'),
    name: 'Prince',
    unlock: { type: 'unique_likers_received', count: 14 },
  },

  // ── Missioni segrete (nessuna condizione pubblica) ────
  {
    id: 'plate_mario',
    source: require('../assets/avatars/plate_mario.png'),
    name: 'Plumber',
    unlock: { type: 'secret' },
  },
  {
    id: 'plate_lela',
    source: require('../assets/avatars/plate_lela.png'),
    name: 'Purple',
    unlock: { type: 'secret' },
  },
  {
    id: 'plate_anakin',
    source: require('../assets/avatars/plate_anakin.png'),
    name: 'Apprentice',
    unlock: { type: 'secret' },
  },
  {
    id: 'plate_kurom',
    source: require('../assets/avatars/plate_kurom.png'),
    name: 'Punk',
    unlock: { type: 'secret' },
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
  stats: { reviews: number; restaurants: number; likes?: number; uniqueLikersReceived?: number; countriesReviewed?: number; likesToRestrictionReviews?: Record<string, number> },
): boolean {
  if (UNLOCK_ALL_FOR_TESTING) return true;
  switch (avatar.unlock.type) {
    case 'free':
      return true;
    case 'secret':
      return false;
    case 'reviews':
      return stats.reviews >= avatar.unlock.count;
    case 'restaurants':
      return stats.restaurants >= avatar.unlock.count;
    case 'likes_received':
      return (stats.likes ?? 0) >= avatar.unlock.count;
    case 'unique_likers_received':
      return (stats.uniqueLikersReceived ?? 0) >= avatar.unlock.count;
    case 'countries_reviewed':
      return (stats.countriesReviewed ?? 0) >= avatar.unlock.count;
    case 'likes_to_restriction_reviews':
      return (stats.likesToRestrictionReviews?.[avatar.unlock.restriction] ?? 0) >= avatar.unlock.count;
    default:
      return false;
  }
}

/**
 * Sblocco "effettivo": include il grandfathering.
 * True se l'avatar è sbloccato live OPPURE se è già nella lista persistita
 * `profiles.unlocked_avatars` (cioè l'utente l'ha sbloccato in passato e lo
 * mantiene anche se le condizioni del catalogo sono state inasprite).
 */
export function isAvatarEffectivelyUnlocked(
  avatar: AvatarOption,
  stats: { reviews: number; restaurants: number; likes?: number; uniqueLikersReceived?: number; countriesReviewed?: number; likesToRestrictionReviews?: Record<string, number> },
  everUnlockedIds: readonly string[],
): boolean {
  if (everUnlockedIds.includes(avatar.id)) return true;
  return isAvatarUnlocked(avatar, stats);
}

/**
 * Progresso (0‥1) verso lo sblocco di un avatar.
 */
export function getUnlockProgress(
  avatar: AvatarOption,
  stats: { reviews: number; restaurants: number; likes?: number; uniqueLikersReceived?: number; countriesReviewed?: number; likesToRestrictionReviews?: Record<string, number> },
): number {
  switch (avatar.unlock.type) {
    case 'free':
      return 1;
    case 'secret':
      return 0;
    case 'reviews':
      return Math.min(stats.reviews / avatar.unlock.count, 1);
    case 'restaurants':
      return Math.min(stats.restaurants / avatar.unlock.count, 1);
    case 'likes_received':
      return Math.min((stats.likes ?? 0) / avatar.unlock.count, 1);
    case 'unique_likers_received':
      return Math.min((stats.uniqueLikersReceived ?? 0) / avatar.unlock.count, 1);
    case 'countries_reviewed':
      return Math.min((stats.countriesReviewed ?? 0) / avatar.unlock.count, 1);
    case 'likes_to_restriction_reviews':
      return Math.min((stats.likesToRestrictionReviews?.[avatar.unlock.restriction] ?? 0) / avatar.unlock.count, 1);
    default:
      return 0;
  }
}

/**
 * Progresso "effettivo": ritorna 1 se l'avatar è già nella lista grandfathered
 * (`everUnlockedIds`), altrimenti il progresso live verso la condizione corrente.
 */
export function getEffectiveUnlockProgress(
  avatar: AvatarOption,
  stats: { reviews: number; restaurants: number; likes?: number; uniqueLikersReceived?: number; countriesReviewed?: number; likesToRestrictionReviews?: Record<string, number> },
  everUnlockedIds: readonly string[],
): number {
  if (everUnlockedIds.includes(avatar.id)) return 1;
  return getUnlockProgress(avatar, stats);
}
