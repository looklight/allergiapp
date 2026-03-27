# AllergiApp - TODO

## Bug attivi

---

## Prima del rilascio

### Privacy & GDPR
- [ ] **Scrivere Privacy Policy** — i dati allergenici sono dati sanitari (GDPR Art. 9), serve documento formale prima del lancio. Punti chiave da coprire: finalità del trattamento (personalizzazione + statistiche anonime aggregate), nessuna associazione dato↔identità, diritto di cancellazione (già implementato), base giuridica del consenso esplicito.
- [ ] **Linkare Privacy Policy** nell'onboarding dietary (placeholder già presente nel codice, cercare `TODO: sostituire con link reale`)
- [ ] **Consenso esplicito dati sanitari** — valutare se aggiungere checkbox separato per il trattamento dati allergenici (requisito GDPR Art. 9 per consenso esplicito, distinto dai T&C generali)
- [ ] **Termini di Servizio** — documento separato dalla privacy policy

### Azioni manuali Supabase
- [ ] **Conferma email / anti-spam** — attualmente disabilitata. Opzioni prima del go-live:
  - **Opzione A (consigliata):** flusso OTP — Supabase manda codice 6 cifre, utente lo inserisce in-app. Zero deep link, flusso moderno. Richiede schermata OTP + logica in `signup.tsx`.
  - **Opzione B:** link di conferma — richiede deep link (`allergiapp://auth/confirm`) + schermata "Controlla la tua email" + gestione `onAuthStateChange`. Il flusso attuale si romperebbe senza questi.
  - **Opzione C (minima):** lasciare disabilitata e alzare i rate limit in Supabase Dashboard → *Authentication → Rate Limits*. Sufficiente per app di nicchia su App Store (Apple ID è già un filtro forte).
  - ⚠️ Non abilitare la conferma senza implementare prima A o B — navigherebbe all'onboarding senza sessione attiva.

### Test manuali
- [ ] Aggiungere recensione con piatti e foto
- [ ] Modifica/cancella recensione
- [ ] Preferiti (toggle + lista da profilo)
- [ ] Foto menu
- [ ] Segnalazione ristorante
- [ ] Profilo utente (contatori dinamici, preferiti, recensioni)
- [ ] Profilo pubblico
- [ ] Modifica profilo + galleria avatar
- [ ] Logout
- [ ] Elimina account

---

## Feature da implementare

### Like alle recensioni
**Priorità: media**

Permettere agli utenti di mettere like alle recensioni più utili. Serve a:
- Dare visibilità alle recensioni di qualità
- Aiutare chi legge a identificare i contributi più affidabili
- Creare un incentivo per scrivere recensioni dettagliate

**Da valutare:**
- Tabella `review_likes` (userId + reviewId, unique constraint)
- Ordinamento recensioni per like count vs. data
- Limite like per utente non autenticato (solo utenti registrati)
- Connessione con il sistema di gerarchia utenti (vedi sotto)

---

### Gerarchia utenti e riconoscimento community
**Priorità: bassa — da pianificare dopo il lancio**

Gli utenti più attivi e contributivi dovrebbero essere riconoscibili e "premiati" rispetto a chi usa l'app in modo passivo. Crea fiducia nelle recensioni e incentiva la partecipazione.

**Idee:**
- **Livelli/badge** basati su attività: numero recensioni, ristoranti aggiunti, like ricevuti, anzianità
- **Titoli visibili** nel profilo e accanto alle recensioni (es. "Contributor", "Top Reviewer", "Explorer")
- **Peso recensioni** — le recensioni di utenti con alto livello potrebbero avere più visibilità
- **Connessione con la galleria avatar esistente** — il sistema di rarità (common/rare/epic/legendary) e sblocco per recensioni/ristoranti è già una base, può evolvere in questo senso

**Da valutare:** soglie di attività, come mostrarlo in UI, se esporre il livello pubblicamente nelle recensioni

---

### Scheda ristorante come bottom sheet (stile Google Maps)
**Priorità: media** — da fare dopo il merge di `feature/restaurants-v2` in `main`

Attualmente la scheda ristorante si apre come schermata laterale. L'obiettivo è che si apra dal basso come Google Maps, con la mappa e la lista visibili dietro.

**Approccio:**
1. Estrarre il contenuto di `app/restaurants/[id].tsx` in un componente `RestaurantDetailSheet` (usa già `useRestaurantDetail` hook, che è separato)
2. In `app/(tabs)/restaurants.tsx`, quando si tocca un ristorante, mostrare `RestaurantDetailSheet` in un secondo `DraggableBottomSheet` sovrapposto alla lista
3. La lista sheet si abbassa parzialmente, la detail sheet appare sopra con snap points [0.55, 0.92]
4. `app/restaurants/[id].tsx` continua ad esistere per navigazioni dirette (da preferiti, recensioni, profilo, ecc.)

**File coinvolti:**
- `app/restaurants/[id].tsx` → estrarre UI in `components/restaurants/RestaurantDetailSheet.tsx`
- `app/(tabs)/restaurants.tsx` → gestire `selectedDetailId` + seconda sheet
- `components/DraggableBottomSheet.tsx` → già funzionante, nessuna modifica prevista

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

## Supporto Web
Il branch ristoranti funziona al 100% su iOS e Android. Su web funziona all'80-85%.

### Mappa web con Leaflet
- [ ] Installare `react-leaflet`, `leaflet`, `@types/leaflet`, `react-leaflet-cluster`
- [ ] Riscrivere `RestaurantMap.web.tsx` con Leaflet + OpenStreetMap (gratuito, nessuna API key)
- [ ] Supporto clustering marker su web
- [ ] Il file nativo (`RestaurantMap.native.tsx`) resta invariato

### Miglioramenti UX web minori
- [ ] Nascondere pulsante camera su web in `add-review.tsx` (`Platform.OS !== 'web'`)
- [ ] Sostituire `Alert` con modal custom per coerenza visiva cross-platform
- [ ] Verificare responsive layout su schermi desktop

## Ristoranti — Miglioramenti DB & Backend

### Priorità alta
- [ ] **Indexes mancanti** — aggiungere index su `restaurants.added_by`, `restaurants.owner_id`, `reviews.created_at`, `profiles.role`. Senza questi, le RLS policy eseguono seq scan su ogni operazione di write
- [ ] **Paginazione review** — `getReviews()` carica tutte le review senza limit. Aggiungere paginazione (cursor-based o offset) per evitare OOM su ristoranti popolari
- [ ] **`voteCuisines` non atomico** — DELETE + INSERT in due chiamate separate senza transazione. Se l'app crasha tra le due, i voti vanno persi. Spostare in una RPC con transazione unica

### Priorità media
- [ ] **`toggleFavorite` anti-pattern** — usa try/catch su errore PostgreSQL 23505 (UNIQUE violation) per toggle. Sostituire con RPC che usa `INSERT ... ON CONFLICT DO NOTHING RETURNING id` (atomico, nessuna race condition)
- [ ] **Claim → owner_id non automatizzato** — quando un claim viene approvato (`status = 'approved'`), nessun trigger setta `restaurants.owner_id`. Aggiungere trigger `AFTER UPDATE ON restaurant_claims` che assegni automaticamente l'owner
- [ ] **Premium non verificato server-side** — `is_premium` e `subscription_expires_at` esistono ma nessuna RPC o policy verifica che la subscription sia ancora attiva. Un ristorante scaduto continua ad avere priorità nell'ordinamento (`ORDER BY is_premium DESC`)

### Priorità bassa
- [x] **Droppare `review_dishes` e `dish_likes`** — tabelle deprecate dalla migration 015 (foto migrate a `reviews.photos` JSONB). La `upsert_review` fa ancora `DELETE FROM review_dishes` inutilmente
- [ ] **FK inconsistente `restaurant_cuisine_votes`** — referenzia `auth.users` direttamente invece di `profiles` come tutte le altre tabelle
- [ ] **Audit schema Supabase vs app** — verificare che tutte le colonne/tabelle del DB siano ancora usate e coerenti con il codice attuale. Sospetti: colonna `dish_rating` (potrebbe essere legacy), tabelle `review_dishes` e `dish_likes` (già segnalate sopra), eventuali colonne orfane aggiunte in migrazioni intermedie. Confrontare lo schema live con le RPC e i tipi TypeScript.

## Futuri (quando il volume cresce)
- Scalabilita query geo — gia su PostGIS, valutare indici aggiuntivi
- Animazioni: migrare a `react-native-reanimated` + `react-native-gesture-handler`
- **Uniformare le pagine e integrare la card nella scheda ristorante** — idea da investigare: mostrare la card allergenica direttamente nella pagina del ristorante, così l'utente ha in un unico posto sia le info del locale che la sua card da mostrare al cameriere. Valutare coerenza visiva con il resto dell'app e se ha senso come punto di accesso alternativo alla card.
- **`getRestaurant` — unificare in singola RPC** — attualmente fa 2 request separate (SELECT restaurants + RPC get_restaurant_stats). Ottimizzazione non urgente, da fare solo se l'apertura scheda ristorante risulta lenta in produzione.

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
- [x] Edge Function `delete-account` implementata e deployata
- [x] Policy storage bucket "images" (`008_storage_policies.sql`)
- [x] Bucket "images" creato (Public) su Supabase Storage
- [x] Migrazione `019_admin_rls_policies.sql` eseguita (policy RLS per admin)
- [x] Audit codice e fix (mar 2026): RLS admin, null checks, file size limit, context memoization, error handling, stale request protection, safe JSON parse
- [x] Profilo: rimosso stat "Piatti" (legacy), contatori dinamici (ristoranti, recensioni, preferiti)
- [x] Preferiti spostati dall'header ristoranti alla sezione profilo
- [x] Tooltip spiegazione tag cucina (tap per info community)
- [x] Badge cucina senza emoji nei callout mappa
- [x] Keyboard dismiss su tap mappa, marker select, drag bottom sheet
- [x] Fix scroll marker→lista: useEffect reattivo al posto di setTimeout
- [x] Card selezionata evidenziata con sfondo primaryLight
- [x] Gate autenticazione su filtri e recensioni (redirect login)
- [x] Preferenza "Per me" persistente in AsyncStorage

---

## Note
- Valutare se passare alla gestione nativa del menu dal basso (tab bar). Verificare se c'e un vantaggio concreto rispetto all'implementazione attuale.
