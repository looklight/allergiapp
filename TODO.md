# AllergiApp - TODO


## Branch attivi (NON cancellare)

- **`main`** — branch di sviluppo principale. Contiene card + ristoranti (post-merge 2026-05-12).
- **`backup/main-card-only`** (`899752c`) — snapshot pre-merge della versione 1.0.6 (solo card, pre-ristoranti). Punto di rollback rapido in caso di problemi su main: `git reset --hard backup/main-card-only && git push --force-with-lease origin main`.
- **`backup/restaurants-v2`** (`47abcc8`) — branch storico da cui è nato il merge (ex `feature/restaurants-v2`). Tenuto come secondo backup dormiente. Punta allo stesso commit di main.
- **`admin-prod`** — produzione admin dashboard (https://admin.allergiapp.com), branch dedicato.
- **`landing`** — sito web pubblico, servito via Vercel.


## Pulizia futura non urgente (post-merge restaurants-v2)

Dopo il merge del 2026-05-12 sono stati rimossi `services/remoteConfig.ts`, `components/AllergenBadges.tsx`, `components/restaurants/RestaurantCard.tsx` (−499 righe). Restano due livelli di pulizia non bloccanti:

### Tier 2 — Rimuovere dipendenze Firebase Remote Config (richiede prebuild)
- [ ] Rimuovere `@react-native-firebase/remote-config` da `package.json` (`npm install` per aggiornare il lock)
- [ ] Rimuovere dal plugin `plugins/withModularHeaders.js` i pod orfani: `FirebaseRemoteConfig`, `FirebaseABTesting`, `FirebaseRemoteConfigInterop`, `FirebaseSharedSwift` (verificare che non siano dipendenze transitive di Crashlytics/Sessions prima di rimuovere)
- [ ] `npx expo prebuild --clean` per rigenerare `ios/` con il nuovo Podfile
- [ ] Build EAS preview di verifica
- **Beneficio:** bundle iOS leggermente più leggero. **Costo:** prebuild + build di verifica (~25 min).

### Tier 3 — Cleanup cascade banner promo (BannerCarousel + tipi)
- [ ] In `app/components/BannerCarousel.tsx`: rimuovere il rendering dei banner `type === 'ad'` (rami non più raggiunti — `extraBanners` non riceve più banner ad)
- [ ] In `services/analytics.ts`: valutare se `logAdImpression` e il parametro `adUrl` di `logBannerClicked` restano usati altrove
- [ ] In `types/index.ts` `BannerItem`: rimuovere campi `adUrl`, `adAction`, `adImage`, `adButtonText`, `layout`, `backgroundColor`, `textColor`, `displayDuration`, `customContent` se davvero non più referenziati
- [ ] Valutare se `BannerType` può diventare solo `'info'` (rimuovendo `'ad'` e `'custom'`)
- **Beneficio:** componente più chiaro, tipi più stretti. **Costo:** test manuale su device richiesto (tocca codice vivo).

### Splash screen Android — uniformare background a tutto schermo
**Stato (2026-05-13): fix implementato, da verificare al prossimo build EAS Android.**

Causa root: alla transizione splash→app su Android 12+ il sistema espone `AppTheme.windowBackground` (bianco default) per qualche frame, prima che la View React si monti. Si vede un bordo non uniforme attorno al logo.

- [x] Creato plugin custom `plugins/withAndroidWindowBackground.js` che setta `AppTheme.android:windowBackground = @color/app_window_background (#F7DCB3)` via `withAndroidColors` + `withAndroidStyles`. Solo Android (non tocca iOS in alcun modo). Registrato in `app.config.ts`.
- [ ] Test: `npx expo prebuild --clean` + build EAS Android + installare su device Android 12+ e Android 11- (le due API system splash si comportano diversamente)
- Se il flash bianco persiste, fallback: customizzare `windowSplashScreenIconBackgroundColor` o ridurre `imageWidth`.


---

## Android — bug aperti da risolvere

**Vincolo assoluto:** ogni fix deve essere Android-only via `Platform.OS === 'android'` o equivalente. iOS è "perfetta" e non va toccato in nessun caso.

### Footer / tab bar — possibile regressione del fix safe area
**Stato (2026-05-13): risolto e verificato in Expo Go Android. iOS invariato.**

Causa: la formula hardcoded `49 + insets.bottom + 12/16` per gli overlay non rifletteva l'altezza reale del tab bar (`56 + max(insets.bottom, 16)` = 72dp in Expo Go), quindi banner e FAB finivano sotto.

- [x] In `app/(tabs)/restaurants.tsx`: introdotto `useBottomTabBarHeight()` da `@react-navigation/bottom-tabs` e variabile `overlayBaseBottom = Platform.OS === 'android' ? tabBarHeight : 49 + insets.bottom`. Usato per `nearbyBanner` (bottom + 12) e `fabWrapper` (bottom + 16). Self-correcting su Android, iOS conserva formula originale.
- [ ] Verifica anche in EAS build (Expo Go ed EAS hanno insets.bottom diversi — su EAS l'overlay si dovrebbe comunque agganciare correttamente perché `useBottomTabBarHeight()` legge l'altezza reale).

### Bottom sheet — spazio vuoto sotto
**Stato (2026-05-13): risolto e verificato in Expo Go Android. iOS testato, nessuna differenza visiva.**

Causa root (confermata): il container del sheet era ancorato `top: 0` con `height = useWindowDimensions().height * maxSnap + (Android ? insetBottom : 0)`. Il parent (`MaybeScreenContainer` di React Navigation, vedi `node_modules/@react-navigation/bottom-tabs/.../BottomTabView.js:252`) ha `overflow: 'hidden'`. L'estensione `+insetBottom` veniva ritagliata, mentre il `paddingBottom: insetBottom` sul body continuava a spostare il contenuto su → gap visibile.

- [x] In `components/BottomSheet/BottomSheet.tsx`: refactor a `bottom: 0` anchoring. Container hugga sempre il fondo del parent, zero dipendenza dall'accuratezza di `useWindowDimensions`. Math: `containerHeight = height * maxSnap`, `positions = snapPoints.map(p => height * (maxSnap - p))`, `closedY = containerHeight`, `reportSnap = (closedY - y) / height`. Math diversa ma proiezione visiva identica su iOS (verificato).
- [x] Sistema lo stesso `BottomSheet` usato da `RestaurantDetailSheet` e `NearbyListSheet` → entrambi risolti.

### Bottom sheet — lag scrolling + drag scattoso
**Stato (2026-05-13): confermato visivamente in Expo Go Android (sia lo scroll del contenuto sia il drag del sheet stesso). iOS Expo Go fluido. In attesa di test EAS dev-client per discriminare overhead Expo Go vs problema reale.**

Cause architetturali sospette (in ordine di probabilità):
1. Overhead Expo Go dev mode su Android (~5x rispetto a EAS production). iOS Expo Go è strutturalmente più ottimizzato → asimmetria naturale.
2. `elevation` Android sul container (8) + `RestaurantDetailSheet.sheetShadow` (16) o `NearbyListSheet.sheet` (12): renderizzare shadow elevata + rounded corners + overflow:hidden durante transform è uno dei principali bottleneck noti.
3. `simultaneousWithExternalGesture(scrollGesture)` sul bodyPan può avere overhead per frame anche quando lo scroll non è attivo.

- [ ] **Prima di intervenire**: testare in EAS dev-client / internal testing per verificare se il problema persiste in produzione
- [ ] Se persiste in EAS: provare `renderToHardwareTextureAndroid={true}` sull'`Animated.View` del container in `BottomSheet.tsx`. Caveat: rasterizza in bitmap, ottimo per drag (transform-only) ma può peggiorare lo scroll del contenuto (texture invalidata ad ogni frame di scroll). Da testare con attenzione.
- [ ] Alternativa più aggressiva: ridurre `elevation` su Android (es. 16 → 4) — meno qualità shadow ma molto più leggero. Solo `elevation` (non shadow* che è iOS).
- [ ] Profiler React DevTools / Reanimated debug per misurare frame drop reali

### Mappa Android — pin issues
**Stato (2026-05-14)**: 5/7 risolti. Restano centramento camera "sale e scende" e pin mancanti.

- [x] **Pin tagliati** — risolto in `components/map/SelectedMarkerOverlay.tsx`: il `transform: [{ scale: 1.25 }]` causava clipping perché `react-native-maps` su Android rasterizza il marker in un bitmap basato sul layout naturale della View (pre-transform). Gate del transform a `Platform.OS === 'ios'`. iOS bit-per-bit identico. Su Android il pin selezionato resta differenziato da bg colorata + shadow potenziata + zIndex 9999 + `cluster={false}`.
- [x] **Pin che scompaiono al cambio selezione** — risolto in `components/map/MapPin.tsx`: aggiunto `androidSettling` state che estende la finestra `tracksViewChanges=true` a ~100ms dopo mount e dopo ogni cambio prop rilevante. La drawing cache nativa Android richiede più tempo di un single frame per ricatturare il bitmap del marker. iOS gestito via early return dell'useEffect, byte-identico.
- [x] **Colori pin non aggiornati con filtro "per me"** — stessa root cause del precedente (bitmap caching su prop change). Risolto dallo stesso fix `androidSettling`.
- [x] **Bussola Android seminascosta dietro UI** — risolto in `RestaurantMap.native.tsx` con `mapPadding={{ top: insets.top + 120, right: 12, bottom: 0, left: 0 }}` solo su Android. Settaggio statico (non toggle, niente salti). iOS non viene toccato, continua col `compassOffset`. Side effect noto: il centro logico della camera shift in basso di ~70px su Android.
- [x] **Pin centra male se mappa ruotata** (su entrambe le piattaforme, bug pre-esistente latente) — risolto aggiungendo `heading: 0` + `pitch: 0` alla `animateCamera` del ramo pin-selection. La math dell'offset assumeva north-up: con la mappa ruotata, "sud sul globo" non corrispondeva più a "giù sullo schermo" → pin fuori centro o fuori dallo schermo. Reset di heading/pitch al tap pin è comportamento standard di Apple/Google Maps.
- [ ] **Centramento camera — animazione "sale e scende" + pin atterra troppo in alto**: comportamento Android-specifico, sospettata easing overshoot del native Google Maps SDK. Da indagare con EAS dev-client.

  **Tentativi falliti in Expo Go (2026-05-13)** — documentati per non riprovarli:
  - `mapPadding` prop (Android-only, gated): aggiunto al `<ClusteredMapView>` quando un bottom sheet è aperto, con `bottomSheetCoverage` passato da `restaurants.tsx`. Effetto: il pin atterra correttamente centrato MA all'apertura/chiusura del sheet il map nativo aggiusta istantaneamente il punto di centro logico → salto visivo del world content. `mapPadding` non è animabile, quindi il toggle on/off è sempre visibile. Scartato per side-effect. Codice ripristinato a `cd26fbf`.
  - `animateCamera` → `animateToRegion` sul ramo else del useEffect centerOn (Android-only): cambio API senza altre modifiche. Effetto: nessuno. La libreria `react-native-maps` Android usa la stessa chiamata sottostante `map.animateCamera(update, duration, null)` per entrambe le API, cambia solo il tipo di `CameraUpdate` (newLatLng vs newLatLngBounds). Stesso easing nativo. Scartato. Codice ripristinato a `cd26fbf`.

  **Da provare quando avremo EAS dev-client + logging**:
  - Aggiungere `console.log` in `RestaurantMap.native.tsx:158-167` per capire esattamente quando viene chiamato `animateCamera`, con quali parametri, e se ci sono chiamate multiple concorrenti
  - Ridurre `duration` da 400ms a 200-250ms su Android: maschera il problema (meno tempo per vedere overshoot) ma non lo risolve. Solo se non c'è scelta.
  - Rimuovere il `setTimeout(50ms)` su Android: l'animazione parte sincrona col cambio di stato, potrebbe interagire meglio con i re-render del SelectedMarkerOverlay
  - Investigare se Google Maps Android SDK ha un "smart camera" che attiva zoom-out-then-in per certi pattern di animazione

- [ ] **Non tutti i pin si vedono**: verificare se è il decluttering by-design in `MapPin.tsx:117-119` (pin con `dotCovered === 0` nascosti al far zoom quando `showMatchInfo` è attivo, salvo favoriti) oppure clustering aggressivo / viewport bbox stretto. Capire se l'utente trova confondente il decluttering — se sì, valutare di mostrare i pin grigi anche al far zoom.

### Modal foto menu — segnala recensione, tap esterno non chiude
**Stato (2026-05-13): risolto e verificato in Expo Go Android. iOS invariato.**

Causa root: `ImageFullscreenModal.tsx` (e analogo `PhotoGalleryModal.tsx`) non avevano `onRequestClose` sul `<Modal>` (back button Android no-op) e l'area scura attorno all'immagine non aveva handler di tap. Solo il tap sull'immagine chiudeva via `onSingleTap`. Niente di legato al pattern siblings Pressable+View che era già stato sistemato altrove.

- [x] Aggiunto `onRequestClose={onClose}` sul `<Modal>` in entrambi i file (gestisce back button Android, no-op iOS).
- [x] `pageContainer` da `<View>` a `<Pressable>` con `onPress={Platform.OS === 'android' ? onClose : undefined}`. Su iOS `onPress` è `undefined` → Pressable degenera a View → comportamento iOS identico.

### Lag generale Android
Tutto sembra meno fluido che su iOS. Da capire se è Expo Go (~5x più lento per via di dev mode + niente Hermes optimizations) o se ci sono problemi reali.

- [ ] **Prima di indagare oltre**: testare in un EAS build (dev-client o internal testing) per escludere l'overhead di Expo Go
- [ ] Se persiste in EAS: profiler RN, controllare re-render eccessivi (FlatList senza keyExtractor stabile, useState in componenti grossi), Reanimated worklets che fanno troppo, immagini non ottimizzate (vedi roadmap migrazione a `expo-image` nella sezione Gestione immagini)
- [ ] Verificare che Hermes sia attivo nel build (default in SDK 54 ma controllare)

---

### Azioni manuali Supabase
- [ ] **Conferma email / anti-spam** — attualmente disabilitata. Verificare schermate per conferma email.
- [ ] **Allineare tabella `translations` prima del prossimo build prod con ristoranti** — i JSON in `scripts/translations/*.json` contengono le 5 nuove voci tree nuts (almonds, hazelnuts, walnuts, pistachios, cashews) e completamenti per ~8 lingue incomplete. Lanciare `node scripts/uploadToSupabase.js` per pushare. Altrimenti utenti con lingue scaricate vedranno fallback inglese su quelle voci. Vedi commit `98a101c`.


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

---

## Feature da completare

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

### Admin dashboard
- [x] Migrata da Firebase a Supabase (mar 2026)
- [x] Deploy su Vercel — live su https://admin.allergiapp.com (branch `admin-prod`)
- [ ] Gestione claim ristoranti

---

## Stato Analytics & Firebase — verificato 2026-05-12

Firebase Analytics + Crashlytics sono **attivi in produzione** con pattern Expo Go-safe (verifica post-merge):

- Plugin nativi condizionali in `app.config.ts:67-72` — caricati solo se `EAS_BUILD=true`. `googleServicesFile` iOS/Android anch'essi condizionali (`app.config.ts:18,43`).
- `services/analytics.ts` e `services/crashlytics.ts` usano `require()` dinamico in `try/catch` → in Expo Go `isFirebaseAvailable=false` e tutti i metodi diventano no-op.
- Gating consenso ATT corretto in `app/_layout.tsx:120-122` (dopo `hasAcceptedLegalTerms`): `Analytics.setTrackingConsent` + `Crashlytics.setCollectionEnabled` + `logAppOpened` + `updateUserProperties`. Propagazione immediata in `app/consent.tsx:58`.

**Conseguenza pratica:** sviluppo in Expo Go senza warning Firebase, build EAS (preview/beta/prod) inviano eventi Analytics (gated ATT) e crash a Crashlytics.

**Da verificare in vivo con un build EAS preview:** eventi visibili in Firebase Console (con consenso ATT accettato), crash forzato visibile in Crashlytics, Expo Go senza warning.

### Eventuale futura sostituzione del backend Analytics
Non urgente, da fare solo se si decide di abbandonare Firebase:
- L'interfaccia pubblica `Analytics.*` è già astratta: basta riscrivere l'implementazione di `services/analytics.ts` cambiando target (Supabase `analytics_events` / PostHog / Mixpanel), i call site non vanno toccati.
- Crashlytics può restare anche senza Analytics — è un servizio separato.


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
- [ ] **`fadeDuration={0}` sulle thumb Android** — rimuove il fade-in 300ms che fa percepire lag anche su thumb già cachate. Prop su `<Image>` in `RestaurantDetailBody.tsx` e `MenuPhotosSection.tsx`.

**Monitoraggio:**
- [ ] Aggiungere check periodico su Supabase Dashboard → Settings → Usage. Soglia di allarme: 60% di egress a metà mese = valutare passaggio a Pro ($25/mese, 250GB egress inclusi).

---

## Qualità codice & DevOps

### Testing
- [ ] Aggiungere Jest + React Native Testing Library
- [ ] Scrivere test per i service critici: `restaurantService`, `auth`, `translationService`
- [ ] Scrivere test per i custom hook principali (`useRestaurantDetail`, `useRestaurantGeo`)
- [ ] **Da fare prima del merge restaurants→main** — le due codebase si uniscono senza rete di sicurezza

### CI/CD — GitHub Actions
- [ ] Workflow base su PR: `tsc --noEmit` + lint + test
- [ ] Valutare EAS build preview automatico su PR

### Error reporting
- [ ] Valutare Sentry per error reporting (source maps, breadcrumbs, crash reporting)

### Performance
- [ ] Aggiungere `useMemo`/`useCallback` negli screen con liste e computazioni ripetute
- [ ] Ottimizzare FlatList: `removeClippedSubviews`, `maxToRenderPerBatch`, `React.memo` sugli item
- [ ] Spezzare componenti grossi: `RestaurantDetailBody` (619 righe), `RestaurantMap` (411), `card.tsx` (473)

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

---

## Debito tecnico

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

---

### Separare la dashboard admin in repository indipendente
**Priorità: bassa — non urgente**

Attualmente `admin/` vive dentro il repo `allergiapp/` ed è presente su tutti i branch. Questo causa confusione: versioni diverse dell'admin su branch diversi, rischio di sovrascritture durante i merge, ambiguità su quale sia la versione "vera". Per ora la regola operativa è: **modifiche admin solo su `admin-prod`**.

Soluzione a lungo termine: spostare `admin/` in un repo separato con il proprio deploy Vercel. App e admin non condividono codice direttamente (client Supabase separati, nessun tipo condiviso rilevante).

---

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

### Due sistemi di diete/restrizioni — intenzionalmente separati
- `types/index.ts` — `DietId` → profilo utente ristoranti (filtro "Per me", salvato su Supabase)
- `constants/dietModes.ts` — `DietModeId` → sezione card (UI, colori, traduzioni, restrizioni auto-select)
- Scopi distinti, non da unificare. `pregnancy` esiste solo in card, `vegan` solo in DietId.

### Google Places API — dati gratuiti non ancora sfruttati
- [x] **Mappare `primaryType` sulle cucine dell'app** — `GOOGLE_TYPE_TO_CUISINE` implementato in `services/placesService.ts`, `primaryType` incluso nella `FieldMask`.
- [ ] **Decidere quali altri campi Basic Data includere** — campi gratuiti/già pagati non ancora richiesti: `types` (array di categorie), `photos` (riferimenti foto), `plusCode`, `viewport`. Da valutare se e quali portare nella `FieldMask` e nel DB.


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


---

### Asset optimization (audit pre-rilascio)
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
