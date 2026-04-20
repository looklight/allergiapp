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

