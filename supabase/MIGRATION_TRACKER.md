# Migrazione Firebase → Supabase

## Completati

### 1. Setup Supabase
- [x] Account Supabase creato e collegato a GitHub
- [x] Progetto creato con PostGIS abilitato
- [x] Variabili ambiente in `.env` (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY)
- [x] Client Supabase con AsyncStorage (`services/supabase.ts`)
- [x] Validazione runtime env vars in `supabase.ts`

### 2. Migrazioni SQL
- [x] `001_initial_schema.sql` — 9 tabelle, RLS, trigger, indici
- [x] `002_missing_tables.sql` — favorites, menu_photos, dish_likes
- [x] `003_functions_and_views.sql` — RPC: get_nearby_restaurants, get_restaurants_by_allergens, get_restaurant_stats

### 3. Policy RLS aggiunte manualmente (post-migration)
- [x] `profiles` INSERT: `WITH CHECK (auth.uid() = id)`
- [x] `profiles` DELETE: `USING (auth.uid() = id)`
- [x] `restaurants` DELETE: `USING (auth.uid() = added_by)`
- [x] `restaurants` INSERT: `WITH CHECK (auth.uid() = added_by)`
- [x] `restaurants` colonna `google_place_id` + UNIQUE INDEX

### 4. Storage
- [x] Bucket "images" creato (Public)
- [x] `services/storageService.ts` riscritto per Supabase Storage
- [x] Path-based ownership: userId come primo segmento (`{userId}/reviews/...`, `{userId}/dishes/...`, `{userId}/menus/...`)
- [x] Storage RLS policies: INSERT/UPDATE/DELETE scoped per path (`(storage.foldername(name))[1] = auth.uid()::text`)

### 5. Auth
- [x] `services/auth.ts` riscritto (Supabase Auth)
- [x] `contexts/AuthContext.tsx` aggiornato con nuovi tipi (AppUser, UserProfile)
- [x] Trigger `on_auth_user_created` rimosso — profilo creato da app code dopo signup
- [x] `ensureProfile()` per lazy profile creation (upsert idempotente)
- [x] Email confirmation disabilitata (per sviluppo)
- [x] `deleteAccount` verificato con `count: 'exact'` + errore esplicito

### 6. Servizi
- [x] `services/restaurantService.ts` riscritto (~900 righe → ~750 dopo audit)
- [x] `hooks/useRestaurantDetail.ts` riscritto
- [x] `hooks/useDishLikes.ts` aggiornato

### 7. Screens e componenti
- [x] Tutti gli screen in `app/restaurants/` aggiornati
- [x] Tutti i componenti in `components/restaurants/` aggiornati
- [x] `components/ProfileCard.tsx`, `components/RestaurantMap.native.tsx`
- [x] `app/restaurants/edit.tsx` eliminato (dati ristorante non modificabili)
- [x] `app/restaurants/add.tsx` con chip selector `cuisine_type` da lista standardizzata
- [x] Rename `ContributionCard` → `ReviewCard`, `add-contribution.tsx` → `add-review.tsx` (tutto il codebase)

### 8. Verifica e TypeScript
- [x] 0 errori TypeScript nell'app (escluso admin/)

### 9. Audit e fix (mar 2026)

#### Sicurezza
- [x] Storage RLS policies (path-based ownership)
- [x] Restaurant INSERT policy: `WITH CHECK (auth.uid() = added_by)`
- [x] Validazione lat/lng (range -90/90, -180/180) in `addRestaurant`
- [x] Validazione env vars a runtime in `supabase.ts`

#### Correttezza
- [x] Dedup ristoranti: check per `google_place_id` (non piu per nome)
- [x] `toggleFavorite` / `toggleDishLike`: error handling + try/catch con rollback ottimistico nei caller
- [x] `removeFavorite`: error handling corretto
- [x] `getAllRestaurants` / `getRestaurantsByUser`: stats reali (batch load reviews + favorites)
- [x] `deleteAccount`: policy DELETE + verifica count
- [x] `RestaurantHeader`: link Google Maps con `query_place_id` per POI diretto
- [x] ~~`parseLocation`: parser WKB hex~~ — rimosso (dead code, PostGIS restituisce geography come oggetto)
- [x] `getDishLikes`: riscritta con query two-step (dish IDs + likes), sostituisce join fragile
- [x] `getCuisineLabel()`: lookup centralizzato con Map O(1), usato in RestaurantHeader + RestaurantMap
- [x] `getAllRestaurants` / `getRestaurantsByUser`: fix divisione per zero (NaN quando favorites senza reviews)
- [x] `add-review.tsx` (ex `add-contribution.tsx`): rating obbligatorio (constraint DB: rating BETWEEN 1 AND 5)

#### Pulizia codebase (mar 2026)
- [x] Rename `contribution` → `review` in tutto il codebase (file, componenti, variabili, parametri)
- [x] Rimosso dead code: `isAvailable` export da `auth.ts` e `restaurantService.ts`
- [x] Rimosso `_displayName` parametro inutilizzato da `addRestaurant()`
- [x] Rimosso `avatarId` e `profileColor` legacy da `UserProfile`, aggiunto `profile_color: string | null`
- [x] `updateProfileColor()` riscritta: scrive in `profiles` table (non più `auth.user_metadata`)
- [x] Migrazione `profile_color`: `007_profile_color_column.sql`
- [x] Estratto helper `batchLoadStats()` + `applyStats()` in `restaurantService.ts` (~40 righe duplicate eliminate)
- [x] Estratto helper `uploadDishPhotos()` condiviso tra add/update review
- [x] `toggleFavorite`: riscritto con insert-then-catch-unique-violation (1 query invece di 2)
- [x] `add.tsx`: `searchTimeout` convertito da `useState` a `useRef` (fix React anti-pattern)
- [x] `edit-profile.tsx`: rimosso handling codici errore Firebase residuo

#### Centralizzazione valori hardcoded (mar 2026)
- [x] `constants/theme.ts`: aggiunti `spacing`, `radius`, `typography`, `iconSize`, `hitSlop`, `activeOpacity`
- [x] `constants/theme.ts`: aggiunti colori semantici: `amberDark`, `amberText`, `overlay`, `overlayDark`, `overlayLight`, `scrim`
- [x] ~50 colori hardcoded sostituiti con token semantici (`#FFFFFF` → `theme.colors.onPrimary`/`surface`, `#D32F2F` → `theme.colors.error`, ecc.)
- [x] `services/restaurantService.ts`: costanti `QUERY_LIMITS`, `DEFAULTS`, `PG_UNIQUE_VIOLATION`
- [x] `services/storageService.ts`: costanti `IMAGE_PRESETS` (thumbnail, dish, review, menu)

### 10. Test app (parziali)
- [x] Login / registrazione
- [x] Lista ristoranti
- [x] Aggiungere ristorante
- [x] Dettaglio ristorante
- [ ] Aggiungere recensione con piatti e foto
- [ ] Modifica/cancella recensione
- [ ] Preferiti (toggle + lista)
- [ ] Like piatti
- [ ] Foto menu
- [ ] Segnalazione
- [ ] Profilo utente (proprio + pubblico)
- [ ] Modifica profilo
- [ ] Logout
- [ ] Elimina account

---

## Da fare

### 11. Sicurezza (prima del rilascio)
- [x] RPC: cap su `radius_km` (max 50) e `max_results` (max 200) — plpgsql con stessa signature originale
- [x] RPC: `google_place_id` aggiunto ai RETURNS TABLE di entrambe le RPC
- [ ] Riabilitare email confirmation (produzione)

### 12. GDPR
- [x] Edge Function `delete-account` con `service_role` per eliminare utente da `auth.users`
- [x] Verificare che `ON DELETE SET NULL` funzioni su reviews/reports (dati anonimi restano)
- [x] Fix FK `restaurant_claims.reviewed_by` — aggiunto `ON DELETE SET NULL` (`005_fix_claims_reviewed_by_fk.sql`)
- [x] Rimosso codice errore Firebase residuo in `edit-profile.tsx`

### 13. Robustezza
- [x] `addReview` / `updateReview`: RPC atomica `upsert_review` (`006_upsert_review_rpc.sql`) — transazione PostgreSQL, SECURITY INVOKER
- [x] `toggleFavorite`: insert + catch unique violation (singola query, nessuna race condition)
- [x] `batchLoadStats()`: caricamento stats unificato per liste ristoranti (elimina duplicazione)
- [ ] RPC `get_restaurants_by_allergens`: fix performance (subquery scansiona tutte le reviews)
- [ ] `getRestaurant`: unificare in singola RPC (attualmente 2 request)
- [ ] `updateDisplayName`: rendere atomico (o accettare inconsistenza)

### 14. Admin dashboard (completato mar 2026)
- [x] Migrare `admin/` da Firebase a Supabase
- [x] Auth admin (Supabase + ruolo `admin` in profiles)
- [x] Dashboard statistiche (ristoranti, utenti, recensioni, segnalazioni pending)
- [x] Gestione ristoranti (lista, dettaglio, eliminazione)
- [x] Gestione utenti (lista, dettaglio con ristoranti e recensioni)
- [x] Gestione segnalazioni (filtri per stato/motivo, risolvi/archivia)
- [x] Rimosso Firebase SDK, firebase-admin, service-account-key
- [x] Config in `.env.local` (non piu hardcoded)
- [x] Script `set-admin` riscritto per Supabase
- [ ] Gestione claim ristoranti

### 15. Pulizia
- [x] `services/firebase.ts`: rimossi export `auth` e `storage` (non piu usati), resta solo `db` per traduzioni Firestore
- [x] `types/restaurants.ts`: rimossi tutti i tipi Firebase vecchi, restano solo `PlaceSuggestion`, `ReportReason`, `GeoPoint`
- [x] Rimosso `storage.rules` (Storage migrato a Supabase)
- [x] Aggiornato `firebase.json`: rimossa sezione storage
- [x] Rimosso trigger `handle_new_user` dal file `001_initial_schema.sql`
- [x] Droppata funzione `handle_new_user()` dal DB
- [x] Creato `004_hotfixes.sql` con tutte le policy e modifiche manuali consolidate
- [x] Rimosso dead code (`isAvailable`, `_displayName`, WKB parser, Firebase error codes)
- [x] Rimossi campi legacy da `UserProfile` (`avatarId`, `profileColor`)
- [x] Rename `contribution` → `review` (file, componenti, variabili, hook, route, parametri)
- [ ] `plugins/withModularHeaders.js`: resta necessario per Analytics + Remote Config, non modificabile ora
- [ ] Pacchetto `firebase` JS SDK: resta necessario per Firestore traduzioni card (`firestoreTranslations.ts`)

---

## Decisioni architetturali
- Firebase resta solo per: Analytics, Remote Config (banner + traduzioni card)
- Tutte le proprieta in snake_case (convenzione PostgreSQL)
- Rename chiave: contribution → review, googlePlaceId → id, displayName → display_name
- Le recensioni portano snapshot allergie utente (non join al profilo)
- Dati ristorante: source of truth e Google Places API, non modificabili da utenti
- `google_place_id` e la chiave di deduplicazione ristoranti
- Profilo creato da app code con `ensureProfile()` (non trigger DB) per evitare errore "Database error saving new user"
- `deleteAccount`: Edge Function `delete-account` elimina profilo (cascade) + auth.users con `service_role`
- Storage: path-based ownership (`{userId}/...`) con RLS per INSERT/UPDATE/DELETE
- Cuisine type: lista standardizzata in `constants/restaurantCategories.ts`, lookup O(1) con Map
- Design tokens: colori semantici (`onPrimary` per testo su primary, `surface` per sfondi container) per future dark mode
- Image presets: compressione centralizzata in `IMAGE_PRESETS` (thumbnail/dish/review/menu)
- Query constants: limiti e default centralizzati in `QUERY_LIMITS` e `DEFAULTS`
- Review atomiche: RPC `upsert_review` con transazione PostgreSQL + SECURITY INVOKER (RLS applicata)
