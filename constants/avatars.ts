import { ImageSourcePropType } from 'react-native';

export type UnlockCondition =
  | { type: 'free' }
  | { type: 'secret' }
  | { type: 'reviews'; count: number }
  | { type: 'restaurants'; count: number }
  | { type: 'likes_received'; count: number }
  | { type: 'unique_likers_received'; count: number }
  | { type: 'countries_reviewed'; count: number }
  | { type: 'likes_to_restriction_reviews'; count: number; restriction: string }
  /**
   * Recensisci `count` ristoranti che soddisfano i filtri (cucina/paese).
   * Generico: copre l'intera famiglia di segreti "recensisci in paese X / cucina Y".
   * Aggiungerne uno nuovo = una riga nel catalogo, zero infra.
   *  - cuisineAny: il ristorante ha almeno una di queste cucine (OR)
   *  - countryIn / countryNotIn: country_code ∈ / ∉ (paesi noti soltanto)
   *  - distinctCities: se true conta CITTÀ distinte tra i match (città note),
   *    non i ristoranti — es. "10 giapponesi in 10 città diverse"
   *  - requiresPhoto: se true conta solo i posti la cui recensione ha almeno
   *    una foto (per-recensione, non "una foto totale")
   */
  | { type: 'reviews_matching'; count: number; cuisineAny?: string[]; countryIn?: string[]; countryNotIn?: string[]; distinctCities?: boolean; requiresPhoto?: boolean }
  /**
   * Scrivi `count` recensioni con voto nel range (maxStars/minStars inclusi).
   * Asse "voto della recensione", distinto da reviews_matching (cucina/paese).
   * Es. recensione ≤3 stelle: { count: 1, maxStars: 3 }.
   */
  | { type: 'reviews_rating'; count: number; maxStars?: number; minStars?: number }
  /**
   * Recensisci almeno `perCuisine` (default 1) ristoranti per OGNI cucina elencata.
   * AND tra cucine (≠ reviews_matching, che è OR su cuisineAny).
   * Es. una thai + una mexican + una indian: { cuisines: ['thai','mexican','indian'] }.
   */
  | { type: 'reviews_each_cuisine'; cuisines: string[]; perCuisine?: number; requiresPhoto?: boolean };

/** Un ristorante recensito dall'utente, ridotto ai campi per `reviews_matching`. */
export interface ReviewedPlace {
  restaurantId: string;
  cuisines: string[];
  country: string | null;
  city: string | null;
  /** La recensione dell'utente per questo posto ha almeno una foto. */
  hasPhoto: boolean;
}

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
  /** Posti recensiti (cucina+paese), per valutare le condizioni `reviews_matching`. */
  reviewedPlaces: ReviewedPlace[];
  /** Voti (1–5) delle recensioni scritte dall'utente, per le `reviews_rating`. */
  reviewRatings: number[];
}

export interface AvatarOption {
  id: string;
  source: ImageSourcePropType | null;
  name: string;
  unlock: UnlockCondition;
  /**
   * Presentazione: se true la galleria nasconde la condizione finché bloccato
   * (mostra "Missione segreta", niente barra di progresso) e la svela solo a
   * sblocco avvenuto. La VALUTAZIONE resta quella di `unlock`: separare i due
   * assi permette segreti con condizione reale ma nascosta.
   */
  secret?: boolean;
  /** Chiave i18n del testo svelato a sblocco avvenuto (per i `secret`). */
  revealedKey?: string;
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
  {
    id: 'plate_purple_belt',
    source: require('../assets/avatars/plate_purple_belt.png'),
    name: 'Purple Belt',
    unlock: { type: 'likes_to_restriction_reviews', count: 10, restriction: 'vegan' },
  },
  {
    id: 'plate_orange_belt',
    source: require('../assets/avatars/plate_orange_belt.png'),
    name: 'Orange Belt',
    unlock: { type: 'likes_to_restriction_reviews', count: 10, restriction: 'gluten' },
  },
  {
    id: 'plate_teal_belt',
    source: require('../assets/avatars/plate_teal_belt.png'),
    name: 'Teal Belt',
    unlock: { type: 'likes_to_restriction_reviews', count: 10, restriction: 'vegetarian' },
  },

  // ── Like ricevuti (ladder progressivo) ────────────────
  // Ogni piatto rappresenta un personaggio pop (cappello di paglia → One Piece,
  // bacchetta → Harry Potter, artigli → Wolverine, maschera → Bleach,
  // pipistrello → Batman, armatura → Vegeta). Nomi in inglese: non da tradurre.
  {
    id: 'plate_straw',
    source: require('../assets/avatars/plate_straw.png'),
    name: 'Pirate',
    unlock: { type: 'unique_likers_received', count: 4 },
  },
  {
    id: 'plate_wizard',
    source: require('../assets/avatars/plate_wizard.png'),
    name: 'Patronus',
    unlock: { type: 'unique_likers_received', count: 8 },
  },
  {
    id: 'plate_wolfe',
    source: require('../assets/avatars/plate_wolfe.png'),
    name: 'Wolfe',
    unlock: { type: 'unique_likers_received', count: 12 },
  },
  {
    id: 'plate_bl_mask',
    source: require('../assets/avatars/plate_bl_mask.png'),
    name: 'Soul',
    unlock: { type: 'unique_likers_received', count: 16 },
  },
  {
    id: 'plate_bat',
    source: require('../assets/avatars/plate_bat.png'),
    name: 'Knight',
    unlock: { type: 'unique_likers_received', count: 20 },
  },
  {
    id: 'plate_veget',
    source: require('../assets/avatars/plate_veget.png'),
    name: 'Prince',
    unlock: { type: 'unique_likers_received', count: 24 },
  },

  // ── Missioni segrete ──────────────────────────────────
  // Due modi:
  //  1. Non ancora progettato → `unlock: { type: 'secret' }` (non si sblocca mai).
  //  2. Condizione reale ma NASCOSTA → metti la condizione vera in `unlock`
  //     (es. reviews_matching) + `secret: true` + `revealedKey` con la chiave i18n
  //     del testo da svelare. Da bloccato mostra "Missione segreta" e nasconde il
  //     progresso; da sbloccato il box rivela la quest.
  {
    id: 'plate_mario',
    source: require('../assets/avatars/plate_mario.png'),
    name: 'Plumber',
    // Segreto: recensisci con foto 2 ristoranti italiani fuori dall'Italia (Mario, italiano nel mondo).
    unlock: { type: 'reviews_matching', count: 2, cuisineAny: ['italian'], countryNotIn: ['IT'], requiresPhoto: true },
    secret: true,
    revealedKey: 'restaurants.avatarGallery.secretRevealed.plate_mario',
  },
  {
    id: 'plate_lela',
    source: require('../assets/avatars/plate_lela.png'),
    name: 'Purple',
    // Segreto: recensisci con foto 5 bakery in 5 città diverse (Leela, pilota esploratrice).
    unlock: { type: 'reviews_matching', count: 5, cuisineAny: ['bakery'], distinctCities: true, requiresPhoto: true },
    secret: true,
    revealedKey: 'restaurants.avatarGallery.secretRevealed.plate_lela',
  },
  {
    id: 'plate_anakin',
    source: require('../assets/avatars/plate_anakin.png'),
    name: 'Apprentice',
    // Segreto: recensisci con foto 10 cucine diverse del mondo (Jedi maestro di ogni sapore).
    unlock: {
      type: 'reviews_each_cuisine',
      cuisines: ['italian', 'french', 'spanish', 'japanese', 'chinese', 'korean', 'thai', 'indian', 'mexican', 'middle_eastern'],
      requiresPhoto: true,
    },
    secret: true,
    revealedKey: 'restaurants.avatarGallery.secretRevealed.plate_anakin',
  },
  {
    id: 'plate_kurom',
    source: require('../assets/avatars/plate_kurom.png'),
    name: 'Skull',
    // Segreto: scrivi una recensione con 3 stelle o meno (teschio = giudizio severo).
    unlock: { type: 'reviews_rating', count: 1, maxStars: 3 },
    secret: true,
    revealedKey: 'restaurants.avatarGallery.secretRevealed.plate_kurom',
  },
  {
    id: 'plate_squid',
    source: require('../assets/avatars/plate_squid.png'),
    name: 'Squid',
    // Segreto: recensisci 5 ristoranti di cucina coreana (Squid Game).
    unlock: { type: 'reviews_matching', count: 5, cuisineAny: ['korean'] },
    secret: true,
    revealedKey: 'restaurants.avatarGallery.secretRevealed.plate_squid',
  },
  {
    id: 'plate_raven',
    source: require('../assets/avatars/plate_raven.png'),
    name: 'Raven',
    // Segreto: 10 ristoranti giapponesi in 10 città diverse (Itachi, ninja girovago).
    unlock: { type: 'reviews_matching', count: 10, cuisineAny: ['japanese'], distinctCities: true },
    secret: true,
    revealedKey: 'restaurants.avatarGallery.secretRevealed.plate_raven',
  },
  {
    id: 'plate_zard',
    source: require('../assets/avatars/plate_zard.png'),
    name: 'Zard',
    // Segreto: recensisci con foto almeno 1 thai, 1 mexican e 1 indian (drago di fuoco = piccante).
    unlock: { type: 'reviews_each_cuisine', cuisines: ['thai', 'mexican', 'indian'], requiresPhoto: true },
    secret: true,
    revealedKey: 'restaurants.avatarGallery.secretRevealed.plate_zard',
  },
  {
    id: 'plate_sponge',
    source: require('../assets/avatars/plate_sponge.png'),
    name: 'Sponge',
    // Segreto: recensisci 12 ristoranti di pesce e frutti di mare (SpongeBob = oceano).
    unlock: { type: 'reviews_matching', count: 12, cuisineAny: ['seafood'] },
    secret: true,
    revealedKey: 'restaurants.avatarGallery.secretRevealed.plate_sponge',
  },
  {
    id: 'plate_astro',
    source: require('../assets/avatars/plate_astro.png'),
    name: 'Astro',
    // Segreto: recensisci 5 ristoranti hamburger e panini negli USA (astronauta americano).
    unlock: { type: 'reviews_matching', count: 5, cuisineAny: ['hamburger'], countryIn: ['US'] },
    secret: true,
    revealedKey: 'restaurants.avatarGallery.secretRevealed.plate_astro',
  },
];

export function getAvatarById(id: string): AvatarOption | undefined {
  return AVATARS.find((a) => a.id === id);
}

/**
 * Conta i ristoranti recensiti che soddisfano i filtri di una `reviews_matching`.
 * I posti arrivano già deduplicati per ristorante da `fetchUnlockStats`.
 * Per `countryNotIn` contano solo i posti con paese noto (country != null).
 */
function countMatchingReviews(
  places: readonly ReviewedPlace[] | undefined,
  cond: { cuisineAny?: string[]; countryIn?: string[]; countryNotIn?: string[]; distinctCities?: boolean; requiresPhoto?: boolean },
): number {
  const matched = (places ?? []).filter(
    (p) =>
      (!cond.requiresPhoto || p.hasPhoto) &&
      (!cond.cuisineAny || cond.cuisineAny.some((c) => p.cuisines.includes(c))) &&
      (!cond.countryIn || (p.country != null && cond.countryIn.includes(p.country))) &&
      (!cond.countryNotIn || (p.country != null && !cond.countryNotIn.includes(p.country))),
  );
  if (cond.distinctCities) {
    // Conta città distinte (solo note); copre "N ristoranti in N città diverse".
    return new Set(matched.map((p) => p.city).filter((c): c is string => c != null)).size;
  }
  return matched.length;
}

/** Conta le recensioni dell'utente col voto nel range (maxStars/minStars inclusi). */
function countRatingReviews(
  ratings: readonly number[] | undefined,
  cond: { maxStars?: number; minStars?: number },
): number {
  return (ratings ?? []).filter(
    (r) => (cond.maxStars == null || r <= cond.maxStars) && (cond.minStars == null || r >= cond.minStars),
  ).length;
}

/**
 * Per le `reviews_each_cuisine`: somma "cappata" dei match per ogni cucina
 * richiesta (ogni cucina conta al massimo `perCuisine`). Raggiunge il totale
 * `cuisines.length * perCuisine` solo se OGNI cucina ha almeno `perCuisine` match.
 */
function cappedEachCuisine(
  places: readonly ReviewedPlace[] | undefined,
  cuisines: string[],
  perCuisine: number,
  requiresPhoto?: boolean,
): number {
  return cuisines.reduce((sum, c) => {
    const n = (places ?? []).filter((p) => p.cuisines.includes(c) && (!requiresPhoto || p.hasPhoto)).length;
    return sum + Math.min(n, perCuisine);
  }, 0);
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
  stats: { reviews: number; restaurants: number; likes?: number; uniqueLikersReceived?: number; countriesReviewed?: number; likesToRestrictionReviews?: Record<string, number>; reviewedPlaces?: ReviewedPlace[]; reviewRatings?: number[] },
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
    case 'reviews_matching':
      return countMatchingReviews(stats.reviewedPlaces, avatar.unlock) >= avatar.unlock.count;
    case 'reviews_rating':
      return countRatingReviews(stats.reviewRatings, avatar.unlock) >= avatar.unlock.count;
    case 'reviews_each_cuisine': {
      const per = avatar.unlock.perCuisine ?? 1;
      return cappedEachCuisine(stats.reviewedPlaces, avatar.unlock.cuisines, per, avatar.unlock.requiresPhoto) >= avatar.unlock.cuisines.length * per;
    }
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
  stats: { reviews: number; restaurants: number; likes?: number; uniqueLikersReceived?: number; countriesReviewed?: number; likesToRestrictionReviews?: Record<string, number>; reviewedPlaces?: ReviewedPlace[]; reviewRatings?: number[] },
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
  stats: { reviews: number; restaurants: number; likes?: number; uniqueLikersReceived?: number; countriesReviewed?: number; likesToRestrictionReviews?: Record<string, number>; reviewedPlaces?: ReviewedPlace[]; reviewRatings?: number[] },
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
    case 'reviews_matching':
      return Math.min(countMatchingReviews(stats.reviewedPlaces, avatar.unlock) / avatar.unlock.count, 1);
    case 'reviews_rating':
      return Math.min(countRatingReviews(stats.reviewRatings, avatar.unlock) / avatar.unlock.count, 1);
    case 'reviews_each_cuisine': {
      const per = avatar.unlock.perCuisine ?? 1;
      const total = avatar.unlock.cuisines.length * per;
      return total > 0 ? Math.min(cappedEachCuisine(stats.reviewedPlaces, avatar.unlock.cuisines, per, avatar.unlock.requiresPhoto) / total, 1) : 1;
    }
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
  stats: { reviews: number; restaurants: number; likes?: number; uniqueLikersReceived?: number; countriesReviewed?: number; likesToRestrictionReviews?: Record<string, number>; reviewedPlaces?: ReviewedPlace[]; reviewRatings?: number[] },
  everUnlockedIds: readonly string[],
): number {
  if (everUnlockedIds.includes(avatar.id)) return 1;
  return getUnlockProgress(avatar, stats);
}
