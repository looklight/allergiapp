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

---

### Risposte alle recensioni (solo ristoranti premium)
**Priorità: media — da fare DOPO il merge restaurants-v2 e il flusso claim completo**

I gestori dei ristoranti certificati (premium) possono rispondere pubblicamente alle recensioni degli utenti, come su Google Maps e Tripadvisor. Una sola risposta per recensione, modificabile e cancellabile.

**Dipendenze bloccanti (da completare prima):**
1. Merge `feature/restaurants-v2` in `main`
2. Trigger `claim → owner_id` (debito tecnico — quando un claim viene approvato dall'admin, `restaurants.owner_id` deve essere settato automaticamente)
3. Infrastruttura `isPremiumActive` (colonna `is_premium` + verifica `subscription_expires_at`)

**DB — già da fare ora (migration `029_review_replies.sql`):**
```sql
CREATE TABLE review_replies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id) -- una sola risposta per recensione
);
-- RLS: tutti leggono, solo owner del ristorante premium può scrivere/modificare/eliminare
```

**Codice app (da fare dopo le dipendenze):**
- [ ] Aggiornare `getReviews` per fare LEFT JOIN con `review_replies`
- [ ] Aggiungere `reply?: { text, createdAt, updatedAt }` a `Review` e `UnifiedReview`
- [ ] Service: `addReviewReply(reviewId, text)`, `updateReviewReply(replyId, text)`, `deleteReviewReply(replyId)`
- [ ] Hook `useRestaurantDetail`: `handleAddReply`, `handleEditReply`, `handleDeleteReply` con optimistic update
- [ ] `ReviewCard`: blocco risposta indentato sotto la recensione (icona + "Risposta del locale" + nome ristorante + testo + data)
- [ ] `ReviewCard`: pulsante "Rispondi" / "Modifica" visibile solo se `user.uid === review.restaurantOwnerId`
- [ ] Input risposta: `Alert.prompt` inline (stesso pattern del menu URL) o modale dedicata

**UI — come appare:**
```
┌─ Avatar  Nome utente          ★★★★☆ ─┐
│  "Ottimo posto, personale attento..."  │
│  [👍 3]                                │
│                                        │
│  ┌─ 🏪 Risposta del locale ──────────┐ │
│  │ "Grazie mille! Vi aspettiamo..."  │ │
│  │ 12 apr 2026                       │ │
│  └───────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

### Notifiche per incentivare le recensioni
**Priorità: bassa — da valutare dopo il lancio**

Ricordare agli utenti di lasciare una recensione dopo una visita a un ristorante salvato tra i preferiti o cercato di recente. L'obiettivo è aumentare il numero di recensioni con esigenze alimentari, che sono il cuore del valore dell'app.

**Messaggio chiave:** "Sei stato da [ristorante]? Aiuta altri con allergie a scegliere in sicurezza — lascia una recensione."

**Canali da valutare:**
- **Push notification** — richiede `expo-notifications`, permesso esplicito utente. Trigger: X giorni dopo l'aggiunta ai preferiti senza recensione, oppure geofencing se nel raggio del ristorante (più invasivo).
- **In-app prompt** — banner o modale alla riapertura dell'app dopo N giorni dall'ultimo accesso alla scheda ristorante senza aver scritto recensione. Meno intrusivo, nessun permesso aggiuntivo.
- **Email** — tramite Supabase Edge Function + servizio email (es. Resend). Richiede consenso esplicito GDPR.

**Considerazioni:**
- Partire dall'in-app prompt (zero permessi, zero infrastruttura aggiuntiva)
- Limitare a 1 reminder per ristorante per non essere invasivi
- Collegabile al sistema gerarchia utenti: recensioni scritte dopo il reminder potrebbero valere di più per i badge
- Valutare A/B test sul copy del messaggio

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

Attualmente la scheda ristorante si apre come schermata separata. L'obiettivo è che si apra dal basso come Google Maps: la mappa rimane sempre visibile, tap su pin o card della lista fa emergere il dettaglio dal basso senza cambiare pagina.

**Infrastruttura già pronta:**
- `DraggableBottomSheet` già funzionante con snap points configurabili
- `useRestaurantDetail` hook già separato dalla UI
- `selectedId` state già in `restaurants.tsx`

**Approccio:**
1. Estrarre il contenuto di `app/restaurants/[id].tsx` in `components/restaurants/RestaurantDetailSheet.tsx` (riusa `useRestaurantDetail` che è già hook puro)
2. In `app/(tabs)/restaurants.tsx` aggiungere `selectedDetailId` state; intercettare il `router.push` su tap card/callout e invece impostare questo state
3. Mostrare `RestaurantDetailSheet` in un secondo `DraggableBottomSheet` sovrapposto, snap points `[0.55, 0.92]`
4. Quando la detail sheet si apre, il list sheet si abbassa al punto minimo
5. `app/restaurants/[id].tsx` resta per navigazioni dirette (preferiti, recensioni, profilo, deep link notifiche)

**File coinvolti:**
- `app/restaurants/[id].tsx` → estrarre UI in `components/restaurants/RestaurantDetailSheet.tsx`
- `app/(tabs)/restaurants.tsx` → gestire `selectedDetailId` + seconda sheet + coordinamento snap
- `components/RestaurantMap.native.tsx` → il callout `onPress` intercettato invece di `router.push`
- `components/DraggableBottomSheet.tsx` → nessuna modifica prevista

**Rischi e punti di attenzione:**
- **Gesture conflict tra due sheet sovrapposti** — due `PanResponder` annidati: verificare che lo swipe sul detail sheet non attivi il list sheet sottostante
- **Modal annidati** — la detail sheet contiene `PhotoGalleryModal` e altri modal; testare che si comportino correttamente dentro uno sheet
- **Azioni secondarie** — "Aggiungi recensione", "Segnala", "Modifica" navigano a pagine separate: dal sheet possono fare `router.push` normalmente (e il sheet si chiude), oppure diventare modal inline (da decidere)
- **Android back button** — con lo sheet, il tasto back deve chiudere il detail sheet (non navigare indietro); gestire con `BackHandler`

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

### Ristoranti Premium (certificati)
**Priorità: media — da pianificare dopo la stabilizzazione del lancio**

Distinzione tra ristoranti base (aggiunti dalla community) e ristoranti premium (verificati/certificati). La colonna `is_premium` esiste già su `restaurants`, manca il flusso completo.

**Funzionalità esclusive premium:**
- **Menu digitale** — link o caricamento PDF/immagini (già nascosto nell'UI, da riabilitare per premium)
- **Risposta alle recensioni** — il gestore può rispondere pubblicamente alle recensioni degli utenti
- **Badge "Verificato"** nella lista ristoranti e nella scheda, con tooltip esplicativo
- **Priorità nell'ordinamento** — già implementata (`ORDER BY is_premium DESC`), da sfruttare esplicitamente
- **Statistiche avanzate** — quanti utenti con allergie X li hanno visitati, andamento recensioni, allergie più cercate per quel locale
- **Link prenotazione** — integrazione TheFork / OpenTable / URL custom
- **Foto di copertina** — immagine hero personalizzata nella scheda (attualmente solo foto dalle recensioni)
- **Notifiche al gestore** — nuova recensione ricevuta, nuovo preferito aggiunto

**Flusso da costruire:**
1. Utente/gestore richiede claim dal profilo ristorante (`restaurant_claims` esiste già)
2. Admin approva il claim dall'admin dashboard → trigger setta `owner_id` + eventualmente `is_premium`
3. Gestore accede a sezione "Il mio ristorante" con feature aggiuntive
4. Subscription / scadenza gestita tramite `subscription_expires_at` (colonna già presente)

**Note:**
- Il trigger `claim → owner_id` è già nel debito tecnico (nessun automatismo attuale)
- Valutare se `is_premium` viene dato con il claim o separatamente (es. freemium: claim gratuito, feature premium a pagamento)

### Admin dashboard
- [x] Migrata da Firebase a Supabase (mar 2026)
- [ ] Gestione claim ristoranti
- [ ] Deploy su Vercel

---

## Debito tecnico

### Due sistemi di diete/restrizioni — intenzionalmente separati
- `types/index.ts` — `DietId` → profilo utente ristoranti (filtro "Per me", salvato su Supabase)
- `constants/dietModes.ts` — `DietModeId` → sezione card (UI, colori, traduzioni, restrizioni auto-select)
- Scopi distinti, non da unificare. `pregnancy` esiste solo in card, `vegan` solo in DietId.

### Google Places API — dati gratuiti non ancora sfruttati
- [ ] **Confrontare `primaryType` con le cucine dell'app** — Google restituisce già la categoria del locale (es. `italian_restaurant`, `sushi_restaurant`) nel campo `primaryType` (Basic Data, già pagato). Mapparlo sulle `cuisine_types` esistenti per pre-compilare il campo durante l'inserimento. Richiede una tabella di mapping `googleType → CuisineId`.
- [ ] **Decidere quali altri campi Basic Data includere** — campi gratuiti/già pagati non ancora richiesti: `types` (array di categorie), `photos` (riferimenti foto), `plusCode`, `viewport`. Da valutare se e quali portare nella `FieldMask` e nel DB.

### Refactor add-review.tsx (~920 righe)
- Estrarre sezione tag cucina in componente `CuisineTagsSection`

### Dipendenze Firebase residue
- `@react-native-firebase/*` + `plugins/withModularHeaders.js`: necessari per Analytics + Remote Config
- Pacchetto `firebase` JS SDK: necessario per Firestore traduzioni card (`firestoreTranslations.ts`)

---


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
- [ ] **FK inconsistente `restaurant_cuisine_votes`** — referenzia `auth.users` direttamente invece di `profiles` come tutte le altre tabelle
- [ ] **Audit schema Supabase vs app** — verificare che tutte le colonne/tabelle del DB siano ancora usate e coerenti con il codice attuale. Sospetti: colonna `dish_rating` (potrebbe essere legacy), eventuali colonne orfane aggiunte in migrazioni intermedie. Confrontare lo schema live con le RPC e i tipi TypeScript.

## Futuri (quando il volume cresce)
- Scalabilita query geo — gia su PostGIS, valutare indici aggiuntivi
- **DraggableBottomSheet → reanimated** — attualmente usa `PanGestureHandler` (RNGH) + `Animated` built-in (RN), perché `react-native-reanimated` crasha in Expo Go (native module JSI non inizializzabile). Funziona correttamente su tutte le piattaforme. Quando si passerà a development build (`npx expo prebuild`), reanimated funzionerà nativamente e si potrà riscrivere il componente con worklet per avere gesture handling sul UI thread anche durante il drag — ottimizzazione marginale, non necessaria
- **Uniformare le pagine e integrare la card nella scheda ristorante** — idea da investigare: mostrare la card allergenica direttamente nella pagina del ristorante, così l'utente ha in un unico posto sia le info del locale che la sua card da mostrare al cameriere. Valutare coerenza visiva con il resto dell'app e se ha senso come punto di accesso alternativo alla card.
- **Consolidamento query dettaglio ristorante in singola RPC** — `useRestaurantDetail` fa 9 query parallele (ristorante+stats, recensioni, foto menu, segnalazioni, voti cucina + 4 query utente). Creare una RPC `get_restaurant_detail(id, user_id)` che ritorna tutto in un'unica chiamata. Tradeoff: meno latenza ma logica SQL più complessa e meno flessibile durante lo sviluppo. **Da fare quando la scheda ristorante è completata e lo schema si è stabilizzato.**

---

## Completati
- [x] Like alle recensioni (tabella `review_likes`, trigger `likes_count`, RPC `toggle_review_like`, optimistic update UI)
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
- [x] Droppare `review_dishes` e `dish_likes` — migrazione 027, upsert_review e get_restaurant_stats aggiornate
- [x] App pubblicata su Google Play

---

## Note
- Valutare se passare alla gestione nativa del menu dal basso (tab bar). Verificare se c'e un vantaggio concreto rispetto all'implementazione attuale.
