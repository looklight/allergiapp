# AllergiApp - TODO

---

## Priorità a breve (app live)

### Azioni manuali Supabase
- [ ] **Conferma email / anti-spam** — attualmente disabilitata. Verificare schermate per conferma email.

### Legale / GDPR (revisione 2026-07-14/15, contesto in memoria `project_legal_gdpr_review.md`)
- [ ] **Registro dei trattamenti (art. 30 GDPR)** — documento interno mancante (unico gap sostanziale rimasto dalla revisione). L'esenzione per le piccole realtà non si applica: trattiamo dati salute (art. 9) in modo non occasionale. Serve una tabella con: trattamenti, finalità, categorie di dati/interessati/destinatari, trasferimenti extra-UE, tempi di conservazione, misure di sicurezza. Non è pubblico: va solo tenuto pronto in caso di richiesta del Garante. Lavoro: ~1h.
- [ ] **Policy — email non più "solo per accedere"** (deciso 2026-07-21, non urgente: da fare alla prossima modifica dei legali). Oggi la policy dice che l'email serve *solo* per accedere: ci auto-vincola più di quanto serva, e un'email di servizio a un utente (chiarimento su una recensione, moderazione) risulterebbe fuori dalla finalità dichiarata. Testo nuovo, stessa lunghezza dell'attuale:
  - IT: "L'email serve per accedere e per eventuali comunicazioni di servizio sul tuo account o sui tuoi contenuti. Non viene mai mostrata pubblicamente, condivisa con terzi, né usata per promozioni senza il tuo consenso."
  - EN: "Your email is used for sign-in and for any service messages about your account or your content. It's never shown publicly, shared with third parties, or used for promotions without your consent."
  - Punti da toccare (frase duplicata identica): `constants/legalContent.ts` it+en su `main`; `translations.json` chiavi `privacy.accountText` it+en e `privacy.html` (fallback IT inline) sul branch `landing`.
  - Base giuridica invariata: "Account e contenuti — esecuzione del contratto (art. 6.1.b)" copre già le comunicazioni di servizio, non aggiungere bullet. La formula "senza il tuo consenso" lascia aperta la strada a eventuali campagne future senza riscrivere la policy (che però richiederebbero opt-in dedicato, unsubscribe e ESP con DPA UE — vedi memoria).

### Social Auth (Google + Apple) — MERGED in main
Feature mergiata in main (commit `6b0d9f3`), distribuita su TestFlight 1.1.0 (8). "Entra con Google" verificato su Android (giu 2026). Vedi memoria `project_social_auth.md`. Resta da chiudere:

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

### Deep link ristorante (share) — cleanup post-conferma (2026-07-01)
Refactor risolutivo fatto e pushato (commit `867d8fb`, OTA beta): il deep link `/r/{slug}` ora apre il ristorante come la selezione da ricerca (focus a mappa pronta via `onReady`). Vedi memoria `project_deeplink_restaurant_flow`. **Le voci sotto vanno chiuse SOLO dopo conferma a runtime che il refactor funziona sul device** — togliere i rinforzi alla cieca rischia di riportare il bug.

- [ ] **Valutare rimozione del sync stato-regione (fix #4)** — il timer 650ms nell'effetto `centerOn` di `RestaurantMap.native.tsx` (setIsDotZoom + `onRegionChangeComplete` manuale, commit `be9110d`) potrebbe essere ridondante ora che il focus avviene su mappa viva (dove l'evento nativo scatta, come nella ricerca). Rimuovere e verificare che i pin compaiano comunque su deep link + salto autocomplete/locate-me. Se servono ancora → tenerlo e documentare che l'evento nativo NON è affidabile.
- [ ] **Valutare `getRestaurantFocusBySlug` con query dedicata alle sole coordinate** — ora riusa `getRestaurant`, che carica anche le stats (2 RPC in più) solo per lat/lng. È dietro la mappa già visibile (invisibile all'utente), ma una query snella sarebbe più pulita. Micro-ottimizzazione, non necessaria.
- [ ] **(opz.) Uniformare i ref-durante-render in `RestaurantMap.native.tsx`** — `onReadyRef` segue il pattern esistente flaggato da `react-hooks/refs` (già presente 5x nel file). Se si fa una passata, rifattorizzarli tutti insieme, non solo il nuovo.

### Geolocalizzazione & vista mappa — follow-up (2026-05-31)
Implementato e committato su main. Restano da chiudere lato test/UX:

- [ ] **Test a runtime del flusso completo** — onboarding (Inizia *e* Salta) → schermata `onboarding-location` → prompt nativo → tab Ristoranti. Verificare: pin sulla vista Europa anche senza posizione; auto-center se permesso già concesso; pulsante "centra su di me" con hint Impostazioni solo su diniego terminale (niente nag al primo "no"); nessun prompt a freddo per utenti esistenti che aggiornano l'app.
- [ ] **Calibrare `DEFAULT_REGION.latitudeDelta`** (ora `22`, in `components/map/mapConstants.ts`) guardando la mappa reale: deve mostrare l'Italia centrata a scala europea con più cluster-città distinti, senza collassare in un blob unico. react-native-maps riadatta all'aspect ratio, quindi è da tarare a occhio sul device.
- [ ] **Verificare timing popup** — il popup avatar e l'`AnnouncementPopup` non devono apparire durante l'onboarding né flashare in transizione (fix con gate-path + delay 500ms in `utils/globalPopups.ts`).
- [ ] **Edge case popup-stacking** (deferito di proposito) — se contemporaneamente c'è un annuncio attivo *e* un utente nuovo (popup avatar `free`, regalo di benvenuto intenzionale), entrambi i Modal possono apparire sull'atterraggio. Coordinarli richiederebbe una coda di popup condivisa. Lasciato come edge accettabile finché non si dimostra fastidioso.

### Nearby "Ristoranti nell'area" — sort server-side quando i 200 diventano stretti (2026-07-06)
Il fetch nearby porta fino a 200 risultati (tetto hard `LEAST(max_results, 200)` nelle RPC); lo sheet mostra i top 50 per l'ordinamento scelto e banner/header degradano a "50+". Finché nessuna città satura i 200 nel raggio, conteggi e classifiche sono esatti (Milano oggi: 84).

- [ ] **Trigger**: quando una città si avvicina a ~200 ristoranti nel raggio (15 km per `city`) → aggiungere parametro sort e conteggio totale alle RPC `get_nearby_restaurants` / `get_restaurants_for_my_needs`, re-fetch al cambio ordinamento nello sheet. Rientra nel lavoro `MAP_SCALING.md`.

### Mappa — follow-up sessione 2026-07-10 (viewport-gating + debug, pushata `de97b5f`)
Contesto in MAP_SCALING.md §0 e memoria `project_map_clustering.md`. Fix verificate su simulatore (telemetria + conteggio marker frame-per-frame); restano le verifiche device:

- [ ] **Test su telefono fisico VECCHIO (dev/preview build, mai Expo Go)** — (a) freeze alla soglia pallini↔pin SPARITO (zona densa, pinch avanti-indietro); (b) pan fluido a zoom largo; (c) toggle filtri: nessun pin sparisce, colori assestati in ~1s (ammesso blink ≤0.5s durante il gesto, v. sotto).
- [ ] **Decisione Max Rows Supabase** (Dashboard → Settings → API) — oggi 1000: a zoom Italia si vedono max 1000 pallini su 1595 (estetico, si ripara zoomando). Se si alza a 3000: aggiornare `PIN_RESPONSE_CAP` in `hooks/useRestaurantGeo.ts` E testare ~2300 marker montati sul telefono vecchio (mai provato sul campo: la beta 1.2.0 girava di fatto a 1000). **Agg. 2026-07-12: deciso di NON alzare per ora** (valore concordato quando si farà: 3000, non oltre — è un tetto di sicurezza globale). La admin dashboard NON dipende più da questo limite: pagina Ristoranti pagina tutte le letture "full table" a blocchi da 1000 (helper `fetchAllPages` in `admin/src/app/restaurants/page.tsx`, commit `8732001`+`08c58c8` su `admin-prod`); stesso pattern da riusare se altri contatori/mappe admin risultassero fermi a 1000.
- [ ] **Occhio al fantasma "tutti muted per >6s" dopo Apply filtri** — osservato UNA volta su simulatore, mai riprodotto nei test controllati (colori si assestano in ~1s). Se ricompare su device: segnalare con esigenze attive e timing.
- Blink ≤0.5s dei pin durante i toggle filtro = interop rn-maps 1.20 (misurato: 1 frame, auto-riparante, bounded dal viewport-gate) → si chiude con l'upgrade rn-maps 1.27 al bump SDK, nessuna azione ora.

### Mappa Android — perf & rendering (sessione 2026-06-16, su main)
Il "lag generale Android" era in gran parte la mappa. Cause risolte (contesto per l'upgrade rn-maps sotto, NON task aperti):
- **Tempesta di fetch pin** → dedup in `useRestaurantGeo` (`80f2067`).
- **Clustering client disabilitato** (`CLUSTERING_ENABLED = false`, `d76db66`): su rn-maps 1.20.1 + New Arch rendeva male (bolle "a spicchio" / churn / pin spariti) e *peggiorava* la perf; pin individuali come iOS.
- **Crash toggle profilo iOS** → patch react-native-maps via patch-package (`03af8b8`) — da togliere all'upgrade.
- **Drift pallini "in mare"** → mitigato con anchor esplicito + no elevation (`3bb7ea0`); residuo = limite libreria, lo chiude l'upgrade.

**SCALABILITÀ PIN — sorgente unica: `MAP_SCALING.md`** (analisi completa 2026-07-03; ingloba la gerarchia dei limiti del 2026-06-22, che è stata SPOSTATA lì — il primo limite che morde NON è il LIMIT 1000 ma il cap 50/100 del fetch dettagliato). Qui solo i task, in ordine di trigger:
- [ ] **Alzare "Per me" 50→~150** (param RPC dal client, server cappa a 200) — quando i pin grigi a zoom città danno fastidio su città dense (~50-100/città). Dettagli e perché NON fare l'"Opzione B" prima dei ~200/città: `MAP_SCALING.md` §2.1.
- [ ] **`LIMIT` pallini 1000→3000** in `get_pins_in_bounds` — quando il DB si avvicina ai 1000 in un bbox continentale. NO filtro per-esigenze nel SQL (invariante pin filter-independent): `MAP_SCALING.md` §2.2 e §6.
- [ ] **Branch `feature/map-scaling`** — pallini/bolle come PNG statici via `image` prop + clustering riacceso + trim pinCache per distanza. Sequenza a step spedibili: `MAP_SCALING.md` §3 e §7. NON iniziato (scelta 2026-07-03: restare sulla versione attuale).
- [ ] **Aggregazione server-side a griglia** — trigger: >3000 in bbox o payload pin >0,5 MB. Design e tradeoff (bolle neutre prima versione): `MAP_SCALING.md` §4.

- [ ] **Upgrade `react-native-maps` 1.20.1 → 1.27.x (Fabric nativo)** al prossimo bump SDK Expo (SDK 54 pinna la 1.20.1) — cura definitiva di drift + resa bolle + crash churn; all'upgrade **togliere la patch-package** (`patches/react-native-maps+1.20.1.patch`).

- [ ] **Animazione pin — "pop" sul pin selezionato (polish, cheap, iOS-first).** Trasformare lo `scale: 1.25` statico di `SelectedMarkerOverlay` in una molla animata (1.0→1.25 spring, ~200ms) al tap. Costo trascurabile: è **1 solo marker isolato** (`tracksViewChanges` già sempre true), non tocca la massa dei pin né l'invariante. **Android resta statico** (rn-maps rasterizza il marker pre-transform → lo scale clippa: vincolo già noto, per quello lo scale è iOS-only). È il ~90% del "feel moderno" che si vede nelle altre app (il pop sul tap).
  - **NON la transizione di massa pallino↔pin sullo zoom**: animarla = `tracksViewChanges` true su centinaia di marker = mass-recapture/churn (l'invariante che l'architettura evita). Le altre app sono fluide perché disegnano i marker sul layer nativo (GPU), non come View RN→bitmap. → sbloccata **solo** dall'upgrade rn-maps nativo sopra, non prima. Mitigazione gratis intanto: avvicinare il DNA visivo di pallino e pin così lo swap legge come continuo.

**DEBITO ARCHITETTURALE — sorgente unica del colore copertura.** L'unico vero peccato di design del sistema pin: il colore di compatibilità nasce da DUE sorgenti (client `getExpandedCoverage` su `supported_allergens` per i pallini; server `covered_*` per i pin pieni). Da questa doppiezza derivano race cold-start, flash-grigio, pin grigi oltre 50, incoerenza cluster, dilemma Opzione B. Da rifare con UNA sola sorgente. **Non si paga da solo: finestra giusta = insieme all'upgrade rn-maps**, quando comunque si tocca `MapPin`. Il resto della complessità (cache/dedup/hack platform) è cicatrice da bug reali, non va semplificata a freddo.

### Lag generale Android
Gran parte era la mappa (vedi sopra, risolto). Resta da verificare la fluidità generale (non-mappa) in un EAS build, dato che Expo Go è ~5x più lento (dev mode + niente Hermes optimizations).

- [ ] **Prima di indagare oltre**: testare in un EAS build (dev-client o internal testing) per escludere l'overhead di Expo Go
- [ ] Se persiste in EAS: profiler RN, controllare re-render eccessivi (FlatList senza keyExtractor stabile, useState in componenti grossi), Reanimated worklets che fanno troppo, immagini non ottimizzate (vedi roadmap migrazione a `expo-image` nella sezione Gestione immagini)
- [ ] Verificare che Hermes sia attivo nel build (default in SDK 54 ma controllare)

### Cleanup Google Cloud (non urgente)
- [ ] Rimuovere "Maps SDK for Android" dalla chiave `Places API Key - Android` nel progetto `allergiapp-488223`. Ora ridondante perché esiste la chiave dedicata `Maps SDK - Android` (UID `eb66e008-…`) usata da `GOOGLE_MAPS_API_KEY_ANDROID` su EAS. Verificare prima che il build prod successivo continui a caricare la mappa.

### Tier 2 — Rimuovere dipendenze Firebase Remote Config — STAGED 2026-05-16
Edit puri già fatti (dipendenza rimossa da `package.json` + pod orfani rimossi dal plugin). Resta solo applicarlo al prossimo build naturale:
- [ ] `npx expo prebuild --clean` — rimandato al prossimo build naturale (no rebuild dedicato)
- [ ] Build EAS verifica con check Crashlytics — al prossimo build prod/preview
- **Beneficio reale:** 3 pod in meno nel bundle iOS (~500KB-1MB stimati).

### Splash screen Android — uniformare background a tutto schermo
Risolto in light mode su EAS Android (build 1.1.0). Aggiunto hardening night-mode al plugin (`withAndroidColorsNight` scrive `app_window_background = #F7DCB3` anche in `values-night/colors.xml`, coerente con `userInterfaceStyle: "light"`). Resta:
- [ ] Verifica al prossimo build EAS Android (anche su device con dark mode attiva).

### Manutenzione al prossimo build (sessione review 2026-07-03) — FATTA 2026-07-19 (tranne npm audit fix)
- [x] `npx expo install --fix` — fatto 2026-07-19 (`d44e379`): 9 pacchetti alla patch SDK 54 (expo 54.0.36, expo-router 6.0.24, expo-updates 29.0.19, ecc.) + `eslint-config-expo` 56.0.4→10.0.0. Il plugin react-hooks è tornato a v5: rimosso da `eslint.config.js` l'override delle regole compiler-powered (non esistono più). Lint 0 errori / 60 warning, tsc pulito.
- [x] `babel-plugin-transform-remove-console` — fatto 2026-07-19 (`e5d9807`): attivo solo env production, esclusi `error`/`warn`. Verificato via `expo export`: 0 console.log nel bundle. Nota: aggiunto `babel-preset-expo` come devDependency esplicita (npm lo annidava sotto expo/ e Babel non lo risolveva).
- [ ] `npm audit fix` (senza `--force`) — **SALTATO di proposito 2026-07-19**: dry-run = 112 pacchetti cambiati per vulnerabilità tutte in toolchain di build (nessuna esposizione utenti). Churn alto, beneficio solo igiene: rifare la valutazione in un ciclo senza release di mezzo.
- [ ] **Prompt recensione store** (`expo-store-review`) — dettagli e vincolo runtime nella sezione dedicata sotto "Feature roadmap".

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
**COMPLETA (2026-07-19).** Share button, pagina web `/r/[slug]`, Universal Links iOS e App Links Android tutti in produzione. Il 19/07 chiuso l'ultimo pezzo: SHA-256 Play App Signing in `assetlinks.json` → link diretti in-app anche per installazioni Play Store. Storia e decisioni in `SHARE_FEATURE.md`.

- [ ] Test facoltativo: su Android con app da Play Store, tap su link `/r/{slug}` deve aprire direttamente l'app (forzare riverifica: `adb shell pm verify-app-links --re-verify com.allergiapp.mobile`)

**Polish futuro (solo se i dati lo giustificano):** OG image dinamica, galleria foto sulla pagina web, mappa statica preview, JSON-LD Restaurant per SEO, avatar risolti sulla landing, parametro `?diet=` nel link per pre-filtrare la scheda.

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

### Prompt recensione store (In-App Review nativo) — PIANIFICATO 2026-07-06
**Agganciato alla prossima build di manutenzione (v. sezione "Manutenzione al prossimo build")**

Popup nativo "Lascia una recensione" (StoreKit `SKStoreReviewController` su iOS, Google Play In-App Review su Android), wrapper `expo-store-review`. L'overlay è dell'OS: tu *richiedi*, il sistema decide se mostrarlo (iOS ~3 prompt/anno per utente, nessun callback). App live su entrambi gli store dal 2026-07: i primi rating pesano molto sulla visibilità, il trigger selettivo protegge dai voti tiepidi.

**Fase 1 — codice su main (INSIEME al bump versione, vedi vincolo): FATTA 2026-07-12**
- [x] `npx expo install expo-store-review` (~9.0.9)
- [x] `utils/storeReviewPrompt.ts` — `maybeRequestStoreReview(rating)`: soglia rating ≥ 4, throttle in AsyncStorage (90 giorni), guard `isAvailableAsync()`, delay 1.5s; tutte le costanti di tuning stanno in questo file
- [x] Innesto in `app/restaurants/add-review.tsx`: dopo l'OK sull'alert di conferma, solo recensioni nuove (mai in edit), fire-and-forget
- [x] Voce "Valuta l'app" in settings (deep-link diretto: iOS foglio recensione via `?action=write-review`, Android scheda Play; URL hardcoded in `storeReviewPrompt.ts` perché `storeUrl()` richiederebbe config non presente) — i18n nelle 6 lingue UI
- [ ] Verifica su device in beta: il popup su TestFlight appare quasi sempre (invio disabilitato = modalità test, è normale); su APK sideload non appare (niente Play Services, no-op voluto)

**Fase 2 — build:** insieme alle voci di manutenzione, bump versione (→ nuovo runtime), beta TestFlight/Play internal, poi prod. Tuning soglie (rating minimo, giorni throttle): costanti in `utils/storeReviewPrompt.ts`, con OTA bloccate si cambiano solo con una build.

**VINCOLO runtime (policy `appVersion`):** il codice che importa `expo-store-review` NON deve finire in un'OTA per runtime 1.1.0 — le build live non hanno il modulo nativo, l'import crasha. Protezione: la Fase 1 atterra su main solo contestualmente al bump di versione; nessuna OTA production tra merge Fase 1 e bump.

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
- Campo `reviews.language` salvato all'insert in `add-review.tsx:144` (vedi nota residua su edit nella sezione Tech debt)

**Chiavi i18n predisposte da aggiungere quando si implementa:** `restaurants.review.translate`, `showOriginal`, `translatedBy`.

**Effort stimato:** 1-2 giorni per versione base (originale + bottone + cache). Edge case da curare: auto-detect lingua reale del testo (spesso uno scrive in EN pur avendo app in IT), invalidazione cache su edit recensione, rate-limit per utente.

**Trigger per upgrade a paid:** solo quando MyMemory inizia a tornare 429 con regolarità. A quel punto: Microsoft Translator (2M char/mese gratis) o DeepL (500k). NON Google.

Dettagli e contesto storico: `memory/project_review_translation.md`.

### Filtrare POI nativi della mappa (nascondere business, tenere landmark)
**Priorità: bassa. Android già fatto, resta iOS.**

Android (Google Maps) risolto: `customMapStyle={ANDROID_MAP_STYLE}` in `RestaurantMap.native.tsx` nasconde `poi.business` mantenendo gli altri POI.

**iOS (Apple MapKit) — ancora aperto:**
- `react-native-maps` non espone `MKPointOfInterestFilter` (controllo granulare per categoria)
- `showsPointsOfInterest` è solo true/false → perderebbe anche il Colosseo
- Opzioni:
  1. Patch nativa Swift + config plugin Expo per esporre `pointOfInterestFilter` (pulita, ~30-50 righe)
  2. Passare a `PROVIDER_GOOGLE` anche su iOS (uniforma stile, ma richiede Google Maps iOS SDK + API key iOS, build più pesante, perde look Apple)
  3. Accettare all-or-nothing con `showsPointsOfInterest={false}`

**Approccio consigliato:** valutare patch nativa iOS (1) se il fastidio giustifica la complessità.

### Galleria avatar ("Pokedex")
Pagina `app/restaurants/avatar-gallery.tsx` con sistema unlock già funzionante. Resta:
- [ ] Creare le immagini per gli avatar bloccati (attualmente placeholder)
- [ ] Valutare nuovi avatar e condizioni di sblocco

### Avatar gamification — miglioramenti pianificati
**Priorità: bassa — polish UX, da fare quando l'app cresce**

- [ ] **Badge "NUOVO" sugli avatar appena sbloccati nella galleria** — dopo che il popup è stato confermato, l'utente entra in galleria ma non sa quali sono i nuovi. Soluzione: tracciare un set `viewed_in_gallery` (oltre a `seen_unlocked_avatars`) e mostrare un piccolo badge/glow finché l'utente non li ha "visti" tappandoli o scorrendoci sopra. ~30 min. Effort medio, valore UX alto se la gamification cresce.
- [ ] **Aggregazioni server-side via RPC Postgres** — oggi `fetchUnlockStats` fa 5 query parallele e somma/distinct lato client. Per utenti con >100 recensioni significa scaricare molte righe per fare `SUM`/`COUNT DISTINCT`. Una RPC `get_user_unlock_stats(uid) RETURNS jsonb` farebbe tutto server-side: ~10ms e ~1KB di traffico invece di ~50KB. **Da fare quando avrai utenti con >100 recensioni**, prima è premature optimization.

### Admin dashboard
- [ ] **Card "Follow" sulla dashboard** (a ridosso del rilascio 1.3.0, branch `admin-prod`) — le RPC admin sono già live dalla mig 080: `get_follow_admin_stats` (totale follow, follower/following medi, utenti con ≥1 follow) + `get_top_followed_profiles` (classifica seguiti); trend nel tempo da `analytics_events` (`user_followed`/`user_unfollowed`, già tracciati). Solo UI Next.js, zero migrazioni.
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
- [ ] **Filtrare `allPins` al viewport corrente prima del render** — oggi `allPins` accumula pin di tutte le aree visitate (cap 3000) e finiscono TUTTI in marker nativi. Fix corretto: passare solo i pin nel bounding box corrente. ATTENZIONE: non è un quick win — reintroduce churn di mount/unmount nel punto fragile di rn-maps (churn-crash iOS); servono margine ~3× viewport e rimozioni pigre. Analisi in `MAP_SCALING.md` §6; rientra nel branch `feature/map-scaling`.

**Medi (ottimizzazioni)**
- [ ] **`reviewPhotos` useMemo deps** — array di 100+ foto ricalcolato ad ogni sort change / like toggle / loadMore. Restringere le dipendenze. `ReviewsSection.tsx`. Effort minimo.
- [ ] **Pre-compute `allergen_match_count`** — sort `relevance` esegue `INTERSECT` array per ogni review paginata (30 INTERSECT/pagina). Aggiungere colonna calcolata o fare insieme alla materialized view. Effort medio, da fare in coppia col punto 1.

### Liste/collezioni — caricamento dati: RPC server-side (DA VALUTARE)
**Priorità: media — non urgente alla scala attuale, ma da decidere prima dello sharing. Discusso 2026-06-07.**

Oggi il profilo carica le liste custom **eager, lato client** (`myRestaurantsService.getCollectionsWithItems`): 1 query embed (collezioni+item+ristoranti) + `fetchRestaurantPositions` (TUTTE le posizioni globali, RPC senza cache) + `batchLoadStats` (`reviews.in(ids)` + `favorites.in(ids)` → **scarica le righe e conta lato client**). Funziona bene e mantiene la UX **fluida** (selezione istantanea, mappa sempre presente, niente spinner).

**Fino a quando regge (stima):**
- `.in(ids)` ok finché un utente salva **< ~150–200 ristoranti** totali (oltre, URL troppo lungo → stats sbagliate, *hard fail*).
- conteggio scaricando righe → **lento** quando i ristoranti salvati accumulano molte recensioni (cresce con la community, non col singolo utente).
- `fetchRestaurantPositions` globale → **spreco** quando i ristoranti totali dell'app arrivano a migliaia.
- **A ~15k utenti** con ~100 salvati/utente: il per-utente regge, ma il conteggio-scaricando-righe + posizioni globali rendono ogni apertura profilo pesante (migliaia di righe) → lento/costoso.

**Fix proposto (fondamenta, sharing-ready):** spostare il lavoro nel DB con 2 RPC.
- `get_my_collections_with_items()` (usa `auth.uid()`): tutte le mie liste con item, **stats aggregate in SQL** (COUNT/AVG), **posizioni inline** (PostGIS), nota inclusa (owner). Tiene l'eager → **stessa fluidità di ora**, ma una query efficiente.
- `get_collection_items(collection_id)`: singola lista, stessa aggregazione, **nota solo se owner** → è anche la **primitiva della condivisione** (RLS `visibility='public'` già pronta in migration 069) e l'eventuale path lazy per utenti estremi.

**Guadagni:** apertura profilo da migliaia di righe a ~100 già aggregate; client più snello (spariscono `batchLoadStats` + fetch posizioni globali); fondamenta sharing pronte.

**Trade-off (onesti, NON zero):**
- una migration con 2 funzioni SQL da mantenere (infra permanente, storia immutabile);
- la logica di shaping liste passa da TS a SQL → si modifica via SQL su Supabase (comunque istantaneo, **le OTA restano intatte per tutto il resto**), ma è meno comodo del TS e cambi alla forma dei dati richiedono toccare RPC **+** client insieme;
- superficie di **sicurezza RLS** da fare giusta (nota che NON deve trapelare su liste condivise);
- non elimina l'eager (per un utente con migliaia di posti il payload resta grande, ma efficiente).

**Decisione:** rimandata (l'utente non vuole over-engineering ora). **Momento giusto: quando si costruisce la condivisione liste** — un solo investimento che dà scala + sharing insieme. Vedi anche memoria `project_collections_feature.md`.

**Aggiornamento 2026-07-12 (liste pubbliche fase A, branch `feature/public-lists`):** la condivisione in-app è arrivata con caricamento **on-demand per singola lista** (`getPublicCollectionItems`), che mitiga ma non elimina il problema: `batchLoadStats` ora ha anche un chiamante visitor-facing e su una lista pubblica molto grande scarica righe review fino al cap 1000 solo per contarle. La RPC `get_collection_items` resta il fix giusto; rivalutare se le liste pubbliche prendono piede.

### Liste pubbliche — consolidamenti da review (2026-07-12)
**Priorità: bassa — nessun bug, solo deduplicazione. Dalla review del branch `feature/public-lists`.**
- [ ] **Switch custom condiviso** — il pattern track+thumb in View è duplicato in 5 file: `MapVisibilityToggle`, `ProfileVisibilityToggle`, `FilterModal`, `add.tsx`, `add-review.tsx`. Estrarre un `CustomSwitch` (ed eventualmente un `ToggleRow` icona+label+hint+switch usato dai due toggle liste). Un ritocco visivo/a11y oggi va replicato a mano in 5 posti.
- [ ] **Barra pill condivisa** — lo stile della ScrollView orizzontale di `ListPill` vive due volte (`kindToggle` in `profile.tsx`, `pillBar` in `user/[uid].tsx`): estrarre un wrapper `ListPillBar` o almeno lo stile.
- [ ] **Tipo meta pill unico** — `PublicCollectionMeta` (myRestaurantsService) è un sottoinsieme di `CollectionMeta` (utils/storage): unificare quando si aggiunge il prossimo campo (es. `slug` in fase B web).

### `reviews.language` non aggiornato su edit (DB) — fix residuo
**Priorità: bassa — client già sistemato, resta solo il DB**

Client già fixato: `app/restaurants/add-review.tsx:148` passa `language: i18n.locale` anche su edit e `services/reviewService.ts` accetta `language?` → `p_language`. **Manca solo il DB**: la RPC `upsert_review` (`supabase/migrations/027_drop_review_dishes.sql`, righe 27-29) nella branch `UPDATE` non include `language` nella `SET`, quindi il valore passato dal client viene ignorato sull'edit.

**Conseguenza**: se un utente crea una recensione in IT, cambia lingua app a EN e poi riscrive il commento in inglese, la riga DB resta `language = 'it'` con commento in EN. Inconsistenza dato/realtà. Danno minimo finché nessuno consuma il campo (la traduzione recensioni è rimandata).

**Fix minimo quando servirà** (~15 min):
1. Nuova migration: aggiungere `language = COALESCE(p_language, language)` alla `SET` clause della branch UPDATE + CHECK constraint ISO 639-1 (`CHECK (language IS NULL OR language ~ '^[a-z]{2}(-[A-Z]{2})?$')`)

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
- [ ] **Decidere quali altri campi Basic Data includere** — campi gratuiti/già pagati non ancora richiesti: `types` (array di categorie), `photos` (riferimenti foto), `plusCode`, `viewport`. Da valutare se e quali portare nella `FieldMask` e nel DB. (`primaryType` → cucine già implementato.)

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
- [ ] **Migrare a `expo-image`** — **puramente migliorativo, bassa priorità**. Verifica 2026-06-02: la pipeline attuale è a posto (WEBP + compressione + thumb/full separati + `Image.prefetch` in `useRestaurantDetail` + `fadeDuration={0}` su Android). I benefici principali (flash bianco, scroll) sono **già mitigati** da prefetch + fadeDuration. Resterebbe solo il margine della cache su disco persistente (ritorno istantaneo su ristoranti già visti, meno dati) + blurhash placeholder cosmetico. Effort ~2-3h, ~23 file, API quasi drop-in (`resizeMode` → `contentFit`, `defaultSource` → `placeholder`). **Rivalutare solo se emergono problemi reali di caching/consumo dati.**
- [ ] **Ridurre full menu** da 1000px a 800px (preset `menu.width`) — risparmio egress ~30%, valutare se la qualità su pinch-zoom resta accettabile.
- [ ] **Job di cleanup orfani**: Edge Function Supabase schedulata settimanalmente che lista i file del bucket e rimuove quelli non referenziati in `reviews.photos` / `menu_photos.image_url` / `menu_photos.thumbnail_url`.
- [ ] **Retry upload** con backoff esponenziale (2-3 tentativi) per resilienza su reti instabili.
- [ ] **Path opaco** con hash invece di userId esposto (privacy minore; richiede migrazione dati esistenti → valutare se vale).

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
- [ ] Widget admin per visualizzare i nuovi eventi (3 sezioni: counters 7/30g, top ricerche, ultimi 20 eventi). Branch `admin-prod`.
- [ ] Retention/purge (`pg_cron` su `analytics_events` > 1 anno) → solo se cresci sopra ~5K DAU.
- Migrazione del legacy Firebase Analytics su Supabase: **non pianificato**, i dati storici Firebase restano dove sono.

---

## Branch attivi (NON cancellare)

- **`main`** — branch di sviluppo principale. Contiene card + ristoranti (post-merge 2026-05-12).
- **`backup/main-card-only`** (`899752c`) — snapshot pre-merge della versione 1.0.6 (solo card, pre-ristoranti). Punto di rollback rapido in caso di problemi su main: `git reset --hard backup/main-card-only && git push --force-with-lease origin main`.
- **`backup/restaurants-v2`** (`47abcc8`) — branch storico da cui è nato il merge (ex `feature/restaurants-v2`). Tenuto come secondo backup dormiente. Punta allo stesso commit di main.
- **`admin-prod`** — produzione admin dashboard (https://admin.allergiapp.com), branch dedicato.
- **`landing`** — sito web pubblico, servito via Vercel.
