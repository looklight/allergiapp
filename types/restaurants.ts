import type { Timestamp } from 'firebase/firestore';
import type { AllergenId, RestaurantCategoryId } from './index';

export type { Timestamp };

// GeoPoint come interfaccia plain — compatibile con Firebase GeoPoint a runtime
// ma accetta anche oggetti literal { latitude, longitude } (es. da Google Places)
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// ---------------------------------------------------------------------------
// Stato moderazione
// Usato su Restaurant, Dish e Review per il pannello admin.
//   pending  → appena inserito, in attesa di verifica (opzionale, vedere note)
//   active   → visibile agli utenti
//   removed  → rimosso da admin, non visibile
// ---------------------------------------------------------------------------
export type ContentStatus = 'pending' | 'active' | 'removed';

// ---------------------------------------------------------------------------
// users/{userId}
//
// Profilo utente registrato. Creato al primo login con Firebase Auth.
// Le allergie personali NON sono qui: restano in AsyncStorage locale.
// ---------------------------------------------------------------------------
export interface RestaurantUserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  // Contatori denormalizzati per il pannello admin
  restaurantsAdded: number;
  dishesAdded: number;
  reviewsAdded: number;
  contributionsAdded: number;
  avatarId?: string;
  profileColor?: string;
}

// ---------------------------------------------------------------------------
// restaurants/{restaurantId}
//
// Document ID = googlePlaceId (strategia dedup: un ristorante non può
// essere inserito due volte se ha lo stesso Place ID Google).
//
// Schema compatibile con places/{placeId} di Altrove:
// stessi nomi di campo per name, address, city, country, countryCode,
// location, geohash, googlePlaceId. Campi aggiuntivi specifici di
// AllergiApp: categories, reviewCount, dishCount, favoriteCount.
// ---------------------------------------------------------------------------
export interface Restaurant {
  // Identità (Google Places)
  googlePlaceId: string;          // = documentId
  name: string;
  address: string;
  city: string;
  cityNormalized: string;         // lowercase senza accenti, per ricerca testuale
  country: string;
  countryCode: string;            // ISO 3166-1 alpha-2, es. "IT"

  // Geolocalizzazione
  location: GeoPoint;
  geohash: string;                // Per query "vicino a me" con geofire-common

  // Contatti (opzionali, da Google Places)
  phone?: string;
  website?: string;

  // Classificazione
  priceLevel?: 1 | 2 | 3 | 4;    // Come Google Maps (€ → ££££)
  cuisineTypes?: string[];        // Es. ['italian', 'pizza']

  // Categorie ristorante (es. gluten_free, vegan, vegetarian)
  categories: RestaurantCategoryId[];

  // Metadati inserimento
  addedBy: string;                // userId di chi ha aggiunto il ristorante
  addedByName?: string;           // displayName denormalizzato di chi ha aggiunto
  addedAt: Timestamp;
  updatedAt: Timestamp;

  // Moderazione
  status: ContentStatus;

  // Contatori denormalizzati (aggiornati lato client o Cloud Function)
  reviewCount: number;
  dishCount: number;
  favoriteCount: number;
  contributionCount?: number;     // totale contributi (nuovo sistema unificato)

  // Rating
  averageRating: number;          // media ponderata (0 se nessuna review)
  ratingCount: number;            // numero di review con rating

  // Thumbnail denormalizzata (prima immagine piatto da una contribution)
  thumbnailUrl?: string;

  // Voti community sulle categorie dietetiche (es. { gluten_free: 3, vegan: 1 })
  categoryVotes?: Record<string, number>;

  // Contatore foto menu (denormalizzato dalla subcollection menuPhotos)
  menuPhotoCount?: number;

  // Contatore segnalazioni (denormalizzato dalla subcollection reports)
  reportCount?: number;
}

// ---------------------------------------------------------------------------
// restaurants/{restaurantId}/dishes/{dishId}
//
// Piatto specifico con informazioni sugli allergeni.
// allergenSafe:     questo piatto è sicuro per chi ha queste allergie
// allergenContains: questo piatto contiene esplicitamente questi allergeni
//                   (campo opzionale per maggiore precisione)
// ---------------------------------------------------------------------------
export interface Dish {
  id: string;
  name: string;
  description?: string;

  // Allergie — specifico AllergiApp
  allergenSafe: AllergenId[];
  allergenContains?: AllergenId[];

  // Metadati
  addedBy: string;                // userId
  addedAt: Timestamp;

  // Moderazione
  status: ContentStatus;
}

// ---------------------------------------------------------------------------
// restaurants/{restaurantId}/reviews/{reviewId}
//
// Recensione testuale lasciata da un utente registrato.
// displayName è denormalizzato per evitare join al momento della lettura.
// ---------------------------------------------------------------------------
export interface Review {
  id: string;
  userId: string;
  displayName: string;            // Denormalizzato da users/{userId}
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
  imageUrl?: string;              // URL da Firebase Storage
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // Moderazione
  status: ContentStatus;
}

// ---------------------------------------------------------------------------
// users/{userId}/favorites/{restaurantId}
//
// Ristorante salvato nei preferiti dall'utente.
// I campi denormalizzati (name, city, categories) evitano una seconda
// lettura su restaurants/ quando si renderizza la lista preferiti.
// ---------------------------------------------------------------------------
export interface FavoriteRestaurant {
  restaurantId: string;           // = documentId, ref a restaurants/{id}
  savedAt: Timestamp;

  // Snapshot denormalizzato per rendering lista senza join
  name: string;
  city: string;
  countryCode: string;
  categories: RestaurantCategoryId[];
}

// ---------------------------------------------------------------------------
// Tipi di supporto per UI e servizi
// ---------------------------------------------------------------------------

// Usato nella schermata di aggiunta ristorante (ricerca Google Places)
export interface PlaceSuggestion {
  googlePlaceId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  countryCode: string;
  location: GeoPoint;
}

// Input per creare un nuovo ristorante.
// geohash è escluso: viene calcolato internamente da RestaurantService.addRestaurant
// a partire da location, non deve essere fornito dal chiamante.
export type CreateRestaurantInput = Pick<
  Restaurant,
  | 'googlePlaceId'
  | 'name'
  | 'address'
  | 'city'
  | 'cityNormalized'
  | 'country'
  | 'countryCode'
  | 'location'
  | 'phone'
  | 'website'
  | 'priceLevel'
  | 'cuisineTypes'
  | 'categories'
>;

// Input per creare un nuovo piatto
export type CreateDishInput = Pick<
  Dish,
  'name' | 'description' | 'allergenSafe' | 'allergenContains'
>;

// Input per creare una nuova recensione
export type CreateReviewInput = Pick<Review, 'text' | 'rating'> & {
  imageUri?: string;              // URI locale dell'immagine scelta dall'utente
};

// ---------------------------------------------------------------------------
// restaurants/{restaurantId}/contributions/{contributionId}
//
// Contributo unificato: può contenere una recensione (rating + testo),
// piatti sicuri, o entrambi. Almeno uno tra rating, text e dishes deve
// essere presente.
// ---------------------------------------------------------------------------
export interface ContributionDish {
  name: string;
  description?: string;
  allergenSafe: AllergenId[];
  allergenContains?: AllergenId[];
  imageUrl?: string;              // full size
  thumbnailUrl?: string;          // 150px thumbnail
}

export interface Contribution {
  id: string;
  userId: string;
  displayName: string;
  // Recensione (opzionale)
  rating?: 1 | 2 | 3 | 4 | 5;
  text?: string;
  // Piatti (zero o più)
  dishes: ContributionDish[];
  // Categorie dietetiche confermate dall'utente
  confirmedCategories?: RestaurantCategoryId[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  status: ContentStatus;
}

// ---------------------------------------------------------------------------
// restaurants/{restaurantId}/menuPhotos/{photoId}
//
// Foto del menu caricate dalla community. Chiunque sia autenticato può
// aggiungerne; solo l'autore può eliminare le proprie.
// ---------------------------------------------------------------------------
export interface MenuPhoto {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;          // 150px thumbnail
  uploadedBy: string;
  displayName: string;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// restaurants/{restaurantId}/reports/{reportId}
//
// Segnalazione di un problema su un ristorante. Una sola per utente
// per ristorante (aggiornabile).
// ---------------------------------------------------------------------------
export type ReportReason = 'closed' | 'incorrect_info' | 'hygiene' | 'inappropriate' | 'other';

export interface RestaurantReport {
  id: string;
  restaurantId: string;
  userId: string;
  displayName: string;
  reason: ReportReason;
  description: string;
  createdAt: Timestamp;
  status: ContentStatus;
}

export type CreateReportInput = Pick<RestaurantReport, 'reason' | 'description'>;

export type CreateContributionInput = {
  rating?: 1 | 2 | 3 | 4 | 5;
  text?: string;
  dishes: {
    name: string;
    description?: string;
    allergenSafe: AllergenId[];
    allergenContains?: AllergenId[];
    imageUri?: string;            // URI locale, upload nel service
  }[];
  confirmedCategories?: RestaurantCategoryId[];
};
