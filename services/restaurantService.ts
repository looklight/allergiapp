import {
  collection, collectionGroup, doc, getDoc, getDocs, updateDoc, setDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, writeBatch,
  Timestamp, increment,
  type QueryDocumentSnapshot,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';
import { db } from './firebase';
import { StorageService } from './storageService';
import { recalculateRating } from '../utils/rating';
import { isRemoteUrl } from '../utils/url';
import type {
  Restaurant,
  Dish,
  Review,
  Contribution,
  ContributionDish,
  FavoriteRestaurant,
  MenuPhoto,
  RestaurantReport,
  CreateRestaurantInput,
  CreateContributionInput,
  CreateReportInput,
} from '../types/restaurants';
import type { DietaryNeeds } from '../types';

// ─── Costanti collezioni ────────────────────────────────────────────────────

const RESTAURANTS = 'restaurants';
const DISHES = 'dishes';
const REVIEWS = 'reviews';
const CONTRIBUTIONS = 'contributions';
const FAVORITES = 'favorites';
const USERS = 'users';
const MENU_PHOTOS = 'menuPhotos';
const DISH_LIKES = 'dishLikes';
const REPORTS = 'reports';

// ─── Tipi pubblici ──────────────────────────────────────────────────────────

export type SortBy = 'recent' | 'rating' | 'popularity';

export interface GetRestaurantsOptions {
  cityNormalized?: string;
  category?: string;
  categories?: string[];
  sortBy?: SortBy;
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
}

export interface UserContributionWithRestaurant extends Contribution {
  restaurantId: string;
}

// ─── Helper privati ─────────────────────────────────────────────────────────

/** Upload immagini piatti e costruisci l'array ContributionDish[] finale. */
async function uploadAndMapDishes(
  inputDishes: CreateContributionInput['dishes'],
  restaurantId: string,
  contributionId: string,
  oldDishes?: ContributionDish[],
): Promise<ContributionDish[]> {
  return Promise.all(
    inputDishes.map(async (dish, index) => {
      let imageUrl: string | undefined;
      let thumbnailUrl: string | undefined;

      if (dish.imageUri) {
        if (isRemoteUrl(dish.imageUri)) {
          imageUrl = dish.imageUri;
          // In update: recupera thumbnailUrl esistente dal vecchio piatto
          thumbnailUrl = oldDishes?.find(d => d.imageUrl === dish.imageUri)?.thumbnailUrl;
        } else {
          const result = await StorageService.uploadDishImage(restaurantId, contributionId, index, dish.imageUri);
          imageUrl = result.imageUrl;
          thumbnailUrl = result.thumbnailUrl;
        }
      }

      return {
        name: dish.name,
        ...(dish.description && { description: dish.description }),
        ...(imageUrl && { imageUrl }),
        ...(thumbnailUrl && { thumbnailUrl }),
      };
    })
  );
}

/** Leggi il ristorante e applica ricalcolo rating sui updates del batch. */
async function applyRatingUpdate(
  restaurantRef: DocumentReference,
  oldRating: number,
  newRating: number,
  updates: Record<string, any>,
): Promise<void> {
  if (oldRating === newRating) return;
  const snap = await getDoc(restaurantRef);
  const data = snap.data();
  const r = recalculateRating(
    { averageRating: data?.averageRating ?? 0, ratingCount: data?.ratingCount ?? 0 },
    oldRating,
    newRating,
  );
  if (r.ratingCountDelta !== 0) updates.ratingCount = increment(r.ratingCountDelta);
  updates.averageRating = r.averageRating;
}

// ─── Restaurant CRUD ────────────────────────────────────────────────────────

async function getRestaurant(restaurantId: string): Promise<Restaurant | null> {
  try {
    const snap = await getDoc(doc(db, RESTAURANTS, restaurantId));
    if (!snap.exists()) return null;
    return { googlePlaceId: snap.id, ...snap.data() } as Restaurant;
  } catch (error) {
    console.warn('[RestaurantService] Errore getRestaurant:', error);
    return null;
  }
}

async function getRestaurants(
  options: GetRestaurantsOptions = {}
): Promise<{ restaurants: Restaurant[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  try {
    const sortMap: Record<SortBy, [string, 'desc']> = {
      recent: ['addedAt', 'desc'],
      rating: ['averageRating', 'desc'],
      popularity: ['favoriteCount', 'desc'],
    };
    const [sortField, sortDir] = sortMap[options.sortBy ?? 'recent'];

    const constraints: Parameters<typeof query>[1][] = [
      where('status', '==', 'active'),
      orderBy(sortField, sortDir),
      limit(options.limit ?? 20),
    ];

    if (options.cityNormalized) {
      constraints.push(where('cityNormalized', '==', options.cityNormalized));
    }
    const allCategories = options.categories ?? (options.category ? [options.category] : []);
    // Firestore supporta un solo array-contains per query: il primo va nella query, gli altri filtrati client-side
    if (allCategories.length > 0) {
      constraints.push(where('categories', 'array-contains', allCategories[0]));
    }
    if (options.startAfter) {
      constraints.push(startAfter(options.startAfter));
    }

    const q = query(collection(db, RESTAURANTS), ...constraints);
    const snapshot = await getDocs(q);
    let restaurants = snapshot.docs.map(
      d => ({ googlePlaceId: d.id, ...d.data() } as Restaurant)
    );
    // Filtro client-side per le categorie aggiuntive
    if (allCategories.length > 1) {
      const extra = allCategories.slice(1);
      restaurants = restaurants.filter(r =>
        extra.every(cat => (r.categories ?? []).includes(cat as any))
      );
    }
    const lastDoc = (snapshot.docs[snapshot.docs.length - 1] ?? null) as QueryDocumentSnapshot<DocumentData> | null;
    return { restaurants, lastDoc };
  } catch (error) {
    console.warn('[RestaurantService] Errore getRestaurants:', error);
    return { restaurants: [], lastDoc: null };
  }
}

async function getAllActiveRestaurants(): Promise<Restaurant[]> {
  try {
    const q = query(
      collection(db, RESTAURANTS),
      where('status', '==', 'active'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ googlePlaceId: d.id, ...d.data() } as Restaurant));
  } catch (error) {
    console.warn('[RestaurantService] Errore getAllActiveRestaurants:', error);
    return [];
  }
}

async function getNearbyRestaurants(lat: number, lng: number, radiusKm = 5): Promise<Restaurant[]> {
  try {
    const center: [number, number] = [lat, lng];
    const bounds = geohashQueryBounds(center, radiusKm * 1000);

    const promises = bounds.map(([start, end]) =>
      getDocs(query(
        collection(db, RESTAURANTS),
        where('status', '==', 'active'),
        where('geohash', '>=', start),
        where('geohash', '<=', end),
        orderBy('geohash'),
      ))
    );

    const snapshots = await Promise.all(promises);
    return snapshots
      .flatMap(snap => snap.docs)
      .map(d => ({ googlePlaceId: d.id, ...d.data() } as Restaurant))
      .filter(r => distanceBetween([r.location.latitude, r.location.longitude], center) <= radiusKm);
  } catch (error) {
    console.warn('[RestaurantService] Errore getNearbyRestaurants:', error);
    return [];
  }
}

async function addRestaurant(input: CreateRestaurantInput, userId: string, displayName?: string): Promise<Restaurant | null> {
  try {
    const now = Timestamp.now();
    const geohash = geohashForLocation([input.location.latitude, input.location.longitude]);

    const restaurant: Omit<Restaurant, 'googlePlaceId'> = {
      ...input,
      geohash,
      categories: input.categories ?? [],
      cuisineTypes: input.cuisineTypes ?? [],
      addedBy: userId,
      ...(displayName && { addedByName: displayName }),
      addedAt: now,
      updatedAt: now,
      status: 'active',
      reviewCount: 0,
      dishCount: 0,
      favoriteCount: 0,
      averageRating: 0,
      ratingCount: 0,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, RESTAURANTS, input.googlePlaceId), restaurant);
    batch.set(doc(db, USERS, userId), { restaurantsAdded: increment(1) }, { merge: true });
    await batch.commit();

    return { googlePlaceId: input.googlePlaceId, ...restaurant };
  } catch (error) {
    console.warn('[RestaurantService] Errore addRestaurant:', error);
    return null;
  }
}

async function getRestaurantsByUser(userId: string): Promise<Restaurant[]> {
  try {
    const q = query(
      collection(db, RESTAURANTS),
      where('addedBy', '==', userId),
      where('status', '==', 'active'),
      orderBy('addedAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ googlePlaceId: d.id, ...d.data() } as Restaurant));
  } catch (error) {
    console.warn('[RestaurantService] Errore getRestaurantsByUser:', error);
    return [];
  }
}

async function updateRestaurant(
  restaurantId: string,
  data: Partial<Pick<Restaurant, 'categories' | 'phone' | 'website' | 'cuisineTypes' | 'priceLevel'>>,
): Promise<boolean> {
  try {
    await updateDoc(doc(db, RESTAURANTS, restaurantId), {
      ...data,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.warn('[RestaurantService] Errore updateRestaurant:', error);
    return false;
  }
}

async function removeOwnRestaurant(restaurantId: string, userId: string): Promise<boolean> {
  try {
    const restaurantRef = doc(db, RESTAURANTS, restaurantId);
    const snap = await getDoc(restaurantRef);
    if (!snap.exists()) return false;

    const data = snap.data();
    if (data.addedBy !== userId) return false;
    if ((data.contributionCount ?? 0) > 0) return false;

    const batch = writeBatch(db);
    batch.delete(restaurantRef);
    batch.set(doc(db, USERS, userId), { restaurantsAdded: increment(-1) }, { merge: true });
    await batch.commit();

    return true;
  } catch (error) {
    console.warn('[RestaurantService] Errore removeOwnRestaurant:', error);
    return false;
  }
}

// ─── Legacy reads (piatti e recensioni pre-contributions) ───────────────────

async function getDishes(restaurantId: string): Promise<Dish[]> {
  try {
    const q = query(
      collection(db, RESTAURANTS, restaurantId, DISHES),
      where('status', '==', 'active'),
      orderBy('addedAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dish));
  } catch (error) {
    console.warn('[RestaurantService] Errore getDishes:', error);
    return [];
  }
}

async function getReviews(restaurantId: string): Promise<Review[]> {
  try {
    const q = query(
      collection(db, RESTAURANTS, restaurantId, REVIEWS),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
  } catch (error) {
    console.warn('[RestaurantService] Errore getReviews:', error);
    return [];
  }
}

// ─── Contributions ──────────────────────────────────────────────────────────

async function getContributions(restaurantId: string): Promise<Contribution[]> {
  try {
    const q = query(
      collection(db, RESTAURANTS, restaurantId, CONTRIBUTIONS),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contribution));
  } catch (error) {
    console.warn('[RestaurantService] Errore getContributions:', error);
    return [];
  }
}

async function getUserContribution(restaurantId: string, userId: string): Promise<Contribution | null> {
  try {
    const q = query(
      collection(db, RESTAURANTS, restaurantId, CONTRIBUTIONS),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() } as Contribution;
  } catch (error) {
    console.warn('[RestaurantService] Errore getUserContribution:', error);
    return null;
  }
}

async function getContributionsByUser(userId: string): Promise<UserContributionWithRestaurant[]> {
  try {
    const q = query(
      collectionGroup(db, CONTRIBUTIONS),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      // Path: restaurants/{restaurantId}/contributions/{contributionId}
      const restaurantId = d.ref.parent.parent?.id ?? '';
      return { id: d.id, restaurantId, ...d.data() } as UserContributionWithRestaurant;
    });
  } catch (error) {
    console.warn('[RestaurantService] Errore getContributionsByUser:', error);
    return [];
  }
}

async function addContribution(params: {
  restaurantId: string;
  input: CreateContributionInput;
  userId: string;
  displayName: string;
  userDietaryNeeds?: DietaryNeeds;
}): Promise<Contribution | null> {
  const { restaurantId, input, userId, displayName, userDietaryNeeds } = params;
  try {
    const contribRef = doc(collection(db, RESTAURANTS, restaurantId, CONTRIBUTIONS));
    const dishes = await uploadAndMapDishes(input.dishes, restaurantId, contribRef.id);
    const confirmedCategories = input.confirmedCategories ?? [];

    const contribution: Contribution = {
      id: contribRef.id,
      userId,
      displayName,
      ...(input.rating && { rating: input.rating }),
      ...(input.text && { text: input.text }),
      dishes,
      ...(confirmedCategories.length > 0 && { confirmedCategories }),
      ...(userDietaryNeeds && { userDietaryNeeds }),
      createdAt: Timestamp.now(),
      status: 'active',
    };

    // Aggiornamenti contatori ristorante
    const restaurantRef = doc(db, RESTAURANTS, restaurantId);
    const updates: Record<string, any> = {
      contributionCount: increment(1),
      updatedAt: Timestamp.now(),
    };
    if (input.dishes.length > 0) {
      updates.dishCount = increment(input.dishes.length);
    }
    for (const catId of confirmedCategories) {
      updates[`categoryVotes.${catId}`] = increment(1);
    }
    const firstImageUrl = dishes.find(d => d.imageUrl)?.imageUrl;
    if (firstImageUrl) {
      updates.thumbnailUrl = firstImageUrl;
    }
    if (input.rating) {
      await applyRatingUpdate(restaurantRef, 0, input.rating, updates);
    }

    const batch = writeBatch(db);
    batch.set(contribRef, contribution);
    batch.update(restaurantRef, updates);
    batch.set(doc(db, USERS, userId), { contributionsAdded: increment(1) }, { merge: true });
    await batch.commit();

    return contribution;
  } catch (error) {
    console.warn('[RestaurantService] Errore addContribution:', error);
    return null;
  }
}

async function updateContribution(params: {
  restaurantId: string;
  contributionId: string;
  input: CreateContributionInput;
  userId: string;
  displayName: string;
  oldContribution: Contribution;
  userDietaryNeeds?: DietaryNeeds;
}): Promise<Contribution | null> {
  const { restaurantId, contributionId, input, userId, displayName, oldContribution, userDietaryNeeds } = params;
  try {
    const contribRef = doc(db, RESTAURANTS, restaurantId, CONTRIBUTIONS, contributionId);
    const oldDishes = oldContribution.dishes;

    // Elimina immagini dei piatti rimossi o sostituiti
    const deletePromises: Promise<void>[] = [];
    for (const oldDish of oldDishes) {
      if (oldDish.imageUrl) {
        const stillUsed = input.dishes.some(
          d => isRemoteUrl(d.imageUri) && d.imageUri === oldDish.imageUrl
        );
        if (!stillUsed) {
          deletePromises.push(StorageService.deleteImageWithThumbnail(oldDish.imageUrl, oldDish.thumbnailUrl));
        }
      }
    }
    await Promise.all(deletePromises);

    const dishes = await uploadAndMapDishes(input.dishes, restaurantId, contributionId, oldDishes);
    const now = Timestamp.now();
    const newConfirmedCategories = input.confirmedCategories ?? [];
    const oldConfirmedCategories = oldContribution.confirmedCategories ?? [];

    const updatedContribution: Contribution = {
      id: contributionId,
      userId,
      displayName,
      ...(input.rating && { rating: input.rating }),
      ...(input.text && { text: input.text }),
      dishes,
      ...(newConfirmedCategories.length > 0 && { confirmedCategories: newConfirmedCategories }),
      ...(userDietaryNeeds && { userDietaryNeeds }),
      createdAt: oldContribution.createdAt,
      updatedAt: now,
      status: 'active',
    };

    // Aggiornamenti contatori ristorante
    const restaurantRef = doc(db, RESTAURANTS, restaurantId);
    const updates: Record<string, any> = { updatedAt: now };

    // Diff categorie
    for (const catId of newConfirmedCategories.filter(c => !oldConfirmedCategories.includes(c))) {
      updates[`categoryVotes.${catId}`] = increment(1);
    }
    for (const catId of oldConfirmedCategories.filter(c => !newConfirmedCategories.includes(c))) {
      updates[`categoryVotes.${catId}`] = increment(-1);
    }

    const firstImageUrl = dishes.find(d => d.imageUrl)?.imageUrl;
    if (firstImageUrl) {
      updates.thumbnailUrl = firstImageUrl;
    }
    const dishDelta = input.dishes.length - oldDishes.length;
    if (dishDelta !== 0) {
      updates.dishCount = increment(dishDelta);
    }
    await applyRatingUpdate(restaurantRef, oldContribution.rating ?? 0, input.rating ?? 0, updates);

    const batch = writeBatch(db);
    batch.set(contribRef, updatedContribution);
    if (Object.keys(updates).length > 1) {
      batch.update(restaurantRef, updates);
    }
    await batch.commit();

    return updatedContribution;
  } catch (error) {
    console.warn('[RestaurantService] Errore updateContribution:', error);
    return null;
  }
}

async function deleteContribution(
  restaurantId: string,
  contributionId: string,
  userId: string,
  contribution: Contribution,
): Promise<boolean> {
  try {
    const contribRef = doc(db, RESTAURANTS, restaurantId, CONTRIBUTIONS, contributionId);
    const restaurantRef = doc(db, RESTAURANTS, restaurantId);

    const updates: Record<string, any> = {
      contributionCount: increment(-1),
      updatedAt: Timestamp.now(),
    };
    if (contribution.dishes.length > 0) {
      updates.dishCount = increment(-contribution.dishes.length);
    }
    for (const catId of contribution.confirmedCategories ?? []) {
      updates[`categoryVotes.${catId}`] = increment(-1);
    }
    if (contribution.rating && contribution.rating > 0) {
      await applyRatingUpdate(restaurantRef, contribution.rating, 0, updates);
    }

    const batch = writeBatch(db);
    batch.delete(contribRef);
    batch.update(restaurantRef, updates);
    batch.set(doc(db, USERS, userId), { contributionsAdded: increment(-1) }, { merge: true });
    await batch.commit();

    // Elimina immagini piatti da Storage (best-effort, dopo il commit)
    for (const dish of contribution.dishes) {
      if (dish.imageUrl) {
        StorageService.deleteImageWithThumbnail(dish.imageUrl, dish.thumbnailUrl).catch(() => {});
      }
    }

    return true;
  } catch (error) {
    console.warn('[RestaurantService] Errore deleteContribution:', error);
    return false;
  }
}

// ─── Favorites ──────────────────────────────────────────────────────────────

async function getFavorites(userId: string): Promise<FavoriteRestaurant[]> {
  try {
    const q = query(
      collection(db, USERS, userId, FAVORITES),
      orderBy('savedAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as FavoriteRestaurant);
  } catch (error) {
    console.warn('[RestaurantService] Errore getFavorites:', error);
    return [];
  }
}

async function isFavorite(userId: string, restaurantId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, USERS, userId, FAVORITES, restaurantId));
    return snap.exists();
  } catch {
    return false;
  }
}

async function toggleFavorite(userId: string, restaurant: Restaurant): Promise<boolean> {
  try {
    const favRef = doc(db, USERS, userId, FAVORITES, restaurant.googlePlaceId);
    const restaurantRef = doc(db, RESTAURANTS, restaurant.googlePlaceId);
    const existing = await getDoc(favRef);

    const batch = writeBatch(db);
    if (existing.exists()) {
      batch.delete(favRef);
      batch.update(restaurantRef, { favoriteCount: increment(-1) });
      await batch.commit();
      return false;
    } else {
      const favorite: FavoriteRestaurant = {
        restaurantId: restaurant.googlePlaceId,
        savedAt: Timestamp.now(),
        name: restaurant.name,
        city: restaurant.city,
        countryCode: restaurant.countryCode,
        categories: restaurant.categories,
      };
      batch.set(favRef, favorite);
      batch.update(restaurantRef, { favoriteCount: increment(1) });
      await batch.commit();
      return true;
    }
  } catch (error) {
    console.warn('[RestaurantService] Errore toggleFavorite:', error);
    return false;
  }
}

async function removeFavorite(userId: string, restaurantId: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, USERS, userId, FAVORITES, restaurantId));
    batch.update(doc(db, RESTAURANTS, restaurantId), { favoriteCount: increment(-1) });
    await batch.commit();
  } catch (error) {
    console.warn('[RestaurantService] Errore removeFavorite:', error);
  }
}

async function removeOrphanedFavorite(userId: string, restaurantId: string): Promise<void> {
  try {
    const favRef = doc(db, USERS, userId, FAVORITES, restaurantId);
    const snap = await getDoc(favRef);
    if (snap.exists()) {
      await deleteDoc(favRef);
    }
  } catch {
    // silenzioso: cleanup best-effort
  }
}

// ─── Menu Photos ────────────────────────────────────────────────────────────

async function getMenuPhotos(restaurantId: string): Promise<MenuPhoto[]> {
  try {
    const q = query(
      collection(db, RESTAURANTS, restaurantId, MENU_PHOTOS),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuPhoto));
  } catch (error) {
    console.warn('[RestaurantService] Errore getMenuPhotos:', error);
    return [];
  }
}

async function addMenuPhoto(
  restaurantId: string,
  localUri: string,
  userId: string,
  displayName: string,
): Promise<MenuPhoto | null> {
  try {
    const photoRef = doc(collection(db, RESTAURANTS, restaurantId, MENU_PHOTOS));
    const { imageUrl, thumbnailUrl } = await StorageService.uploadMenuPhoto(restaurantId, photoRef.id, localUri);

    const menuPhoto: MenuPhoto = {
      id: photoRef.id,
      imageUrl,
      thumbnailUrl,
      uploadedBy: userId,
      displayName,
      createdAt: Timestamp.now(),
    };

    const batch = writeBatch(db);
    batch.set(photoRef, menuPhoto);
    batch.update(doc(db, RESTAURANTS, restaurantId), {
      menuPhotoCount: increment(1),
      updatedAt: Timestamp.now(),
    });
    await batch.commit();

    return menuPhoto;
  } catch (error) {
    console.warn('[RestaurantService] Errore addMenuPhoto:', error);
    return null;
  }
}

async function deleteMenuPhoto(
  restaurantId: string,
  photoId: string,
  userId: string,
): Promise<boolean> {
  try {
    const photoRef = doc(db, RESTAURANTS, restaurantId, MENU_PHOTOS, photoId);
    const snap = await getDoc(photoRef);
    if (!snap.exists() || snap.data().uploadedBy !== userId) return false;

    const data = snap.data();
    const batch = writeBatch(db);
    batch.delete(photoRef);
    batch.update(doc(db, RESTAURANTS, restaurantId), {
      menuPhotoCount: increment(-1),
      updatedAt: Timestamp.now(),
    });
    await batch.commit();

    // Elimina immagini da Storage (best-effort, dopo il commit)
    if (data.imageUrl) {
      StorageService.deleteImageWithThumbnail(data.imageUrl, data.thumbnailUrl).catch(() => {});
    }

    return true;
  } catch (error) {
    console.warn('[RestaurantService] Errore deleteMenuPhoto:', error);
    return false;
  }
}

// ─── Dish Likes ─────────────────────────────────────────────────────────────

async function getDishLikes(restaurantId: string): Promise<Map<string, string[]>> {
  try {
    const q = query(collection(db, RESTAURANTS, restaurantId, DISH_LIKES));
    const snapshot = await getDocs(q);
    const map = new Map<string, string[]>();
    for (const d of snapshot.docs) {
      const data = d.data();
      const key = `${data.contributionId}_${data.dishIndex}`;
      const existing = map.get(key) ?? [];
      existing.push(data.userId);
      map.set(key, existing);
    }
    return map;
  } catch (error) {
    console.warn('[RestaurantService] Errore getDishLikes:', error);
    return new Map();
  }
}

async function toggleDishLike(
  restaurantId: string,
  contributionId: string,
  dishIndex: number,
  userId: string,
): Promise<boolean> {
  try {
    const docId = `${contributionId}_${dishIndex}_${userId}`;
    const likeRef = doc(db, RESTAURANTS, restaurantId, DISH_LIKES, docId);
    const snap = await getDoc(likeRef);

    if (snap.exists()) {
      await deleteDoc(likeRef);
      return false; // unliked
    } else {
      await setDoc(likeRef, {
        contributionId,
        dishIndex,
        userId,
        createdAt: Timestamp.now(),
      });
      return true; // liked
    }
  } catch (error) {
    console.warn('[RestaurantService] Errore toggleDishLike:', error);
    return false;
  }
}

// ─── Reports ────────────────────────────────────────────────────────────────

async function getReports(restaurantId: string): Promise<RestaurantReport[]> {
  try {
    const q = query(
      collection(db, RESTAURANTS, restaurantId, REPORTS),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RestaurantReport));
  } catch (error) {
    console.warn('[RestaurantService] Errore getReports:', error);
    return [];
  }
}

async function getUserReport(restaurantId: string, userId: string): Promise<RestaurantReport | null> {
  try {
    const q = query(
      collection(db, RESTAURANTS, restaurantId, REPORTS),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    return { id: d.id, ...d.data() } as RestaurantReport;
  } catch (error) {
    console.warn('[RestaurantService] Errore getUserReport:', error);
    return null;
  }
}

async function addReport(
  restaurantId: string,
  input: CreateReportInput,
  userId: string,
  displayName: string,
): Promise<RestaurantReport | null> {
  try {
    // Controlla se esiste già un report attivo dell'utente
    const existing = await getUserReport(restaurantId, userId);

    if (existing) {
      // Aggiorna il report esistente
      const reportRef = doc(db, RESTAURANTS, restaurantId, REPORTS, existing.id);
      const updates = {
        reason: input.reason,
        description: input.description,
        displayName,
        status: 'active' as const,
      };
      await updateDoc(reportRef, updates);
      return { ...existing, ...updates };
    } else {
      // Crea nuovo report
      const batch = writeBatch(db);
      const restaurantRef = doc(db, RESTAURANTS, restaurantId);
      const reportRef = doc(collection(db, RESTAURANTS, restaurantId, REPORTS));
      const report: RestaurantReport = {
        id: reportRef.id,
        restaurantId,
        userId,
        displayName,
        reason: input.reason,
        description: input.description,
        createdAt: Timestamp.now(),
        status: 'active',
      };
      batch.set(reportRef, report);
      batch.update(restaurantRef, {
        reportCount: increment(1),
        updatedAt: Timestamp.now(),
      });
      await batch.commit();
      return report;
    }
  } catch (error) {
    console.warn('[RestaurantService] Errore addReport:', error);
    return null;
  }
}

// ─── Export ─────────────────────────────────────────────────────────────────

export const RestaurantService = {
  // Restaurant CRUD
  getRestaurant,
  getRestaurants,
  getNearbyRestaurants,
  getAllActiveRestaurants,
  addRestaurant,
  getRestaurantsByUser,
  updateRestaurant,
  removeOwnRestaurant,
  // Legacy reads
  getDishes,
  getReviews,
  // Contributions
  getContributions,
  getUserContribution,
  getContributionsByUser,
  addContribution,
  updateContribution,
  deleteContribution,
  // Favorites
  getFavorites,
  isFavorite,
  toggleFavorite,
  removeFavorite,
  removeOrphanedFavorite,
  // Menu Photos
  getMenuPhotos,
  addMenuPhoto,
  deleteMenuPhoto,
  // Dish Likes
  getDishLikes,
  toggleDishLike,
  // Reports
  getReports,
  getUserReport,
  addReport,
  isAvailable: () => true,
};
