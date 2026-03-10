# AllergiApp - TODO

## Bug attivi

### [BUG] Filtri dietetici nella lista ristoranti non funzionano
**Priorita: ALTA** — `app/(tabs)/restaurants.tsx`

I chip "Gluten Free", "Vegan", "Vegetarian" non matchano nessun ristorante. Il filtro controlla `r.cuisine_types` ma quegli ID non finiscono mai in `cuisine_types` perche `add.tsx` e `add-review.tsx` mostrano solo tag cucina (pizza, sushi, ecc.).

**Opzioni:**
1. Rendere gluten_free/vegan/vegetarian votabili come tag cucina
2. Filtro separato basato sulle recensioni (ristoranti dove utenti vegani/celiaci hanno dato buone valutazioni)
3. Rimuovere temporaneamente i chip dietetici dalla lista

### [BUG] Edge Function `delete-account` non creata
Il codice app (`services/auth.ts`) chiama `supabase.functions.invoke('delete-account')`, ma la function non esiste in `supabase/functions/`. Serve crearla con `service_role` per eliminare l'utente da `auth.users`.

### [BUG] Bucket "images" Supabase Storage
Creare il bucket "images" (Public) dalla dashboard Supabase Storage. Upload foto non funziona senza.
*(Azione manuale da dashboard Supabase)*

---

## Prima del rilascio

### Sicurezza
- [ ] Riabilitare email confirmation in Supabase (attualmente disabilitata per sviluppo)

### Robustezza
- [ ] RPC `get_restaurants_by_allergens`: fix performance (subquery scansiona tutte le reviews)
- [ ] `getRestaurant`: unificare in singola RPC (attualmente 2 request separate)

### Test manuali
- [ ] Aggiungere recensione con piatti e foto
- [ ] Modifica/cancella recensione
- [ ] Preferiti (toggle + lista)
- [ ] Like piatti
- [ ] Foto menu
- [ ] Segnalazione ristorante
- [ ] Profilo utente (proprio + pubblico)
- [ ] Modifica profilo + galleria avatar
- [ ] Logout
- [ ] Elimina account

---

## Feature da completare

### Galleria avatar ("Pokedex")
Pagina `app/restaurants/avatar-gallery.tsx` creata con sistema unlock.
- [x] Pagina dedicata con griglia avatar
- [x] Sistema rarità (common/rare/epic/legendary)
- [x] Condizioni sblocco (free/reviews/restaurants)
- [x] Barra progresso per avatar bloccati
- [x] Rimosso picker avatar da edit-profile
- [ ] Creare le immagini per gli avatar bloccati (attualmente placeholder)
- [ ] Valutare nuovi avatar e condizioni di sblocco

### Admin dashboard
- [x] Migrata da Firebase a Supabase (mar 2026)
- [ ] Gestione claim ristoranti
- [ ] Deploy su Vercel

---

## Debito tecnico

### Due sistemi di diete/restrizioni non unificati
- `types/index.ts` — `DietId` (profilo utente ristoranti)
- `constants/dietModes.ts` — `DietModeId` (sezione card)
- Usati in contesti diversi ma creano confusione. Valutare se unificare.

### Refactor add-review.tsx (~920 righe)
- Estrarre sezione tag cucina in componente `CuisineTagsSection`
- Estrarre sezione esigenze alimentari in componente `DietaryNeedsSection`

### Dipendenze Firebase residue
- `@react-native-firebase/*` + `plugins/withModularHeaders.js`: necessari per Analytics + Remote Config
- Pacchetto `firebase` JS SDK: necessario per Firestore traduzioni card (`firestoreTranslations.ts`)

---

## Google Play / Android
In attesa: closed testing con 12 tester (inviato ~inizio mar 2026).
- [ ] Attendere completamento revisione closed testing
- [ ] Aggiungere profilo Android submit in `eas.json` (serviceAccount + track)
- [ ] Caricare AAB su Google Play Console e pubblicare
- [ ] Aggiornare link Google Play nel sito (`index.html`) quando pubblicata

## Deploy
- [ ] Deploy admin dashboard su Vercel
- [ ] Deploy sito landing su Vercel

## Futuri (quando il volume cresce)
- Clustering pin mappa (`react-native-map-clustering`)
- Scalabilita query geo — gia su PostGIS, valutare indici aggiuntivi
- Animazioni: migrare a `react-native-reanimated` + `react-native-gesture-handler`

---

## Completati
- [x] Migrazione Firebase → Supabase (auth, database, storage)
- [x] Admin dashboard migrata da Firebase a Supabase
- [x] Tag cucina multi-tag con voti community
- [x] 0 errori TypeScript (app + admin)
- [x] Galleria avatar con sistema unlock/rarità
- [x] Rimosso `RESTAURANTS_FEATURE.md` e `firestore.rules` obsoleti
- [x] Fix `image?: any` → `ImageSourcePropType` in BannerItem
- [x] Pre-traduzioni Firestore
- [x] Pulizia variabili EAS orfane e file obsoleti
- [x] Download lingua offline con pre-flight check
- [x] Sezione "Altri alimenti" con 13 cibi
- [x] Modalita dieta: vegetariano, gravidanza, allergia al nichel
- [x] Supporto other foods nelle lingue scaricabili
- [x] Foto review con thumbnails efficienti (JSONB `photos`)
- [x] Gallery foto utenti nella scheda ristorante
- [x] Badge esigenze alimentari colorati per categoria
