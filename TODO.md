# AllergiApp - TODO


### Azioni manuali Supabase
- [ ] **Conferma email / anti-spam** — attualmente disabilitata. Verificare schermate per conferma email.


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
- [ ] Gestione claim ristoranti
- [ ] Deploy su Vercel

---

## Architettura — decisioni pendenti

**Da fare quando si riattivano le analytics:**
- [ ] Scegliere backend analytics (Supabase tabella `analytics_events` / PostHog / altro)
- [ ] Implementare `trackEvent()` in `services/analytics.ts` (interfaccia pubblica già pronta, tutti i call site funzionano)
- [ ] Creare tabella `app_config` su Supabase per banner promo e popup message (sostituisce Remote Config)
- [ ] Se si decide di NON riattivare analytics, rimuovere `expo-tracking-transparency` da `app.config.ts` e la logica di consenso ATT


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

---

## Debito tecnico

### Due sistemi di diete/restrizioni — intenzionalmente separati
- `types/index.ts` — `DietId` → profilo utente ristoranti (filtro "Per me", salvato su Supabase)
- `constants/dietModes.ts` — `DietModeId` → sezione card (UI, colori, traduzioni, restrizioni auto-select)
- Scopi distinti, non da unificare. `pregnancy` esiste solo in card, `vegan` solo in DietId.

### Google Places API — dati gratuiti non ancora sfruttati
- [ ] **Confrontare `primaryType` con le cucine dell'app** — Google restituisce già la categoria del locale (es. `italian_restaurant`, `sushi_restaurant`) nel campo `primaryType` (Basic Data, già pagato). Mapparlo sulle `cuisine_types` esistenti per pre-compilare il campo durante l'inserimento. Richiede una tabella di mapping `googleType → CuisineId`.
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
