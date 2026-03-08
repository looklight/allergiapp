# Fase 3 — Feature Ristoranti

Branch: `feature/restaurants` (parte da `feature/other-restrictions`)

---

## Panoramica

Feature social che permette agli utenti di aggiungere ristoranti, segnalare piatti
sicuri per allergie, salvare preferiti, scrivere recensioni e visualizzare i locali
su mappa. Disabilitata in produzione tramite Remote Config (`restaurants_enabled = false`),
sempre attiva in development (`__DEV__ = true`).

---

## Stato avanzamento

### Completato

#### Schema e tipi
- [x] `types/restaurants.ts` — interfacce TypeScript complete
  - `Restaurant`, `Dish`, `Review`, `FavoriteRestaurant`, `RestaurantUserProfile`
  - `Contribution`, `ContributionDish`, `MenuPhoto`, `RestaurantReport`
  - `PlaceSuggestion`, `CreateRestaurantInput`, `CreateDishInput`, `CreateReviewInput`, `CreateContributionInput`, `CreateReportInput`
  - `GeoPoint` come interfaccia plain per compatibilità con Google Places
  - `ContentStatus = 'pending' | 'active' | 'removed'` per moderazione

#### Servizi
- [x] `services/auth.ts` — AuthService (signUp, signIn, signOut, onAuthStateChanged, getUserProfile)
- [x] `contexts/AuthContext.tsx` — React Context per stato autenticazione Firebase
- [x] `services/restaurantService.ts` — RestaurantService completo (CRUD, geo query, batch writes)
- [x] `services/placesService.ts` — Google Places REST API (autocomplete + place details)
- [x] `services/remoteConfig.ts` — flag `restaurants_enabled: __DEV__`

#### Schermate app
- [x] Tab bar con "Le mie allergie" e "Ristoranti"
- [x] Lista ristoranti con filtri allergie e paginazione
- [x] Dettaglio ristorante (allergie, piatti, recensioni, preferiti, contributi, menu photos)
- [x] Aggiunta ristorante in 2 step (Google Places → allergie)
- [x] Lista preferiti con optimistic update
- [x] Form aggiunta piatto (sicuro per / contiene)
- [x] Mappa con marker, callout, posizione utente, debounce pan
- [x] Auth screens (login, signup)

#### Admin Dashboard (`admin/`)
- [x] Dashboard con statistiche (ristoranti attivi/pending/rimossi, totale utenti)
- [x] Lista ristoranti con moderazione (pending → active / removed)
- [x] Dettaglio ristorante (info, contributi, segnalazioni, moderazione)
- [x] Lista utenti con contatori attività e paginazione
- [x] Dettaglio utente (profilo, ristoranti aggiunti, contributi)
- [x] Lista segnalazioni
- [x] Auth admin via Firebase Auth custom claims

#### Firestore Rules e Indexes
- [x] Rules complete: admin con custom claim, contributi, reports, menu photos, dish likes
- [x] Indici compositi deployati (vedi `firestore.indexes.json`)

---

### Prossimi passi

- [ ] **Barra di ricerca** testuale nella lista ristoranti
- [ ] **UI review** — miglioramenti visivi dopo test su simulatore
- [ ] **i18n** — tradurre testi hardcoded IT nelle schermate (ultimo step prima del rilascio)

---

### Da configurare (esterne al codice)

#### Firebase Console
- [ ] Abilitare **Firebase Authentication** con provider Email/Password
- [ ] Creare database **Firestore** (modalità produzione)

#### Google Places API
- [ ] Creare API key su Google Cloud Console
- [ ] Abilitare Places API
- [ ] Inserire in `GOOGLE_PLACES_API_KEY` (letta da `app.config.ts`)

#### Remote Config (Firebase Console)
- [ ] Creare parametro `restaurants_enabled` (Boolean, default `false`)
- [ ] Impostare a `true` quando la feature è pronta

---

### Prima del rilascio in produzione

- [ ] Test end-to-end su device fisico
- [ ] i18n — tradurre testi UI (almeno EN oltre a IT)
- [ ] Incrementare `version` e `buildNumber` in `app.config.ts`
- [ ] Attivare `restaurants_enabled = true` su Remote Config
- [ ] Portare fix `useTrackingPermission` su `main`

---

## Schema Firestore

```
users/{userId}
  displayName, email, photoURL?, avatarId?, profileColor?, createdAt
  restaurantsAdded, dishesAdded, reviewsAdded

  favorites/{restaurantId}
    restaurantId, savedAt, name, city, countryCode, categories

restaurants/{googlePlaceId}
  name, address, city, cityNormalized, country, countryCode
  location: { latitude, longitude }, geohash
  categories[], cuisineTypes[]?, phone?, website?, priceLevel?
  addedBy, addedByName?, addedAt, updatedAt
  status, reviewCount, dishCount, favoriteCount, contributionCount?
  averageRating, ratingCount, thumbnailUrl?
  categoryVotes?, menuPhotoCount?, reportCount?

  contributions/{contributionId}
    userId, displayName, rating?, text?, dishes[], confirmedCategories?
    createdAt, updatedAt?, status

  menuPhotos/{photoId}
    imageUrl, thumbnailUrl?, uploadedBy, displayName, createdAt

  reports/{reportId}
    restaurantId, userId, displayName, reason, description
    createdAt, status

  dishes/{dishId}
    name, description?, allergenSafe[], allergenContains?[]
    addedBy, addedAt, status

  reviews/{reviewId}
    userId, displayName, text, rating, imageUrl?
    createdAt, updatedAt?, status

  dishLikes/{likeId}
    userId
```

---

## Note tecniche

### Pattern lazy require (Firebase, Maps, Tracking)
Moduli nativi usano lazy require per compatibilità con Expo Go e web.

### geofire-common v6
- `geohashForLocation([lat, lng])` (NON `geohashForPoint`)
- `geohashQueryBounds(center, radiusMeters)` per query geografiche

### Scritture atomiche
Operazioni multi-documento usano `batch.commit()` per consistenza.

### Compatibilità schema con Altrove
Campi `googlePlaceId`, `name`, `address`, `city`, `country`, `countryCode`, `location`, `geohash` identici a Altrove.

### Versioni dipendenze critiche
- `react-native-maps`: **1.20.1** — non aggiornare a 1.21+ senza New Architecture
- `@react-native-firebase/*`: **v23.8.6** — richiede plugin `withModularHeaders.js`
