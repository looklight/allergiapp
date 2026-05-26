# AllergiApp - TODO

---

## Pre-release blockers

### Privacy & GDPR
- [ ] **Scrivere Privacy Policy** — i dati allergenici sono dati sanitari (GDPR Art. 9), serve documento formale prima del lancio. Punti chiave da coprire: finalità del trattamento (personalizzazione + statistiche anonime aggregate), nessuna associazione dato↔identità, diritto di cancellazione (già implementato), base giuridica del consenso esplicito.
- [ ] **Linkare Privacy Policy** nell'onboarding dietary (placeholder già presente nel codice, cercare `TODO: sostituire con link reale`)
- [ ] **Consenso esplicito dati sanitari** — valutare se aggiungere checkbox separato per il trattamento dati allergenici (requisito GDPR Art. 9 per consenso esplicito, distinto dai T&C generali)
- [ ] **Termini di Servizio** — documento separato dalla privacy policy

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
- [ ] **Flow end-to-end "Utente inattivo"** — creare account test, scrivere review con foto + caricare menu photo, cancellare l'account, poi da un secondo account verificare che entrambi i contenuti restino visibili con label "Utente inattivo" + icona `account-off-outline`. Verifica analoga sulla admin dashboard. Chiude la verifica del fix Edge Function `delete-account` (deployato 2026-05-17, PR #1/#2/#3).

### Azioni manuali Supabase
- [ ] **Conferma email / anti-spam** — attualmente disabilitata. Verificare schermate per conferma email.
- [x] **Allineata tabella `translations`** (2026-05-16) — 71/71 lingue caricate via `node scripts/uploadToSupabase.js`. Coperti commit `98a101c` (tree nuts: almonds/hazelnuts/walnuts/pistachios/cashews + completamenti 8 lingue) e `902bae6` (yeast + artificial_colorings).

### Social Auth (Google + Apple) — MERGED in main 2026-05-19
Setup esterno completato. Feature mergiata in main (commit `6b0d9f3`). Distribuita su TestFlight 1.1.0 (8) + OTA redesign brand-consistent. Vedi memoria `project_social_auth.md` per credenziali e architettura.

- [x] **Test E2E iOS** (2026-05-19) — Google + Apple sign-in funzionanti su TestFlight 1.1.0 (8). Onboarding post-OAuth verificato. Profili Supabase creati correttamente.
- [x] **Verifica concern nonce** (2026-05-19) — confermato issue, risolto con workaround "Skip nonce checks" ON su Supabase Auth Providers (pattern raccomandato per mobile native). Sicurezza residua adeguata (HTTPS + token expiration + audience/issuer validation).
- [x] **Merge `feature/social-auth` in main** (2026-05-19, commit `6b0d9f3`).
- [x] **Redesign bottoni brand-consistent** (2026-05-19) — distribuito via OTA al canale beta. Pattern Spotify/Airbnb (Google 4-colori SVG inline, Apple nero+mela bianca, dimensioni speculari).
- [ ] **Test E2E su Android Internal Testing** — AAB pronto (`94fc37e6-d8f2-4ad6-89f8-9d1de89e355d`, versionCode 17 → potrebbe essere già usato, valutare se serve rebuild a 18). Apple non disponibile su Android, testare solo Google.
- [ ] **Rotate Google Web Client Secret** — il secret è stato esposto in chat durante il setup (2026-05-18). Rischio reale basso ma best practice: Google Cloud → OAuth Client `AllergiApp Web (Supabase)` → "+ ADD SECRET" → "Disable" sul vecchio → aggiornare valore in Supabase Dashboard.

### Social Auth — polish non bloccante
- [ ] **Pre-fill nickname da Apple `fullName`** — Apple restituisce nome+cognome SOLO al primo sign-in. Attualmente lo ignoriamo. Catturarlo in `socialAuth.ts` e passarlo a `onboarding-nickname` come suggerimento iniziale del campo username. Lavoro: ~15 min.
- [ ] **Errori specifici per provider** — `SocialAuthButtons` mostra alert generico per tutti gli errori. Più granularità (network/configurazione/cancel/altro) sarebbe UX migliore. Lavoro: ~20 min.
- [ ] **`GoogleSignin.configure` al boot** — attualmente lazy (al primo signIn). Best practice è chiamarlo una volta in `_layout.tsx` o `socialAuth.ts` come side-effect. Lavoro: ~5 min.
- [ ] **Nonce proper implementation** — togliere "Skip nonce checks" e generare nonce client-side (random + SHA-256, pass a Google/Apple SDK + originale a Supabase). Sicurezza extra teorica, non priorità per mobile (HTTPS già protegge). Lavoro: ~30 min.
- [ ] **JWT Apple scade 14 nov 2026** (180 giorni dal setup, max imposto da Apple). Rigenerazione con lo stesso script Node usato in setup (`crypto.sign` con ES256). Se nessuno usa Apple Sign In da web/browser puoi anche ignorare la scadenza (il flow nativo iOS non usa questo JWT).

---

## Aperti — bug & cleanup

**Vincolo assoluto Android:** ogni fix deve essere Android-only via `Platform.OS === 'android'` o equivalente. iOS è "perfetta" e non va toccato in nessun caso.

### Lag generale Android
Tutto sembra meno fluido che su iOS. Da capire se è Expo Go (~5x più lento per via di dev mode + niente Hermes optimizations) o se ci sono problemi reali.

- [ ] **Prima di indagare oltre**: testare in un EAS build (dev-client o internal testing) per escludere l'overhead di Expo Go
- [ ] Se persiste in EAS: profiler RN, controllare re-render eccessivi (FlatList senza keyExtractor stabile, useState in componenti grossi), Reanimated worklets che fanno troppo, immagini non ottimizzate (vedi roadmap migrazione a `expo-image` nella sezione Gestione immagini)
- [ ] Verificare che Hermes sia attivo nel build (default in SDK 54 ma controllare)

### Cleanup Google Cloud (non urgente)
- [ ] Rimuovere "Maps SDK for Android" dalla chiave `Places API Key - Android` nel progetto `allergiapp-488223`. Ora ridondante perché esiste la chiave dedicata `Maps SDK - Android` (UID `eb66e008-…`) usata da `GOOGLE_MAPS_API_KEY_ANDROID` su EAS. Verificare prima che il build prod successivo continui a caricare la mappa.

### Tier 2 — Rimuovere dipendenze Firebase Remote Config — STAGED 2026-05-16
- [x] Rimosso `@react-native-firebase/remote-config` da `package.json` + `package-lock.json` (npm install eseguito).
- [x] Rimossi dal plugin `plugins/withModularHeaders.js` i pod orfani: `FirebaseRemoteConfig`, `FirebaseABTesting`, `FirebaseSharedSwift`.
- [x] **Lasciato `FirebaseRemoteConfigInterop`** — verificato in `ios/Podfile.lock:184` che è dipendenza transitiva di `FirebaseCrashlytics`. Toglierlo romperebbe Crashlytics.
- [ ] `npx expo prebuild --clean` — rimandato al prossimo build naturale (no rebuild dedicato)
- [ ] Build EAS verifica con check Crashlytics — al prossimo build prod/preview
- **Beneficio reale:** 3 pod in meno nel bundle iOS (~500KB-1MB stimati). **Costo:** edit puri già fatti, prebuild/build amortizzati sul prossimo build naturale.

### Splash screen Android — uniformare background a tutto schermo
**Stato (2026-05-16): risolto in light mode su EAS Android (build 1.1.0). In dark mode di sistema lo splash mostrava un rettangolo crema su sfondo nero: causa root `AppTheme` ereditava da `Theme.AppCompat.DayNight.NoActionBar` e in night mode il `windowBackground` cadeva sul dark di default. Aggiunto hardening night-mode al plugin — da verificare al prossimo build EAS.**

- [x] Plugin custom `plugins/withAndroidWindowBackground.js` (background `#F7DCB3` via `withAndroidColors` + `withAndroidStyles`) — registrato in `app.config.ts`. Solo Android, iOS intatto.
- [x] Verifica su device EAS in light mode: splash uniforme.
- [x] Esteso plugin con `withAndroidColorsNight` per scrivere `app_window_background = #F7DCB3` anche in `values-night/colors.xml`. Coerente con `userInterfaceStyle: "light"` di app.config.ts: la app non ha dark mode, lo splash deve essere identico in qualunque mode di sistema.
- [ ] Verifica al prossimo build EAS Android (anche su device con dark mode attiva).

---

## Feature roadmap

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
- I gestori dei ristoranti certificati (premium) possono rispondere pubblicamente alle recensioni degli utenti, come su Google Maps e Tripadvisor. Una sola risposta per recensione, modificabile e cancellabile.

**Flusso da costruire:**
1. Utente/gestore richiede claim dal profilo ristorante (`restaurant_claims` esiste già)
2. Admin approva il claim dall'admin dashboard → trigger setta `owner_id` + eventualmente `is_premium`
3. Gestore accede a sezione "Il mio ristorante" con feature aggiuntive
4. Subscription / scadenza gestita tramite `subscription_expires_at` (colonna già presente)

**Note:**
- Il trigger `claim → owner_id` è già nel debito tecnico (nessun automatismo attuale)
- Valutare se `is_premium` viene dato con il claim o separatamente (es. freemium: claim gratuito, feature premium a pagamento)

### Condivisione ristorante (native share + deep link)
**Priorità: bassa — da pianificare, due fasi**

Pulsante "Condividi" nella scheda ristorante che apre lo share sheet nativo iOS/Android. L'utente sceglie l'app (WhatsApp, iMessage, Mail, ecc.) e invia un messaggio precompilato con nome + indirizzo + link a `allergiapp.com/r/<id>`.

**Fase 1 — share semplice (zero rischio, OTA-compatibile, ~1-2h):**
- `Share.share({ message, url })` da `react-native` nel componente scheda ristorante
- Pagina pubblica sulla landing (`landing` branch su Vercel) tipo `allergiapp.com/r/[id]` che mostra nome/foto/indirizzo + CTA "Apri in AllergiApp / Scarica"
- Meta tag OG base per anteprima link in iMessage/WhatsApp
- Limite: chi ha già l'app fa comunque due tap (link → browser → CTA → app)

**Fase 2 — Universal Links (rebuild nativo, no OTA):**
- Aggiungere `associated-domains` in `app.config.ts` (entitlement iOS)
- Servire `apple-app-site-association` (iOS) e `assetlinks.json` (Android) dalla landing
- Configurare deep linking expo-router per route `/restaurants/[id]`
- Risultato: il link apre direttamente la scheda nell'app se installata, fallback browser altrimenti
- Rischio: se la config è sbagliata i link non aprono l'app, ma l'app non crasha. Va testato in TestFlight prima di prod.

**Note:**
- [x] Tracciamento `restaurant_shared` su Supabase `analytics_events` (vedi snapshot Analytics sotto).
- Valutare se includere allergeni filtrati / dieta nel link (es. `?diet=vegan`) per pre-filtrare la scheda all'apertura
- Privacy: il link è pubblico, non esporre info utente che condivide

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

### Prompt recensione store (In-App Review nativo)
**Priorità: bassa — da pianificare dopo aver consolidato un seed di utenti soddisfatti**

Mostrare il popup nativo "Lascia una recensione" che molte app usano (StoreKit `SKStoreReviewController` su iOS, Google Play In-App Review API su Android). L'overlay è renderizzato dall'OS sopra la app, l'utente recensisce senza uscire — sembra integrato perché lo è a livello di sistema.

**Libreria:** `expo-store-review` (wrapper Expo ufficiale, ~100-200 KB su Android via `play-core`, zero overhead su iOS).

**Trigger consigliato:** subito dopo che l'utente lascia una recensione 4-5 stelle a un ristorante. È il momento con più alta probabilità di rating positivo (utente già in mood "feedback positivo"). Evitare trigger generici tipo "ha aperto la card N volte" — non sai se l'esperienza in ristorante è andata bene.

**Limiti da rispettare:**
- iOS: max 3 prompt/anno per utente, il sistema può ignorare la chiamata silenziosamente. Sprecarli su utenti tiepidi abbassa il rating medio.
- Fallback "Lascia recensione" da settings via `StoreReview.storeUrl()` + `Linking.openURL` per chi vuole farlo spontaneamente.

**Costo:** richiede native rebuild (non OTA-able) + bump `buildNumber`/`versionCode`. Plug-and-play, nessuna config nel `plugins/` custom.

### Gerarchia utenti e riconoscimento community
**Priorità: bassa — da pianificare dopo il lancio**

Gli utenti più attivi e contributivi dovrebbero essere riconoscibili e "premiati" rispetto a chi usa l'app in modo passivo. Crea fiducia nelle recensioni e incentiva la partecipazione.

**Idee:**
- **Livelli/badge** basati su attività: numero recensioni, ristoranti aggiunti, like ricevuti, anzianità
- **Titoli visibili** nel profilo e accanto alle recensioni (es. "Contributor", "Top Reviewer", "Explorer")
- **Peso recensioni** — le recensioni di utenti con alto livello potrebbero avere più visibilità
- **Connessione con la galleria avatar esistente** — il sistema di rarità (common/rare/epic/legendary) e sblocco per recensioni/ristoranti è già una base, può evolvere in questo senso

**Da valutare:** soglie di attività, come mostrarlo in UI, se esporre il livello pubblicamente nelle recensioni

### Traduzione recensioni in lingua app
**Priorità: bassa — da pianificare, decisione ancora aperta**

Mostrare le recensioni scritte in lingue diverse da quella dell'utente, senza tradurre tutto a tappeto (costi + sicurezza alimentare: una traduzione approssimativa su "il cameriere ha capito le mie allergie" può fuorviare).

**Pattern dominante in altre app** (Google Maps, TripAdvisor, Airbnb, Instagram, Booking): originale visibile + bottone "Traduci" sotto → tap = mostra traduzione + "Mostra originale".

**Strategia raccomandata (D→C, costo ~0€):**
- On-device first: Apple Translation framework (iOS 17.4+) / ML Kit (Android) — gratis, privato, offline
- Fallback edge function Supabase + MyMemory per lingue non coperte
- Cache server-side per `hash(testo)+lingua_target` (non per `review_id+lingua`) → 100 utenti italiani sulla stessa review spagnola = 1 sola traduzione
- Skip se source==target o testo <30 char ("Buonissimo!" non serve tradurre)
- Disclaimer "Tradotto automaticamente" sotto il testo tradotto
- NON usare Google Cloud Translate (incompatibile con direzione rimozione Firebase/Google)

**Prerequisiti già coperti:**
- Campo `reviews.language` salvato all'insert in `add-review.tsx:144` (bug noto: non aggiornato su edit, vedi sezione dedicata in questo TODO — fixabile insieme oppure skippabile se si va on-device con auto-detect)

**Chiavi i18n predisposte da aggiungere quando si implementa:** `restaurants.review.translate`, `showOriginal`, `translatedBy`.

**Effort stimato:** 1-2 giorni per versione base (originale + bottone + cache). Edge case da curare: auto-detect lingua reale del testo (spesso uno scrive in EN pur avendo app in IT), invalidazione cache su edit recensione, rate-limit per utente.

**Trigger per upgrade a paid:** solo quando MyMemory inizia a tornare 429 con regolarità. A quel punto: Microsoft Translator (2M char/mese gratis) o DeepL (500k). NON Google.

Dettagli e contesto storico: `memory/project_review_translation.md`.

### Filtrare POI nativi della mappa (nascondere business, tenere landmark)
**Priorità: bassa**

I pin nativi di Apple Maps / Google Maps (negozi, ristoranti, bar) danno fastidio e "sporcano" la mappa, ma vanno mantenuti i luoghi di interesse (Colosseo, musei, parchi).

**Android (Google Maps):**
- Soluzione immediata: prop `customMapStyle` su `MapView` con JSON che nasconde `poi.business` e mantiene `poi.attraction`, `poi.park`, `poi.government`
- Zero codice nativo, solo JSON in `components/RestaurantMap.native.tsx`

**iOS (Apple MapKit):**
- `react-native-maps` non espone `MKPointOfInterestFilter` (controllo granulare per categoria)
- `showsPointsOfInterest` è solo true/false → perderebbe anche il Colosseo
- Opzioni:
  1. Patch nativa Swift + config plugin Expo per esporre `pointOfInterestFilter` (pulita, ~30-50 righe)
  2. Passare a `PROVIDER_GOOGLE` anche su iOS (uniforma stile, ma richiede Google Maps iOS SDK + API key iOS, build più pesante, perde look Apple)
  3. Accettare all-or-nothing con `showsPointsOfInterest={false}`

**Approccio consigliato:** partire da (1) Android con `customMapStyle` come quick win, poi valutare patch nativa iOS se il fastidio giustifica la complessità.

### Galleria avatar ("Pokedex")
Pagina `app/restaurants/avatar-gallery.tsx` creata con sistema unlock.
- [x] Pagina dedicata con griglia avatar
- [x] Sistema rarità (rimosso apr 2026 — over-engineering per 11 avatar)
- [x] Condizioni sblocco (free/reviews/restaurants/likes_received/countries_reviewed/likes_to_dietary_reviews)
- [x] Barra progresso per avatar bloccati
- [x] Rimosso picker avatar da edit-profile
- [x] Sistema notifica popup nuovi sblocchi (UnlockedAvatarsContext + popup globale)
- [x] Cleanup avatar legacy + default plate_main_logo a livello DB (migration 049)
- [ ] Creare le immagini per gli avatar bloccati (attualmente placeholder)
- [ ] Valutare nuovi avatar e condizioni di sblocco

### Avatar gamification — miglioramenti pianificati
**Priorità: bassa — polish UX, da fare quando l'app cresce**

- [ ] **Badge "NUOVO" sugli avatar appena sbloccati nella galleria** — dopo che il popup è stato confermato, l'utente entra in galleria ma non sa quali sono i nuovi. Soluzione: tracciare un set `viewed_in_gallery` (oltre a `seen_unlocked_avatars`) e mostrare un piccolo badge/glow finché l'utente non li ha "visti" tappandoli o scorrendoci sopra. ~30 min. Effort medio, valore UX alto se la gamification cresce.
- [ ] **Aggregazioni server-side via RPC Postgres** — oggi `fetchUnlockStats` fa 5 query parallele e somma/distinct lato client. Per utenti con >100 recensioni significa scaricare molte righe per fare `SUM`/`COUNT DISTINCT`. Una RPC `get_user_unlock_stats(uid) RETURNS jsonb` farebbe tutto server-side: ~10ms e ~1KB di traffico invece di ~50KB. **Da fare quando avrai utenti con >100 recensioni**, prima è premature optimization.

### Admin dashboard
- [x] Migrata da Firebase a Supabase (mar 2026)
- [x] Deploy su Vercel — live su https://admin.allergiapp.com (branch `admin-prod`)
- [ ] Gestione claim ristoranti
- [ ] Allineare display country alla nuova source-of-truth `country_code` (app mobile fatta 2026-05-17). Admin oggi mostra ancora il campo `country` testuale (es. "Italy"/"Italia" mescolati). Su Next.js Node è disponibile `Intl.DisplayNames` nativo, ma per coerenza si può importare `constants/countryNames.ts` dall'app o riusare la stessa mappa.
- [ ] **Pagina Media — RPC `get_media_countries()`** per popolare il filtro Paese. Oggi `admin/src/app/media/page.tsx` fa 2 query che scaricano una riga per ogni foto/recensione solo per estrarre le country distinte: pragmatico ma spreca banda. Quando i media superano ~50k, sostituire con `SELECT DISTINCT r.country FROM restaurants r WHERE EXISTS (menu_photos) OR EXISTS (reviews con photos)` lato DB.

---

## Tech debt

### Scalabilità — analisi 2026-04-28
Analisi completa fatta su `feature/restaurants-v2`. L'app non è pronta per migliaia di utenti / ristoranti / recensioni in questa forma. Problemi e fix ordinati per priorità:

**Critici (bloccherebbero con 1000+ utenti)**
- [ ] **Materialized view per stats ristorante** — `get_restaurants_for_my_needs` aggrega review con subquery O(N×M): 500 ristoranti × 100k review = 50M row scan per chiamata. Fix: colonne `review_count`, `avg_rating`, `favorite_count` pre-calcolate su `restaurants` aggiornate da trigger su insert/delete review. Medio effort (~mezza giornata), massimo impatto. (`get_restaurant_stats` per singolo ristorante già ottimizzato in migration 039.)
- [ ] **Rate limiting sulle RPC** — nessun limite attuale. 1000 utenti che fanno pan della mappa = ~2000 RPC/sec → DOS garantito. Fix minimo: throttle lato client più aggressivo (attuale debounce 800ms non basta); fix completo: middleware Supabase Edge Function o pg_net rate limit per IP.

**Alti (degradano l'UX con dati reali)**
- [ ] **FlatList per reviews in `ReviewsSection`** — usa `.map()`, nessuna virtualizzazione. Con 50+ review accumulate lo scroll perde frame. Fix: sostituire con `FlatList` + `removeClippedSubviews={true}` + `windowSize={5}`. Effort basso (~2-3h).
- [ ] **Filtrare `allPins` al viewport corrente prima del render** — oggi `allPins` accumula pin di tutte le aree visitate (cap 3000). Un cap fisso (`slice`) peggiorerebbe l'UX (pin spariscono tornando su aree già visitate). Fix corretto: passare solo i pin nel bounding box corrente, come fanno Google Maps/Yelp. Da fare quando il DB avrà abbastanza ristoranti da rendere il problema reale.

**Medi (ottimizzazioni)**
- [ ] **`reviewPhotos` useMemo deps** — array di 100+ foto ricalcolato ad ogni sort change / like toggle / loadMore. Restringere le dipendenze. `ReviewsSection.tsx`. Effort minimo.
- [ ] **Pre-compute `allergen_match_count`** — sort `relevance` esegue `INTERSECT` array per ogni review paginata (30 INTERSECT/pagina). Aggiungere colonna calcolata o fare insieme alla materialized view. Effort medio, da fare in coppia col punto 1.

### `reviews.language` non aggiornato su edit — fix differito
**Priorità: bassa — da rivalutare quando si implementerà la traduzione recensioni**

Verificato 2026-04-26 durante refactor i18n ristoranti. Il campo `reviews.language` viene popolato correttamente all'**insert** ma NON viene aggiornato sull'**edit** di una recensione, in due punti:

1. **Client** (`app/restaurants/add-review.tsx:130-137`): `RestaurantService.updateReview` viene chiamato senza passare `language`. Anche la signature di `updateReview` in `services/reviewService.ts:195-202` non accetta il parametro.
2. **Database** (RPC `upsert_review` in `supabase/migrations/027_drop_review_dishes.sql`): la `SET` clause dell'`UPDATE` quando `p_review_id IS NOT NULL` non include la colonna `language`.

**Conseguenza**: se un utente crea una recensione in IT, cambia lingua app a EN e poi riscrive il commento in inglese, la riga DB resta `language = 'it'` con commento in EN. Inconsistenza dato/realtà.

**Perché differito**: la traduzione recensioni è rimandata (vedi `memory/project_review_translation.md`). Senza consumatore del campo, dato sporco = dato che nessuno legge. Volume del danno minimo (utente raramente edita + cambia lingua). Recuperabile in futuro con un backfill o auto-detect dal testo.

**Fix minimo quando servirà** (~1h):
1. Migration `051_review_language_update.sql`: aggiungere `language = COALESCE(p_language, language)` alla SET clause + CHECK constraint ISO 639-1 (`CHECK (language IS NULL OR language ~ '^[a-z]{2}(-[A-Z]{2})?$')`)
2. `services/reviewService.ts updateReview`: aggiungere parametro `language?: string` e passare come `p_language`
3. `app/restaurants/add-review.tsx`: passare `language: i18n.locale` anche su edit

**Opzionali da differire ulteriormente**:
- Backfill di righe NULL (review pre-migration 011)
- Indice su `language` (utile solo se si fanno aggregazioni su milioni di righe)

**Possibile alternativa**: se la strategia di traduzione sarà on-device (Apple Translation / ML Kit), questi framework rilevano la lingua da soli dal testo. In quel caso `reviews.language` diventa hint non autoritativo e il fix potrebbe non servire affatto.

### `PhotoGalleryModal` — pulsante "Leggi tutto" non appare al primo render
**Priorità: bassa — workaround parziale già presente (funziona dopo swipe)**

Il meccanismo di rilevamento troncatura testo usa un `Text` nascosto (`measureText`, `position: absolute, opacity: 0`) senza `numberOfLines` per misurare le righe reali via `onTextLayout`. La logica è corretta e funziona dopo uno swipe avanti/indietro tra foto.

**Problema**: al primo render dentro la `Modal` animata (Reanimated + GestureDetector), il layout nativo non è ancora stabilizzato quando `onTextLayout` si triggera, quindi la misurazione restituisce valori errati e `textTruncated` rimane `false`. Il pulsante "Leggi tutto" non compare finché un re-render successivo (es. swipe) non forza una nuova misurazione a layout stabilizzato.

**Tentativi già fatti e falliti** (maggio 2026):
- `left: 0, right: 0` sul View di misura → stessa radice
- `height: 0, overflow: hidden` → `onTextLayout` potrebbe non triggerare
- `onTextLayout` sul testo visibile con conta caratteri → `numberOfLines` restituisce tutte le righe in alcune versioni RN
- `useEffect + key` per forzare remount post-mount → non ha risolto

**Debug necessario**: aggiungere `console.log` nell'`onTextLayout` per vedere quante righe e con quale larghezza viene misurato al primo render vs. dopo lo swipe. Richiede dev build sul dispositivo.

**File**: `components/restaurants/PhotoGalleryModal.tsx` — funzione `onTextLayout` alla riga ~196

### Separare la dashboard admin in repository indipendente
**Priorità: bassa — non urgente**

Attualmente `admin/` vive dentro il repo `allergiapp/` ed è presente su tutti i branch. Questo causa confusione: versioni diverse dell'admin su branch diversi, rischio di sovrascritture durante i merge, ambiguità su quale sia la versione "vera". Per ora la regola operativa è: **modifiche admin solo su `admin-prod`**.

Soluzione a lungo termine: spostare `admin/` in un repo separato con il proprio deploy Vercel. App e admin non condividono codice direttamente (client Supabase separati, nessun tipo condiviso rilevante).

### Due sistemi di diete/restrizioni — intenzionalmente separati
- `types/index.ts` — `DietId` → profilo utente ristoranti (filtro "Per me", salvato su Supabase)
- `constants/dietModes.ts` — `DietModeId` → sezione card (UI, colori, traduzioni, restrizioni auto-select)
- Scopi distinti, non da unificare. `pregnancy` esiste solo in card, `vegan` solo in DietId.

### Google Places API — dati gratuiti non ancora sfruttati
- [x] **Mappare `primaryType` sulle cucine dell'app** — `GOOGLE_TYPE_TO_CUISINE` implementato in `services/placesService.ts`, `primaryType` incluso nella `FieldMask`.
- [ ] **Decidere quali altri campi Basic Data includere** — campi gratuiti/già pagati non ancora richiesti: `types` (array di categorie), `photos` (riferimenti foto), `plusCode`, `viewport`. Da valutare se e quali portare nella `FieldMask` e nel DB.

---

## Qualità codice & DevOps

### Testing
- [ ] Aggiungere Jest + React Native Testing Library
- [ ] Scrivere test per i service critici: `restaurantService`, `auth`, `translationService`
- [ ] Scrivere test per i custom hook principali (`useRestaurantDetail`, `useRestaurantGeo`)

### CI/CD — GitHub Actions
- [ ] Workflow base su PR: `tsc --noEmit` + lint + test
- [ ] Valutare EAS build preview automatico su PR

### Error reporting
- [ ] Valutare Sentry per error reporting (source maps, breadcrumbs, crash reporting)

### Performance
- [ ] Aggiungere `useMemo`/`useCallback` negli screen con liste e computazioni ripetute
- [ ] Ottimizzare FlatList: `removeClippedSubviews`, `maxToRenderPerBatch`, `React.memo` sugli item
- [ ] Spezzare componenti grossi: `RestaurantDetailBody` (619 righe), `RestaurantMap` (411), `card.tsx` (473)

---

## Gestione immagini — ottimizzazioni
**Priorità: media — qualità percepita UX + contenimento costi Supabase**

Il flusso (`services/storageService.ts`) è solido nei fondamentali: WEBP, compressione client, cleanup cascade, RLS policies, thumb differenziati per tipo (review 250px @ q.0.65, menu 400px @ q.0.7 con aspect ratio preservato), prefetch in `useRestaurantDetail`. Restano margini per UX avanzata e resilienza.

**Azioni aperte:**
- [ ] **Migrare a `expo-image`** — effort basso (~2-3h, ~23 file), beneficio UX alto (scomparsa flash bianco, scroll fluido, ritorno istantaneo su ristoranti già visti, meno batteria/dati). API quasi drop-in (`resizeMode` → `contentFit`, `defaultSource` → `placeholder` con blurhash).
- [ ] **Ridurre full menu** da 1000px a 800px (preset `menu.width`) — risparmio egress ~30%, valutare se la qualità su pinch-zoom resta accettabile.
- [ ] **Job di cleanup orfani**: Edge Function Supabase schedulata settimanalmente che lista i file del bucket e rimuove quelli non referenziati in `reviews.photos` / `menu_photos.image_url` / `menu_photos.thumbnail_url`.
- [ ] **Retry upload** con backoff esponenziale (2-3 tentativi) per resilienza su reti instabili.
- [ ] **Path opaco** con hash invece di userId esposto (privacy minore; richiede migrazione dati esistenti → valutare se vale).
- [x] **`fadeDuration={0}` sulle thumb Android** (2026-05-16) — rimosso fade-in 300ms su `<Image>` thumb in `RestaurantDetailBody.tsx` (foto recensioni carousel) e `MenuPhotosSection.tsx` (foto menu). Prop Android-only, iOS la ignora.

**Monitoraggio:**
- [ ] Aggiungere check periodico su Supabase Dashboard → Settings → Usage. Soglia di allarme: 60% di egress a metà mese = valutare passaggio a Pro ($25/mese, 250GB egress inclusi).

---

## Supporto Web
Il branch ristoranti funziona al 100% su iOS e Android. Su web funziona all'80-85%.

### Mappa web con Leaflet
- [ ] Installare `react-leaflet`, `leaflet`, `@types/leaflet`, `react-leaflet-cluster`
- [ ] Riscrivere `RestaurantMap.web.tsx` con Leaflet + OpenStreetMap (gratuito, nessuna API key)
- [ ] Supporto clustering marker su web
- [ ] Il file nativo (`RestaurantMap.native.tsx`) resta invariato

### Miglioramenti UX web minori
- [ ] Sostituire `Alert` con modal custom per coerenza visiva cross-platform
- [ ] Verificare responsive layout su schermi desktop

---

## Asset optimization (audit pre-rilascio)
**Priorità: bassa — quick wins per ridurre dimensione bundle/repo**

Audit fatto 2026-04-25 dopo refactor avatar.

#### Già risolto
- [x] `profile_pic.jpg` ridotta da 1.5 MB → 7.2 KB (200×200, qualità 80) — backup in `/tmp/profile_pic_original.jpg`

#### App icons sorgenti (1.16 MB nel repo)
- [ ] Comprimere lossless `assets/icon.png` (1024×1024, attualmente 644 KB → atteso ~150 KB con `pngquant` o `oxipng`)
- [ ] Comprimere lossless `assets/adaptive-icon.png` (1024×1024, attualmente 516 KB → atteso ~150 KB)
- [ ] Comprimere `assets/splash-icon.png` (400×400, 176 KB)
- **Nota:** non vengono spediti agli utenti (EAS al build genera le rasterizzazioni platform-specific). Pesano solo su repo size + tempo build EAS.

#### Banner shipping (`happy_plate_*.png`, ~450 KB)
Usati in 8 punti: login, signup, add ristorante, profile guest, FAB ristoranti, BannerCarousel x3.
- [ ] **Decidere architettura** prima di lavorare sui file: vedi sezione sotto
- [ ] Comprimere lossless `pngquant` quando definitiva (-30/40%)

#### Banner architecture — decisione da prendere
3 opzioni:
- **A. Stesso pipeline degli avatar** (`_design/banners/` → `assets/banners/` con script). Workflow uniforme. Cambi banner = nuovo build.
- **B. Banner remoti via Supabase Storage** (BannerCarousel li scarica via URL + cache). Cambi banner senza rilasciare app, A/B test, banner stagionali. ~30 min lavoro, gestione cache/fallback.
- **C. Hybrid**: 1-2 default bundlati come fallback, gli altri remoti.
- [ ] Decidere se i banner cambieranno spesso (promo/eventi/seasonal → B) o sono evergreen (→ A)

#### Avatar plate_passport
- [ ] Ridisegnare master con disco centrato (vedi convention in `memory/project_avatar_pipeline.md`). Quando pronto, drop in `_design/avatars/plate_passport.png` + `npm run build:avatars`. Bundle calerà da 176 KB → ~60 KB come gli altri.

#### Compressione automatica avatar nel build script (opzionale)
- [ ] Aggiungere step `pngquant` in `scripts/build-avatars.mjs` dopo lo step `sips`. Bundle avatar ~700 KB → ~400 KB. Richiede `brew install pngquant`.

#### Pulizia dipendenze Firebase
- [ ] Falso allarme verificato 2026-04-25: `firebase` e `@firebase` (142 MB in node_modules) sono dipendenze transitive (probabilmente da Supabase), non incidono sul bundle. **Nessuna azione richiesta.** Lasciato qui per memoria storica.

---

## Stato Analytics & Crashlytics — snapshot 2026-05-26

Tre pipeline attive, tutte Expo Go-safe (require dinamico + consent gating):

**1. Firebase Analytics (legacy)** — `services/analytics.ts`
Copre eventi vecchi: allergeni, other foods, restrizioni/diete, lingue, card view/toggle, banner, app lifecycle, screen view, user properties. Le feature aggiunte da fine 2025 in poi **non vanno qui** (strategia "no nuovi eventi su Firebase", memory `project_firebase_removal`).

**2. Firebase Crashlytics** — `services/crashlytics.ts` (esteso 2026-05-26)
- Wrapper espone `recordError(err, jsErrorName?)`, `setUserId`, `setAttribute(s)`, `log`, `setCollectionEnabled`. `canReport()` centralizza i guard `__DEV__` + Expo Go.
- `app/_layout.tsx`: `setGlobalHandler` attivo anche in prod (inoltra errori JS non gestiti a `recordError` come `GlobalJSFatal`/`GlobalJSNonFatal`), `ErrorBoundary` reporta come `ReactRenderError`, init popola attributi statici (`app_version`, `card_language`, `app_language`, `allergen_count`, `restriction_count`, `diet_modes`), `logScreenView` aggiunge breadcrumb + `last_screen` attribute.
- `contexts/AuthContext.tsx`: `setUserId(uid)` su login, `setUserId(null)` su logout, `recordError` sul fallimento profilo.

**3. Supabase `analytics_events`** — `services/supabaseAnalytics.ts` (nuovo 2026-05-26)
Wrapper consent-gated, fire-and-forget. In `__DEV__` logga a console invece di chiamare la RPC. Catalogo eventi (`EventName` union):
- `onboarding_completed` — `app/auth/onboarding-dietary.tsx`
- `restaurant_viewed` — `app/restaurants/[id].tsx` (su mount)
- `review_created` — `app/restaurants/add-review.tsx` (solo nuove, non edit)
- `sign_in` — `services/auth.ts` (email) + `services/socialAuth.ts` (google/apple) con `is_signup` corretto
- `restaurant_search` — `app/(tabs)/restaurants.tsx` (`handleSelectFromAutocomplete` + `handleSelectPlace`, solo con query non vuota)
- `restaurant_shared` — `services/shareRestaurant.ts` (migrato da RPC raw)

Tutti consent-gated via `SupabaseAnalytics.setTrackingConsent(...)` propagato in `_layout.tsx` accanto a `Analytics.setTrackingConsent`.

**Da verificare in build EAS preview:** crash forzato → Crashlytics dashboard con `user_id` + `last_screen`; eventi nuovi → tabella `analytics_events` in Supabase.

### Cosa manca
- Widget admin per visualizzare i nuovi eventi (3 sezioni: counters 7/30g, top ricerche, ultimi 20 eventi). Branch `admin-prod`.
- Retention/purge (`pg_cron` su `analytics_events` > 1 anno) → solo se cresci sopra ~5K DAU.
- Migrazione del legacy Firebase Analytics su Supabase: **non pianificato**, i dati storici Firebase restano dove sono.

---

## Completati recenti

### Tier 3 — Cleanup cascade banner promo (BannerCarousel + tipi) — DONE 2026-05-16
- [x] `app/components/BannerCarousel.tsx`: rimosso rendering banner `type === 'ad'` + `'custom'`, prop `extraBanners`, handler `handleAdPress`, helper `getCurrentDuration`. Riscritto in versione semplificata (solo info banner).
- [x] `services/analytics.ts`: rimosso `logAdImpression`, semplificate signature `logBannerViewed` e `logBannerClicked` (drop `bannerType` e `adUrl`).
- [x] `types/index.ts`: rimossi campi ad-related da `BannerItem`, rimosso `BannerType` (non più necessario), `BannerItem` ora ha solo `id`, `icon?`, `image?`, `title?`, `subtitle?`.
- [x] Aggiornato anche caller `AnnouncementPopup.tsx` alle nuove signature analytics.
- [x] `tsc --noEmit` pulito.

### Footer / tab bar — possibile regressione del fix safe area
**Stato (2026-05-16): risolto e verificato in Expo Go Android + EAS Android (build 1.1.0 internal testing). iOS invariato.**

Causa: la formula hardcoded `49 + insets.bottom + 12/16` per gli overlay non rifletteva l'altezza reale del tab bar (`56 + max(insets.bottom, 16)` = 72dp in Expo Go), quindi banner e FAB finivano sotto.

- [x] In `app/(tabs)/restaurants.tsx`: introdotto `useBottomTabBarHeight()` da `@react-navigation/bottom-tabs` e variabile `overlayBaseBottom = Platform.OS === 'android' ? tabBarHeight : 49 + insets.bottom`. Usato per `nearbyBanner` (bottom + 12) e `fabWrapper` (bottom + 16). Self-correcting su Android, iOS conserva formula originale.
- [x] Verificato in EAS Android: overlay si aggancia correttamente.

### Bottom sheet — spazio vuoto sotto
**Stato (2026-05-16): risolto e verificato in Expo Go Android + EAS Android (build 1.1.0). iOS invariato.**

Causa root (confermata): il container del sheet era ancorato `top: 0` con `height = useWindowDimensions().height * maxSnap + (Android ? insetBottom : 0)`. Il parent (`MaybeScreenContainer` di React Navigation, vedi `node_modules/@react-navigation/bottom-tabs/.../BottomTabView.js:252`) ha `overflow: 'hidden'`. L'estensione `+insetBottom` veniva ritagliata, mentre il `paddingBottom: insetBottom` sul body continuava a spostare il contenuto su → gap visibile.

- [x] In `components/BottomSheet/BottomSheet.tsx`: refactor a `bottom: 0` anchoring. Container hugga sempre il fondo del parent, zero dipendenza dall'accuratezza di `useWindowDimensions`. Math: `containerHeight = height * maxSnap`, `positions = snapPoints.map(p => height * (maxSnap - p))`, `closedY = containerHeight`, `reportSnap = (closedY - y) / height`. Math diversa ma proiezione visiva identica su iOS (verificato).
- [x] Sistema lo stesso `BottomSheet` usato da `RestaurantDetailSheet` e `NearbyListSheet` → entrambi risolti.

### Bottom sheet — lag scrolling + drag scattoso
**Stato (2026-05-16): risolto su EAS Android (build 1.1.0 internal testing). Il problema era effettivamente overhead Expo Go dev mode, come ipotizzato. iOS invariato.**

- [x] Test EAS Android: scroll e drag fluidi. Nessun intervento aggiuntivo necessario sui sospetti architetturali (elevation/renderToHardwareTextureAndroid/simultaneousWithExternalGesture).

### Mappa Android — pin issues
**Stato (2026-05-16)**: tutti risolti + authorization Google Maps SDK risolta con nuova chiave dedicata `Maps SDK - Android` (vedi memory `google-cloud-projects` + cleanup in coda al TODO). Mappa ora visibile su EAS Android.

- [x] **Pin tagliati** — risolto in `components/map/SelectedMarkerOverlay.tsx`: il `transform: [{ scale: 1.25 }]` causava clipping perché `react-native-maps` su Android rasterizza il marker in un bitmap basato sul layout naturale della View (pre-transform). Gate del transform a `Platform.OS === 'ios'`. iOS bit-per-bit identico. Su Android il pin selezionato resta differenziato da bg colorata + shadow potenziata + zIndex 9999 + `cluster={false}`.
- [x] **Pin che scompaiono al cambio selezione** — risolto in `components/map/MapPin.tsx`: aggiunto `androidSettling` state che estende la finestra `tracksViewChanges=true` a ~100ms dopo mount e dopo ogni cambio prop rilevante. La drawing cache nativa Android richiede più tempo di un single frame per ricatturare il bitmap del marker. iOS gestito via early return dell'useEffect, byte-identico.
- [x] **Colori pin non aggiornati con filtro "per me"** — stessa root cause del precedente (bitmap caching su prop change). Risolto dallo stesso fix `androidSettling`.
- [x] **Bussola Android seminascosta dietro UI** — risolto in `RestaurantMap.native.tsx` con `mapPadding={{ top: insets.top + 120, right: 12, bottom: 0, left: 0 }}` solo su Android. Settaggio statico (non toggle, niente salti). iOS non viene toccato, continua col `compassOffset`. Side effect noto: il centro logico della camera shift in basso di ~70px su Android.
- [x] **Pin centra male se mappa ruotata** (su entrambe le piattaforme, bug pre-esistente latente) — risolto aggiungendo `heading: 0` + `pitch: 0` alla `animateCamera` del ramo pin-selection. La math dell'offset assumeva north-up: con la mappa ruotata, "sud sul globo" non corrispondeva più a "giù sullo schermo" → pin fuori centro o fuori dallo schermo. Reset di heading/pitch al tap pin è comportamento standard di Apple/Google Maps.
- [x] **Centramento camera — animazione "sale e scende" + pin atterra troppo in alto** (2026-05-16): root cause vera = Google Maps Android SDK centra di default la camera sul marker tappato (`OnMarkerClickListener` nativo, non disabilitabile da react-native-maps JS). La nostra `animateCamera` con `heading:0/pitch:0` girava sopra il centraggio nativo → doppia animazione = "sale e scende". Primo tentativo (cf3ad42) ha rimosso solo il nostro centraggio: ha tolto il "sale e scende" ma il pin finiva sotto al sheet perché il SDK centra geometricamente al centro schermo. Fix finale: lasciamo che il SDK centri (animazione fluida, una sola) e shiftiamo il suo "centro logico" sopra il sheet via `mapPadding.bottom = windowHeight * 0.55` always-on su Android. iOS continua a usare il branch `Platform.OS !== 'android'` con `animateCamera` esplicito (compassOffset al posto di mapPadding). Trade-off accettato: a sheet chiuso `locate me` / `search place` posizionano il punto nella metà superiore dello schermo invece che al centro geometrico. Se in futuro l'UX richiede precisione assoluta sul centraggio, passare a `patch-package` su `react-native-maps` per ritornare `true` dall'`onMarkerClick` Android e disabilitare il centraggio nativo (richiede rebuild EAS).
- [x] **Non tutti i pin si vedono** — risolto come effetto collaterale del fix `androidSettling` su bitmap caching. Stessa root cause dei pin che scomparivano al cambio selezione e dei colori non aggiornati col filtro "per me": la drawing cache nativa Android non ricatturava il bitmap del marker entro un singolo frame. Verificato in EAS Android 1.1.0.

### Modal foto menu — segnala recensione, tap esterno non chiude
**Stato (2026-05-13): risolto e verificato in Expo Go Android. iOS invariato.**

Causa root: `ImageFullscreenModal.tsx` (e analogo `PhotoGalleryModal.tsx`) non avevano `onRequestClose` sul `<Modal>` (back button Android no-op) e l'area scura attorno all'immagine non aveva handler di tap. Solo il tap sull'immagine chiudeva via `onSingleTap`. Niente di legato al pattern siblings Pressable+View che era già stato sistemato altrove.

- [x] Aggiunto `onRequestClose={onClose}` sul `<Modal>` in entrambi i file (gestisce back button Android, no-op iOS).
- [x] `pageContainer` da `<View>` a `<Pressable>` con `onPress={Platform.OS === 'android' ? onClose : undefined}`. Su iOS `onPress` è `undefined` → Pressable degenera a View → comportamento iOS identico.

---

## Branch attivi (NON cancellare)

- **`main`** — branch di sviluppo principale. Contiene card + ristoranti (post-merge 2026-05-12).
- **`backup/main-card-only`** (`899752c`) — snapshot pre-merge della versione 1.0.6 (solo card, pre-ristoranti). Punto di rollback rapido in caso di problemi su main: `git reset --hard backup/main-card-only && git push --force-with-lease origin main`.
- **`backup/restaurants-v2`** (`47abcc8`) — branch storico da cui è nato il merge (ex `feature/restaurants-v2`). Tenuto come secondo backup dormiente. Punta allo stesso commit di main.
- **`admin-prod`** — produzione admin dashboard (https://admin.allergiapp.com), branch dedicato.
- **`landing`** — sito web pubblico, servito via Vercel.
