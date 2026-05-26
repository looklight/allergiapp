# Restaurant Share — Working Notes

Diario leggero della feature condivisione ristorante (Universal Links + pagina web pubblica).
Non è un piano vincolante: si aggiorna quando cambiamo idea. Le decisioni superate si riscrivono.
Serve solo a non perdere il filo.

---

## Stato attuale

Fase 1 (DB foundation), Fase 2 (landing serverless function) e Fase 3 (app side) completate dal lato codice. Prossimi step utente: applicare migration 061 su Supabase + rebuild EAS + test su device fisico.

## Decisioni prese

### 2026-05-26 — Tema 1: Strategia di rimozione/visibilità
**Decisione**: Hard delete. Niente colonna `status`, niente soft-delete.
**Perché**: app in beta con pochi tester, un solo admin (Luca), problema cascade-delete esiste già e non è introdotto dallo share. Aggiungere soft-delete è premature optimization.
**Implicazioni**:
- Quando admin elimina un ristorante, riga e dati collegati spariscono (cascade su reviews, photos, ecc.)
- La pagina web `/r/[slug]` deve gestire bene il 404 "ristorante non trovato"
- Se in futuro serve, soft-delete è retrofittable: `ALTER TABLE` aggiuntiva, niente cambiamenti rotti
- Safety net esistente: Supabase Pro ha Point-In-Time Recovery (rollback DB) per errori gravi

### 2026-05-26 — Tema 2: Slug & URL
**Decisione**: Slug naturale leggibile (`/r/da-mario-roma`), non UUID.
**Perché**: URL belli + SEO + percezione professionale. Il costo extra è minimo.
**Dettagli operativi**:
- **Prefisso URL**: `/r/` (es. `allergiapp.com/r/da-mario-roma`). Convenzione modern (Reddit-style), corto, pairs con futuri `/u/[username]`
- **Caratteri**: solo ASCII lowercase + cifre + trattini. Accenti translitterati (`Cocò` → `coco`)
- **Collisioni omonimi**: suffix numerico (`da-mario-roma`, `da-mario-roma-2`, ...) — pattern WordPress/GitHub
- **Immutabilità**: slug fissato alla creazione, mai aggiornato se cambia il nome del ristorante. Garantisce link condivisi stabili
- **Generazione**: trigger SQL su INSERT in `restaurants`. Single source of truth, no duplicazione logica app/admin

### 2026-05-26 — Tema 2 sub: Slug ritirati post-eliminazione
**Decisione**: Rischio accettato. Niente tabella `retired_slugs`.
**Perché**: scenario raro, non delicato. Se admin elimina "Da Mario Roma" e poi qualcuno ricrea uno con stesso nome+città, il nuovo eredita lo slug. Un vecchio link puntato al precedente porterebbe al nuovo (silenziosamente). Accettabile per la fase attuale.
**Limite noto**: documentato qui, monitorabile in produzione.

### 2026-05-26 — Tema 3: Dove vive la pagina web
**Decisione**: Serverless function Vercel sul landing esistente. **Niente migrazione Next.js per ora.**
**Perché**: l'obiettivo immediato è lo share button, non un portale web. Migrazione Next.js sarebbe lavoro upfront non necessario per validare la feature.
**Architettura**:
- Landing statico HTML/CSS resta intatto al 100% (zero rischio regressioni)
- Aggiunta `landing/api/r/[slug].js` come Vercel serverless function
- Function: query Supabase via RPC `get_restaurant_public`, render HTML server-side, ritorno con meta OG + smart banner
- HTML generato riusa gli stessi CSS del landing (`/styles.css`) → look coerente gratis
- `vercel.json`: aggiunta rewrite rule per `/r/*` → `/api/r/[slug]`
**Quando migreremo a Next.js**: se/quando aggiungeremo pagine dinamiche aggiuntive (mappa, ricerca, filtri). La function attuale diventerà ~2 ore di traduzione in JSX. Non è lavoro buttato, è lavoro fatto al momento giusto.

### 2026-05-26 — Tema 4: Aspetto visivo pagina condivisione
**Decisione hero pagina**: Niente foto utente nella V1. Hero text-based con nome ristorante grande, città, rating, lista allergeni gestiti. Mappa statica come preview location.
**Perché**: prima impressione sempre dignitosa, niente rischio "foto utente di qualità casuale" come biglietto da visita pubblico. Niente questioni di rights su user content. Galleria foto utente è feature Phase 2 additiva.

**Decisione OG image (anteprima link)**: Immagine statica = `happy_plate.webp` per tutti i ristoranti. Title e description dinamici (nome ristorante + città + rating).
**Perché**: brand asset già perfetto, riconoscibile, zero nuove dipendenze. Title/description portano l'info specifica per ristorante — l'immagine identica per tutti è trade-off accettabile.
**Possibile evoluzione Phase 2**: OG dinamica con `@vercel/og` che incorpora happy_plate + nome ristorante sopra. Solo se i dati di M1 mostrano click-through basso.

### 2026-05-26 — Tema 5: Universal Links setup
**Decisione URL pattern**: solo `/r/*` per ora. Pattern futuri (`/u/*`, `/c/*`...) si aggiungeranno solo quando implementeremo le route corrispondenti — il pattern è server-side nel file AASA, quindi modificabile senza nuova build app.
**Decisione domini**: solo apex `allergiapp.com`. `www.allergiapp.com` redirige 301 lato Vercel. Universal Links non seguono i redirect, ma in pratica condividi sempre link senza `www`.
**Dati operativi (già recuperati)**:
- iOS bundleIdentifier: `com.allergiapp`
- Android package: `com.allergiapp.mobile`
- iOS Team ID: `F327489U5B`
- Custom URL scheme esistente: `allergiapp://` (riusato per fallback)
- `associatedDomains` in `app.config.ts`: **da aggiungere** (attualmente assente)
**Da fare in implementazione**:
- File `landing/public/.well-known/apple-app-site-association` (no estensione, Apple severa)
- File `landing/public/.well-known/assetlinks.json` (SHA-256 da recuperare via `eas credentials`)
- Vercel: rewrite per servirli con Content-Type corretto
- `app.config.ts`: `associatedDomains: ['applinks:allergiapp.com']` + `intentFilters` Android

### 2026-05-26 — Tema 6: Smart banner web
**Decisione**: Livello 1 — minimo funzionale.
**iOS**: meta tag `apple-itunes-app` (banner Safari nativo, zero codice custom).
**Android**: banner sticky in alto, una riga con happy_plate + testo "Apri questo ristorante in AllergiApp" + freccia. Non dismissabile in V1. Tap → tenta deep link, fallback Play Store.
**Desktop**: nessun banner — CTA principale nella pagina basta.
**Perché**: validare prima la feature, poi raffinare. Banner dismissabile, badges grafici, animazioni → Phase 2 se dati lo giustificano.

### 2026-05-26 — Tema 7: App side
**Bottone Share**:
- Posizione: header scheda dettaglio ristorante (`app/restaurant/[id].tsx`), in alto a destra accanto al cuoricino preferiti
- Una sola superficie in V1 (niente share su card preview / mappa popup)
- Tap → share sheet nativo iOS/Android via `Share.share()` (built-in React Native)
- Contenuto: URL `https://allergiapp.com/r/{slug}?ref=share` + testo "Nome Ristorante, Città — visto su AllergiApp"

**Deep link in entrata**:
- Nuova route `app/r/[slug].tsx` come entry-point minimale
- All'apertura: RPC `get_restaurant_by_slug` → ID → redirect a `/restaurant/[id]` esistente
- Slug non trovato: redirect home + toast "Ristorante non disponibile"

**Tracking**:
- Evento `restaurant_shared` su Supabase (no Firebase, allineato a [project_firebase_removal])
- Payload: `{ restaurant_id, slug, user_id?, timestamp }`
- Tracking trigger del share (non destination — iOS non passa in modo affidabile)

**Esclusioni deliberate V1**: no tracking destinazione, no share su card/mappa, no preview-modal prima dello share.

### 2026-05-26 — Tema 8: i18n pagina ristorante
**Lingue V1**: Italiano + Inglese. Solo 2 per partire (mercati card già coperti da `translations.json` esistente, ma teniamo V1 minimale).
**URL strategy**: URL singolo `/r/[slug]` per tutte le lingue. Server legge `Accept-Language` header del browser, serve la lingua più adatta, fallback IT.
**Perché URL singolo**: una sola condivisione, una sola sorgente di verità, link che "si adatta" al destinatario. SEO multi-lingua resta opzione M2/M3.

### 2026-05-26 — Tema 9: DB migration plan
**Decisione**: Migration standalone, eseguita per prima — prima di qualsiasi codice landing/app.
**Cosa contiene la migration**:
1. `ALTER TABLE restaurants ADD COLUMN slug TEXT`
2. Funzione `generate_restaurant_slug(name, city)` — translitterazione, lowercase, hyphens
3. Funzione `assign_unique_slug(base)` — gestione collisioni con suffix `-2`, `-3`...
4. Trigger `BEFORE INSERT` su restaurants — auto-gen slug se NULL
5. Backfill `UPDATE` ristoranti esistenti
6. UNIQUE INDEX su slug
7. NOT NULL constraint dopo backfill
**Perché standalone**: rischio contenuto, rollback facile, foundations solide prima di costruire sopra. App 1.0.6 e admin restano funzionanti (la colonna nuova è ignorata da chi non la conosce).

### 2026-05-26 — Tema 10: RPC pubblica e contenuti pagina
**Principio**: la pagina pubblica `/r/[slug]` è un **mirror della scheda app**, identica al caso "utente loggato senza needs settati". Niente nuova logica, riusiamo il pattern di rendering esistente. Azioni account-only diventano CTA "Apri nell'app".

**RPC `get_restaurant_public(p_slug)` ritorna**:
- `id, slug`
- `name`, `address`, `google_place_id`
- `average_rating`, `review_count`
- `price_range`
- `cuisine_votes` (array `{ cuisine_id, vote_count }`)
- `menu_url` se presente
- Foto: `menu_photos` (foto menù caricate dagli utenti) + foto allegate alle reviews
- Lista review complete: testo, rating, autore (rispettando `is_anonymous` e `is_inactive`), foto, `allergensSnapshot`, `dietarySnapshot`, `likes_count` (senza `likedByMe`), `created_at`

**Campi sempre esclusi**:
- `added_by`, `owner_id`, `is_premium`, `subscription_status`, `subscription_expires_at`
- Phone, website (non presenti nell'app, non esposti)
- `likedByMe` per review (non applicabile a anon)

**Elementi UI app esclusi dalla pagina pubblica**:
- Compatibility badge / "Fa per te" (richiede needs utente, non disponibile su web)
- Bottoni interattivi (like, report, scrivi review, preferiti) → diventano CTA "Apri nell'app"
- Footer azioni gestione (delete, segnala ristorante)

**RLS**: la RPC è `SECURITY DEFINER` con `GRANT EXECUTE TO anon`. Le tabelle sottostanti restano protette dal RLS esistente (status quo, nessun cambiamento).

### 2026-05-26 — Tema 11: Comportamento app per utenti anonimi
**Decisione**: Nessun cambiamento. Login resta richiesto nell'app. Web e app sono esperienze deliberatamente diverse:
- **Web** = vetrina pubblica, read-only, accessibile a chiunque
- **App** = esperienza piena, richiede login

**Trade-off accettato**: chi clicca un link condiviso e ha l'app installata viene portato nell'app via Universal Link e vede login gate, non il ristorante. Se non avesse avuto l'app, avrebbe visto tutto sul web. È una scelta deliberata: l'app è per utenti "ingaggiati", il web per scoperta.

**Idea minore in implementazione (non decisione di design)**: il login gate, quando viene da un deep link `/r/[slug]`, può mostrare "Accedi per vedere **{nome ristorante}**" invece del messaggio generico. Costo basso, riduce attrito. Da valutare in fase implementativa.

## Aperto / da decidere

_Nessun tema aperto. Design phase chiusa._

## Fatto

### 2026-05-26 — Fase 1: DB foundation
- ✅ Migration `059_restaurant_slug.sql` scritta e applicata su Supabase
  - Colonna `slug` su `restaurants` con UNIQUE INDEX + NOT NULL
  - Funzioni `generate_restaurant_slug` (ASCII + unaccent) + `assign_unique_restaurant_slug` (suffix `-2`, `-3`...)
  - Trigger `BEFORE INSERT` per auto-generazione
  - Backfill di tutti i ristoranti esistenti
- ✅ Migration `060_public_restaurant_rpcs.sql` scritta e applicata
  - RPC `get_restaurant_by_slug(slug) → UUID` per deep link app
  - RPC `get_restaurant_public_by_slug(slug) → JSONB` con payload completo per la pagina web
  - GRANT EXECUTE TO anon, SECURITY DEFINER
- ✅ Verifica regressioni: app 1.0.6 e admin continuano a funzionare normalmente

**Nota per Fase 2**: `user_avatar_url` nella RPC pubblica ritorna chiavi tipo `"plate_wizard"` invece di URL HTTP (sono identificatori di avatar custom risolti client-side). La landing function dovrà replicare la stessa risoluzione.

### 2026-05-26 — Fase 2: Landing serverless function
- ✅ Branch `feature/restaurant-share-page` su `landing` con 2 commit (pagina + Universal Links)
- ✅ Serverless function `landing/api/r/[slug].js` deployata su Vercel preview
- ✅ Env vars `SUPABASE_URL` + `SUPABASE_ANON_KEY` configurate su Vercel landing project (production/preview/development) via REST API
- ✅ Pagina pubblica testata su preview, rendering corretto: nome, indirizzo, rating, cuisine_votes, prezzo, menu, reviews con snapshots, smart banner Android, meta OG, deep link con fallback
- ✅ File `.well-known/apple-app-site-association` (Team ID F327489U5B + bundle) e `assetlinks.json` (con placeholder SHA-256 — da popolare)

**Note Fase 2 (debito tecnico noto)**:
- **Avatar non renderizzati**: l'app risolve chiavi tipo `plate_wizard` a immagini locali. La landing mostra solo il nome — deliberato per V1
- **Mappa preview statica non implementata**: era in design Tema 4. Solo bottone "Vai su Google Maps" presente. Da aggiungere in M2 polish (Mapbox/Google Static Maps API)
- **`labels.js` hardcoded**: traduzioni IT/EN copiate da constants TypeScript dell'app. Migrazione futura: RPC che pesca da Supabase `translations`
- **JSON-LD `Restaurant` schema mancante**: SEO opportunity per stelline gialle Google. M2 polish
- **SHA-256 Android per assetlinks.json**: ancora placeholder, da popolare via `npx eas credentials --platform android`

### 2026-05-26 — Fase 3: App side (codice completato)
- ✅ Branch `feature/restaurant-share-app` (from `feature/restaurant-share-db`)
- ✅ `app.config.ts`: `associatedDomains: ['applinks:allergiapp.com']` su iOS + `intentFilters` Android con `autoVerify: true` per pattern https://allergiapp.com/r/*
- ✅ Route `app/r/[slug].tsx`: deep link entry — chiama RPC `get_restaurant_by_slug`, redirige a `/restaurants/[id]` esistente, fallback home + alert se slug non trovato
- ✅ `services/shareRestaurant.ts`: helper compone URL + messaggio, chiama `Share.share()` nativo, tracking best-effort `track_event('restaurant_shared')` su Supabase
- ✅ `services/restaurant.types.ts`: campo `slug?: string` aggiunto al type Restaurant (opzionale per non rompere RPC esistenti che non lo proiettano)
- ✅ `app/restaurants/[id].tsx`: azione share aggiunta nell'AppHeader, accanto al cuoricino preferiti
- ✅ `locales/{it,en}.json`: chiavi `share.*` (shareRestaurant, suffix, dialogTitle, error)
- ✅ Migration `061_analytics_events.sql`: tabella `analytics_events` (RLS bloccata) + RPC `track_event(name, properties)` SECURITY DEFINER

**Step utente per chiudere M1**:
1. Applicare `061_analytics_events.sql` su Supabase (Studio SQL Editor)
2. Recuperare SHA-256 Android: `npx eas credentials --platform android` → aggiornare `landing/.well-known/assetlinks.json`
3. Rebuild EAS: `npx eas-cli build --platform all --profile production` (richiede nuova build, no OTA per modifiche `app.config.ts`)
4. Submit alle App Store
5. Test su device fisico: tap share → share sheet → invio link a se stesso → tap link → deve aprire app sulla scheda corretta

## Riferimenti

- Branch app: `feature/restaurant-share` _(da creare quando partirà l'implementazione)_
- Branch landing: `feature/restaurant-share-page` _(da creare quando partirà)_
- Memory rilevanti:
  - `feedback_topic_by_topic_discussions.md` — discutere un tema alla volta, verificare assunti
  - `feedback_no_emoji.md` — niente emoji nel codice
  - `feedback_phased_refactor.md` — step incrementali a rischio crescente
- File toccati attesi:
  - `allergiapp/app.config.ts` — `associatedDomains` (iOS) + `intentFilters` (Android)
  - `allergiapp/app/r/[slug].tsx` — deep-link entry route
  - `allergiapp/app/components/restaurant/ShareButton.tsx` — nuovo componente
  - `landing/api/r/[slug].js` — serverless function
  - `landing/public/.well-known/apple-app-site-association`
  - `landing/public/.well-known/assetlinks.json`
  - `landing/vercel.json` — rewrite rule
  - Supabase migrations — nuova migration per `slug` + trigger + RPC pubblica
