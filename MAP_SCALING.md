# Scalabilità mappa — pin, pallini, clustering

Documento di riferimento nato dalla discussione del 2026-07-03. Fotografa l'analisi
completa e la strategia decisa, per riprenderla quando si aprirà il lavoro.
Integra (non sostituisce) la sezione "SCALABILITÀ PIN — gerarchia dei limiti" in
`TODO.md`, che resta la fonte per i task operativi.

**Stato: Fase 1 COMPLETATA e in main (merge 2026-07-09, viewport-gating 2026-07-10). Piano operativo corrente: §0-bis.**
La Revisione §0 (2026-07-09) resta il riferimento per design e decisioni;
§0-bis la aggiorna con lo stato post-merge e i trigger del prossimo lavoro.

**⚠️ Il lavoro restante NON è in programma (confermato 2026-07-19):** si parte
solo quando scatta uno dei trigger numerici di §0-bis — fino ad allora nessuna
implementazione, solo occhiata occasionale ai conteggi in admin. Il degrado è
morbido (latenza/tagli silenziosi, mai rotture o dati persi), quindi aspettare
è a basso rischio. Gli interventi pesanti (celle, colonne precomputate) sono
solo server-side → spedibili in qualunque momento via SQL editor, senza build:
anticiparli non compra nulla.

---

## 0-bis. PIANO 2026-07-18 — dopo Fase 1 + viewport-gating

**Cosa è chiuso.** Lo strato RENDERING è risolto entro il vincolo basemap
nativa: pallini PNG via `image` prop (Fase 1, merge `9601d3f`, testata beta
1.2.0) + regime pin gated sul viewport (`MAX_FULL_PINS=300`, su main per
1.3.0) → costo proporzionale allo schermo, mai al dataset; regge a 50k
ristoranti. Non c'è altro lavoro rendering utile prima dell'upgrade rn-maps.

**Cosa resta aperto.** Lo strato DATI è un ponte: taglio max-rows 1000 cieco
e senza ranking (a zoom Italia già ~600 pallini tagliati, estetico), payload
lineare con N, debito colore doppia-sorgente. La cura di tutti e tre è la
stessa ed è già disegnata: la RPC a celle (design: §0 decisione 1
"grid-dots"; è lo step 3 della sequenza rivista in §0). Quarto debito, a
verbale dal 2026-07-19 con cura DIVERSA (colonne precomputate, non celle):
l'aggregato full-table su `reviews` nelle RPC calde — punto 4-bis.

**Piano per trigger (non per date — al ritmo di luglio le date non
significano nulla, i numeri sì):**

1. **ADESSO (pre-build 1.3.0): verifiche device sul telefono fisico vecchio**
   (dev/preview build, mai Expo Go) — freeze soglia pallini↔pin, pan a zoom
   largo, toggle filtri. Unico lavoro attivo: valida tutto il pacchetto già
   scritto. (Voce già in TODO.md.)
2. **CONTINUO (costo zero): monitorare due numeri** quando si lavora sull'app —
   (a) ristoranti nel bbox Italia (oggi ~1600) → trigger del punto 4;
   (b) città più densa (Milano 85) → trigger del punto 3. Nessuna infra di
   monitoraggio dedicata: basta guardare i conteggi in admin quando capita.
3. **Prima città verso ~200: Opzione B.** [Corretto 2026-07-19: la mossa
   "alzare Per me 50→~150" è GIÀ CONSUMATA — verificato nel codice che tutti i
   call-site (`useRestaurantGeo`, `useMapSearch`) passano già
   `NEARBY_MAX = 200`, il tetto server, dal tamponamento 09/07; il "50"
   residuo è solo la lista top-50 per ordinamento, scelta UI deliberata.]
   Quindi il margine città è oggi→~200 e la prossima leva NON è una riga: è
   direttamente l'Opzione B (colorare i segnaposto client-side, §2.1), coi
   suoi prerequisiti — PRIMA verificare l'equivalenza calcolo
   client/server della coverage (memoria `project_pin_coverage_source_of_truth`).
4. **Bbox Italia verso ~3000 (o taglio 1000 visibile/lamentato): RPC
   `get_map_aggregates` a celle** — il capitolo vero, design chiuso in §0
   (grid-dots: pallino-cella, centroide dei ristoranti, unione `supported_*`,
   colore client via `getExpandedCoverage`, tap = zoom-in). Step spedibili:
   - (a) migration RPC (`ST_SnapToGrid` zoom-aware; via SQL editor, MAI
     `db push`) + curl di verifica su prod;
   - (b) consumo in `useRestaurantGeo`: pinCache a doppia identità
     cella/ristorante — chiavi stabili e batching, il cambio regime è il
     churn-crash path iOS patchato;
   - (c) dev build su entrambe le piattaforme + telefono vecchio.
   Effetto collaterale voluto: **chiude gratis la decisione Max Rows** — le
   celle cappano il payload per costruzione, il limite PostgREST smette di
   mordere la mappa (restare a 1000 diventa un pro, non un limite). Qui dentro
   si rivede anche `PIN_RESPONSE_CAP` e la rivelazione progressiva per
   prominenza (rimandata qui da §0, note step celle).
   **Premium come segnale di prominenza (deciso 2026-07-18, feature premium
   NON ancora in lavorazione):** quando si disegnerà il ranking dello step
   celle, `is_premium` è il primo segnale che discrimina davvero (il voto no:
   quasi tutti 5.0) ed è *globale/user-independent* → compatibile con
   l'invariante pinCache per la nota §6. Ingressi naturali: sopravvive al
   taglio pallini (ORDER BY), diventa pin pieno a zoom più largo, resta pin
   sopra il layer celle. Fondamenta DB già esistenti (`is_premium`,
   `subscription_expires_at`, ORDER BY nelle RPC di ricerca): zero lavoro
   anticipato. **VINCOLO DI PRODOTTO non negoziabile: il premium non tocca
   MAI il colore/semantica di compatibilità (verde/ambra = claim di
   sicurezza, non in vendita) — compra solo visibilità (ordine, prominenza,
   soglia di rivelazione).** Nota legale collegata: premium attiva P2B →
   la priorità di visibilità andrà dichiarata nei termini (v. memoria legale).
   **Design ranking (deciso 2026-07-18): due livelli, la scala determina cosa
   è sicuro.** NIENTE ranking pre-celle: l'ORDER BY economico (review_count)
   è la distorsione geografica già scartata in §6, quello equo è metà del
   lavoro celle, e il taglio casuale attuale ha un pregio (distribuzione
   proporzionale + la pinCache mergia subset diversi tra fetch → copertura
   che cresce; un ORDER BY fisso escluderebbe SEMPRE gli stessi). Con le
   celle: (a) equità geografica = la griglia stessa (ogni cella esiste
   sempre, nessuna zona può sparire); (b) prominenza SOLO dentro la cella,
   per chi si rivela come pin a zoom più largo: `is_premium DESC,
   review_count DESC, id` (popolarità innocua a scala cella, id = tie-break
   deterministico). Modello Google: ranking per tile, mai globale. I fetch
   dettagliati NON si toccano: "Per me" per coverage DESC, nearby per
   distanza — già corretti.
   **Note di integrazione (a verbale 2026-07-19), da decidere NEL design
   della RPC, non dopo:**
   - **Filtro cucina vs celle**: oggi filtra client-side sui pallini perché
     `cuisine_types` è nel payload pin. Una cella senza cucine non può
     reagire al filtro → o il payload cella porta anche l'unione delle
     cucine (costo piccolo, stesso ragionamento dell'unione `supported_*`),
     o si accetta/dichiara che il filtro agisce solo sotto la soglia celle.
   - **Filtro "Recensiti dai seguiti" (mig 081) vs celle**: a zoom largo i
     due regimi si contraddicono. Soluzione probabile: in modalità seguiti
     restare SEMPRE a pin individuali (insieme piccolo per costruzione),
     mai celle. Da decidere esplicitamente, non scoprire in debug.
4-bis. **A verbale 2026-07-19 — aggregato full-table su `reviews`/`favorites`
   nelle RPC calde (trigger: recensioni totali verso ~50k, o latenza mappa
   percepita; finestra naturale: lo step celle del punto 4).**
   `get_pins_in_bounds` (073, la query più frequente dell'app),
   `get_nearby_restaurants` e `get_all_restaurants` (068) e `get_leaderboard`
   (039) calcolano voto medio/conteggi con una subquery
   `SELECT restaurant_id, AVG(rating) FROM reviews GROUP BY restaurant_id`
   **senza restrizione geografica**: Postgres non può spingere il filtro
   bbox/ST_DWithin dentro il GROUP BY → ogni chiamata scansiona e aggrega
   l'INTERA tabella reviews (nearby/all anche `favorites`), poi il join butta
   via quasi tutto. Costo lineare col TOTALE recensioni, non con l'area
   guardata; oggi invisibile (ms), a ~500k recensioni = full scan a ogni pan
   di ogni utente → primo punto dove il DB scalda. Degrada in silenzio: solo
   latenza, nessun errore. `get_restaurants_for_my_needs` NON è affetta (038
   già scoped con `restaurant_id IN (SELECT id FROM geo_restaurants)`).
   **Cura disegnata (economica, infra già in casa):** colonne
   `review_count`/`average_rating` su `restaurants` mantenute estendendo il
   trigger 044 (`refresh_restaurant_restrictions`, già fires a ogni
   INSERT/UPDATE/DELETE su reviews e già riscansiona le review di quel
   ristorante: aggiungere i due aggregati allo stesso UPDATE ≈ gratis) +
   backfill one-off + le RPC leggono le colonne (mantenere semantica
   `ROUND(avg,1)` / `COALESCE 0`). `favorite_count` analogo ma serve trigger
   nuovo su `favorites`. Migration via SQL editor, MAI db push. Effetto
   collaterale voluto: `average_rating` diventa colonna vera → chiude la
   memoria "average_rating non è free lunch" (preferiti che arrivano con 0) e
   la RPC celle del punto 4 nasce senza il vizio. Caveat onesti: (a)
   denormalizzazione = un invariante in più — TRUNCATE/restore bulk NON fa
   scattare i row trigger, rifare il backfill dopo; (b) import massivi già
   pagano il trigger per-riga oggi (supported_*), i due aggregati non
   cambiano l'ordine di costo.
4-ter. **A verbale 2026-07-19 — trigger: PRIMO PREMIUM FIRMATO (evento, non
   numero).** Stato attuale verificato nel codice: `is_premium` non è usato
   DA NESSUNA PARTE client-side (esiste solo nel tipo TS) e il payload di
   `get_pins_in_bounds` non lo porta → oggi un premium sulla mappa è
   indistinguibile, può essere tagliato dal LIMIT 1000 a zoom largo come
   chiunque, e il viewport-gating non lo privilegia. Unico effetto reale:
   `ORDER BY is_premium DESC` nelle RPC dettagliate (mai grigio in aree
   sature). Al primo contratto firmato, in ordine:
   - (a) **Stesso giorno, via SQL editor (zero build):** `ORDER BY
     r.is_premium DESC` in `get_pins_in_bounds` (il premium non può più
     sparire dal taglio) + colonna `is_premium` nel payload pin (additiva,
     client vecchi la ignorano — pattern 073). Sicuro per §6: ORDER BY
     globale/user-independent su un insieme minuscolo e deliberato — il
     resto del taglio resta casuale coi suoi pregi (distribuzione
     proporzionale, merge pinCache). NON estendere l'ORDER BY ad altri
     criteri (popolarità/voto/data): valutati e scartati, v. §6 e design
     ranking punto 4 — l'unico ordinamento giusto per il taglio è l'equità
     geografica, cioè le celle.
   - (b) **Build successiva:** evidenza visiva pin/lista (PREVIA decisione
     di prodotto sull'aspetto — non disegnare al buio) + inclusione
     garantita nei `MAX_FULL_PINS` del viewport-gating. Accettato: tra (a)
     e (b) il premium ha solo il vantaggio server, l'evidenza visiva arriva
     con la build.
   - (c) **Contestuale, non tecnico:** adeguamento P2B dei termini (v.
     memoria legale) — la priorità di visibilità va dichiarata.
   Vincolo invariato: il colore verde/ambra non si vende MAI.
5. **Al bump SDK Expo: upgrade rn-maps 1.20→1.27** — togliere la
   patch-package, chiudere flicker interop e animazioni (pop pin selezionato),
   rifare il debito colore a sorgente unica (finestra dichiarata in TODO.md),
   rivalutare `expo-maps`.

**Cosa NON fare (conferme, per non ridiscuterle):** niente supercluster
client (§0 punto 2); niente Opzione B oltre quanto già fatto; Max Rows resta
a 1000 finché non arriva il punto 4 (decisione utente 2026-07-12, rafforzata
2026-07-19: è config GLOBALE dell'istanza e i client pre-1.3.0 non hanno il
viewport-gating — renderizzano l'intera pinCache, quindi alzarlo
riporterebbe il freeze proprio sui device non aggiornabili via OTA; con la
coda lunga di client vecchi è un vincolo quasi permanente); nessuna
semplificazione a freddo della cicatrice rn-maps (§1).

---

## 0. REVISIONE 2026-07-09 — numeri nuovi, variante grid-dots, MapLibre esclusa

Il DB è passato da 453 (22/06) a **2316 ristoranti (09/07, ~5× in 17 giorni)**,
di cui **1595 in Italia** → il trigger 2 di §2 (LIMIT 1000 sui pallini) è GIÀ
ATTIVO a zoom paese: ~600 locali tagliati in silenzio. Il trigger 1 è stato
tamponato il 09/07 (fetch dettagliato a 200, commit `ed15d09`, OTA `a1ec072a`).
Milano, la città più densa, è a 85 → il cerotto 200 copre le città per ora.
Vincolo caduto: l'utente accetta build native (niente obbligo OTA). Vincolo
confermato ed esplicito: **si resta su mappe native Apple/Google** (scelta di
prodotto).

**Decisioni prese (che aggiornano il resto del documento):**

1. **Grid-dots al posto delle bolle neutre.** L'aggregazione server (§4) resta
   il cuore, ma per cella si disegna **un pallino**, non una bolla col numero:
   a zoom largo un pallino-cella (griglia ≈ ingombro visivo del pallino) è
   indistinguibile da N pallini sovrapposti → payload costante, aspetto
   invariato. Ogni cella porta centroide **dei ristoranti** (non della griglia),
   `count` (nel payload anche se non mostrato) e **unione** di
   `supported_allergens`/`supported_diets`: il client colora con
   `getExpandedCoverage` come oggi → **il colore per-utente sopravvive a ogni
   zoom** (il dilemma "colore vs cacheability" di §4 si scioglie: l'unione è
   user-independent e mantiene l'invariante filter-independent della pinCache).
   Semantica sfumata ma onesta: verde = "almeno un posto qui ti copre".
   Tap su pallino-cella = zoom-in (logica `handleClusterPress` già esistente);
   pallini veri/salvati continuano ad aprire la scheda.
2. **Supercluster client: si salta.** Lo step 2 di §7 conteggerebbe bolle su
   dati troncati e verrebbe buttato all'arrivo dell'aggregazione. Dalla via
   `image` (step 1) si va dritti alla RPC a celle.
3. **MapLibre GL valutata ed ESCLUSA — motivo di prodotto, non tecnico.**
   Senza vincolo OTA era la candidata best-in-class (punti come layer GPU:
   10k+ a 60fps, niente marker/bitmap/churn, colore data-driven, cluster
   nativi; tutta la cicatrice rn-maps sparirebbe). MA richiede il suo renderer
   con tile provider → si perdono Apple/Google Maps come base, e la basemap
   nativa è un vincolo di prodotto confermato. Messo a verbale il costo del
   vincolo: **su basemap nativa il tetto è "poche centinaia di marker fluidi"
   per chiunque** (anche Google/Apple disegnano i POI dentro il proprio motore
   tile, privilegio che le API marker non danno) → il piano garantisce
   scalabilità dati illimitata e il miglior rendering *possibile* sotto quel
   vincolo, non la fluidità GL. Se il vincolo basemap un giorno cadesse,
   MapLibre è la porta — e RPC a celle/PNG/logica client si riusano.
4. **Watch item: `expo-maps`** (mappe native, investimento Expo, oggi acerba) —
   rivalutare a ogni bump SDK. L'upgrade **rn-maps 1.20→1.27 resta strutturale**
   (cura churn-crash/drift/resa su Fabric), finestra: prossimo bump SDK.

**Sequenza rivista (sostituisce §7):** branch `feature/map-scaling`, dev build
obbligatoria per testare (mai Expo Go).

1. **Ponte dati (client-side, scoperta 09/07):** il client passa già `lim`
   esplicito a `get_pins_in_bounds` e il server non cappa → basta alzare il
   default in `restaurantService.getPinsInBounds` 1000→3000 + trim pinCache
   4500/3000. Niente migration. OTA-abile da solo se serve subito in prod.
2. **Pallini non salvati → PNG statici via `image` prop** (5 varianti × 2 temi,
   script `scripts/generate-map-dots.js`): de-fragilizza la mappa attuale e
   valida la via `image` (densità pixel, anchor, transizione image↔view al
   cambio soglia dot/pin = i punti da testare su device).
3. **RPC `get_map_aggregates` zoom-aware** (celle `ST_SnapToGrid` sopra soglia,
   pin individuali sotto) + consumo in `useRestaurantGeo` (pinCache a doppia
   identità cella/ristorante — attenzione: churn del cambio regime = il
   crash-path iOS patchato, servono chiavi stabili e batching).
4. **Al bump SDK:** upgrade rn-maps 1.27 + rimozione patch, sguardo a expo-maps.

**⚠️ Aggiornamento 2026-07-10 sera — il "ponte 3000" NON è mai stato attivo:**
verificato con curl sulla RPC di produzione: **PostgREST tronca OGNI risposta
a `max-rows` = 1000** (default Supabase), qualunque `lim` chieda il client —
`lim=3000` → 1000 righe. Il punto 1 qui sopra alzava il limite richiesto ma
il tetto vero è rimasto 1000. Rimedio config (non migration): alzare Max Rows
da Dashboard Supabase → Settings → API. Il client ora usa `PIN_RESPONSE_CAP
= 1000` (useRestaurantGeo) come soglia di troncamento: aggiornarlo se
max-rows viene alzato. Trovati e fixati lo stesso giorno (dev build, sessione
di debug con telemetria [MAPDIAG]): race all'avvio che scartava il fetch-base
(epoch vs GPS veloce → pinCache ridotta al solo viewport → pin che sparivano
col filtro, perché fuori dal box vivevano solo nella lista dettagliata
filtro-dipendente), colore pin stale al cambio esigenze (needsOverride +
restKey), overlay selezione assente senza dettaglio in cache (fallback
payload pin), muted 0.5 invisibile su sfondo chiaro (→0.6), guardia patch
rn-maps su image nil (LogBox "(null)" alla transizione pallino↔pin).

**Aggiornamento 2026-07-10 — regime pin gated sul viewport (fatto, su main):**
il flip pallini→pin alla soglia era globale: TUTTA la pinCache (fino a
~3000-4500 marker, anche fuori schermo) diventava pin completi insieme →
migliaia di catture bitmap + settling Android nello stesso frame → freeze di
secondi sui device lenti, osservato sul campo. Ora diventano pin solo i marker
nel viewport allargato (±delta×1.5, tetto `MAX_FULL_PINS=300` sui più vicini
al centro): costo proporzionale allo schermo, mai al dataset — regge anche a
50k ristoranti. Nessun unmount (flip via tracksViewChanges nello stesso
Marker, invariante churn-crash iOS). Questo è il pezzo "zoom stretto"
dell'architettura finale; le celle (punto 3 sopra) restano il pezzo "zoom
largo". Insieme: skip della RPC pin su zoom-in dentro un'area già fetchata
per intero (risposta sotto cap), pallini muted alpha 0.5, pin zero-match a
opacità 0.55 + zIndex compatibili>grigi su entrambe le piattaforme.

**Note per lo step celle (decisioni 2026-07-09, secondo giro):**
- **Rivelazione progressiva per prominenza** (pin "importanti" diventano pin a
  zoom più largo, alla Google) valutata e RIMANDATA allo step celle: il voto non
  discrimina (quasi tutti 5.0 con poche recensioni), servirebbe `review_count`
  nel payload pin + taratura — va disegnata dentro il modello celle→pallini→pin,
  non appiccicata prima. Palliativo già attivo: rampa di taglia pallini
  (DOT_LARGE_THRESHOLD).
- **Transizione pallino↔pin istantanea**: standard di settore (nemmeno
  Google/Airbnb la animano); NON animare marker su rn-maps 1.20
  (tracksViewChanges per-frame = trappola perf). Eventuale morbidezza extra solo
  post-upgrade 1.27.

---

## 1. Giudizio sull'architettura attuale

L'impianto è corretto e non va rifatto: modello a due livelli (pin leggeri per
bounding box via `get_pins_in_bounds` + dati completi per raggio con cache/dedup)
è lo stesso pattern di Google Maps/Airbnb. Debounce, epoch, dedup region, isteresi
dot/pin sono lavoro giusto. La complessità di `RestaurantMap.native.tsx` e
`MapPin.tsx` (tracksViewChanges, settling Android, padding simmetrici, patch
churn-crash iOS) è quasi tutta cicatrice di **react-native-maps** (marker = view
RN catturata in bitmap), non debito nostro: non semplificarla a freddo.

Col senno di poi, due scelte si sarebbero fatte diversamente (contratto RPC
zoom-aware dal giorno 1; render sul viewport invece che sull'intera pinCache), ma
nessuna delle due è urgente da correggere ora.

## 2. Il problema ha DUE strati indipendenti — non confonderli

**Strato rendering** (quanti marker regge la mappa): ogni marker è una view
nativa con cattura bitmap; oggi si renderizza l'intera pinCache (cap 3000, trim
per ordine di inserimento, non per distanza). iOS regge centinaia, Android meno.
→ Si risolve *definitivamente* client-side (clustering + PNG statici, §3).

**Strato dati** (quanti pin scarichi): `get_pins_in_bounds` ha `LIMIT 1000`
**senza ORDER BY** → oltre 1000 righe in un bbox il taglio è arbitrario e
silenzioso. Alzare il limite sposta il tetto sul payload: ~150-250 byte/pin in
JSON → 5.000 pin ≈ 1 MB (ok wifi, lento su mobile), 20.000 ≈ 4-5 MB (no).
→ Si risolve *definitivamente* solo server-side (aggregazione, §4).

**Gerarchia dei trigger** (analisi 2026-06-22, spostata qui da TODO.md che ora
tiene solo i task — il primo che morde NON è il 1000).
**[Agg. 2026-07-18: fotografia di giugno, numeri superati — trigger 1
tamponato a 200 il 09/07, trigger 2 GIÀ ATTIVO a zoom Italia, e il rendering
NON è più sull'intera pinCache (viewport-gated). Stato corrente: §0/§0-bis;
restano validi i ragionamenti e le "prime mosse".]**

1. **~50-100 per città — pin grigi a zoom città.** Si vede su Milano/Roma/Londra
   piena, ben prima dei 1000. I pin pieni *colorati* (voto + match) vengono dal
   fetch dettagliato, capato a **50** in "Per me" (`get_restaurants_for_my_needs`)
   e **100** nearby (`NEARBY_DEFAULT`); gli altri appaiono comunque (da `allPins`)
   ma come **segnaposto grigi** — toccabili, si riempiono al pan via cache. È
   cosmetico, non perdita dati, e il taglio è sensato: "Per me" ordina per
   copertura DESC (i grigi residui sono i MENO compatibili, improbabile perdere
   un verde), nearby per distanza.
   - **Prima mossa (pulita)**: alzare "Per me" 50→~150 (param RPC dal client, il
     server cappa a 200 con `LEAST`). Una riga, una sola fonte di verità (server),
     nessun rischio semantico. Copre fino a ~200/città.
   - **Solo oltre ~200/città → "Opzione B"** (colorare i segnaposto client-side
     con `getExpandedCoverage` su `supported_allergens`, già nel payload pin).
     NON è "15 min di miglioria": introduce 3 criticità che oggi non esistono —
     (1) staleness colore iOS al cambio filtro (`tracksViewChanges` non include
     `user*`; il fix tocca il recapture = rischio mass-recapture/churn);
     (2) claim verde su `supported_*` cachato/stale — in un'app allergie è
     un'affermazione forte; (3) flip di colore all'arrivo del dettaglio se il
     calcolo client (`restrictionImplications`) e quello server (CTE
     `implications`) divergono — **equivalenza mai verificata su dati veri, da
     verificare PRIMA**. Vedi memoria `project_pin_coverage_source_of_truth`.

2. **>1000 in un bbox (solo zoom continentale) — taglio del layer pallini.**
   `LIMIT 1000` senza ORDER BY, **cieco a OGNI filtro** (cucina = filtrata
   client *dopo* il taglio; "Per me" sui pallini non filtra né ordina). Latente,
   non attivo (~453 totali).
   - **Prima mossa**: LIMIT 1000→3000 (già dentro il cap della cache client).
     Mantiene l'invariante "pin filter-independent" → niente churn, filtro
     istantaneo/offline. Costo = solo payload.
   - Filtro per-esigenze nel SQL: **NO** (rompe l'invariante, vedi §6).

3. **>3000 in bbox / payload >0,5 MB**: serve l'aggregazione server-side (§4).
   Disegnare prima, implementare quando il DB cresce — non prima.

## 3. Traccia RENDERING — rianimare il clustering, stavolta bene

*(Agg. 2026-07-18: §3a-pallini FATTO in Fase 1; le bolle cluster a scaglioni
e il supercluster di §3b sono SUPERATI dalla variante grid-dots — §0
decisioni 1-2. Sezione conservata per il ragionamento sulla via `image`.)*

Il clustering client era stato spento (giu 2026, `CLUSTERING_ENABLED = false`)
NON perché supercluster non funzionasse, ma per due problemi di **rendering**:
bolle "a spicchio" (cattura bitmap inaffidabile su rn-maps 1.20.1/New Arch
Android) e churn/flicker dei marker a ogni ricalcolo (crash-path su iOS).
Spunti nuovi che attaccano entrambe le radici:

**3a. PNG pre-renderizzati via `image` prop (l'idea chiave).** rn-maps ha un
secondo percorso di rendering che NON passa dalla cattura bitmap: icona statica
(`<Marker image={...}>`). Niente tracksViewChanges, niente settling, niente
spicchi.
- **Bolle cluster**: conteggi **a scaglioni** ("2"…"9", "10+", "25+", "50+",
  "100+") × 4 colori coverage × taglie ≈ ~50 PNG generati a build time (script,
  come la pipeline avatar). Bonus decisivo: gli scaglioni restano **onesti**
  anche su dati troncati dal LIMIT ("100+" è vero comunque; un "347" esatto
  calcolato su pin troncati sarebbe una bugia).
- **Pallini**: le varianti non-salvate sono ~4 (verde/ambra/grigio/primary +
  muted) → PNG statici. Elimina cattura bitmap E i timer settling per-marker
  (un setTimeout per pallino per cambio = costo reale con centinaia di dot).
  I salvati col badge emoji restano view custom (pochi, tollerabile).
- Rischio unico da validare su dev build: densità pixel (@2x/@3x) e anchor
  delle icone su entrambe le piattaforme.

**3b. Ricalcolo cluster solo al cambio di livello di zoom INTERO**, non a ogni
gesto. Sul pan i cluster esistenti restano fermi, si aggiungono solo quelli
dell'area nuova. Chiavi React per **identità geografica** (coordinate del
cluster arrotondate a quello zoom), non per id supercluster → un cluster che
sopravvive al ricalcolo mantiene lo stesso elemento = niente unmount/remount =
niente flicker, e meno pressione sul crash-path iOS.

**3c. Portata e limite onesto.** Questo pacchetto è definitivo per il rendering
a qualsiasi scala (supercluster macina 100k punti), e copre lo strato dati fino
a qualche migliaio di ristoranti (= realisticamente anni). Ma i conteggi
contano solo i pin *scaricati*: per numeri veri a zoom continente serve il
server. È comprare tempo sullo strato dati sapendolo, non risolverlo.

## 4. Traccia DATI — aggregazione server-side (l'approdo)

*(Agg. 2026-07-18: il nodo "colore vs cacheability" e la prima versione a
"bolle neutre" sono RISOLTI dalla variante grid-dots — §0 decisione 1:
unione coverage per cella, colore per-utente client-side. Restano validi
latenza, estetica griglia, carico DB.)*

RPC tipo `get_map_aggregates(bbox, zoom)`: sotto la soglia pin-zoom ritorna pin
individuali come oggi; sopra, celle aggregate (PostGIS `ST_SnapToGrid`/geohash
per livello, `count` + centroide). Payload costante a qualunque N. Le celle
stabili tra gesti eliminano il churn per costruzione. `ClusterBubble` (già
scritto) si riusa; sparisce supercluster.

**Tradeoff onesti, da decidere PRIMA di scrivere SQL:**
- **Latenza sul gesto**: ogni cambio zoom significativo = round-trip 300-800 ms.
  Si mitiga (debounce/epoch già in casa), non si elimina. La transizione fluida
  tra livelli di zoom del clustering client si perde.
- **Colore personalizzato delle bolle** (il nodo specifico di AllergiApp): il
  verde/ambra oggi nasce dalle esigenze *di quell'utente*. Un aggregato o è
  per-utente (parametri allergie nella RPC → niente cache a monte) o è neutro
  (conteggio senza claim "per te") o porta dati per-cella per colorare
  client-side (payload+complessità). **Colore per-utente e cacheability si
  escludono a vicenda.** Prima versione consigliata: bolle neutre col conteggio,
  rimandare il colore.
- **Estetica griglia**: cluster che cadono a cavallo di due celle → due bolle
  dove l'occhio ne vuole una; riallineamento griglia tra zoom → bolle che
  "saltano". Un gradino sotto supercluster; si tara con le taglie di griglia.
- **Carico DB**: non-problema al nostro orizzonte (GROUP BY su bbox con GiST =
  millisecondi).

## 5. Come fanno le app con decine di migliaia di pin

- **Airbnb**: la mappa mostra i *risultati della ricerca* (max ~300/viewport,
  per rilevanza), mai il database. "Più di 1.000 alloggi in quest'area".
- **Zillow**: due regimi netti; a zoom largo i puntini NON sono marker ma
  disegnati in tile/canvas (non interattivi singolarmente, il tap zooma).
- **Google Maps**: zero marker, POI dentro vector tiles; ogni tile contiene solo
  gli N POI più "prominenti" per quello zoom (ranking offline).
- **Booking/TheFork/TripAdvisor**: bbox+cap+cluster server. **Uber**: griglia
  esagonale H3, solo aggregati. **Strava**: tutto tile pre-renderizzate.

**Principi comuni**: (1) nessuno manda tutti i pin, mai — sempre viewport + cap
+ **ranking**; (2) a zoom largo la completezza si comunica con aggregati, non
punti; (3) la "prominence" è ovunque e nessun utente la percepisce come limite;
(4) il rendering scala cambiando tecnologia (marker → icone → canvas/tiles),
non ottimizzando i marker. L'unico ingrediente che ci manca del tutto è il
ranking (oggi il taglio è casuale). Il reframing utile: non "come mostro tutti
i ristoranti" ma "quali merita di vedere l'utente a questo zoom".

Il gradino vector-tiles/GL (o migrare a MapLibre, che renderizza 10k punti come
circle layer GPU con clustering nativo) risolverebbe alla radice anche le
fragilità rn-maps, ma costa tile provider + perdita di Apple/Google Maps come
base: NON è il nostro orizzonte, citato solo per completezza.

## 6. Cosa abbiamo valutato e SCARTATO (con motivo)

- **Pulsante "carica in quest'area"**: cambia *quando* si carica, non *quanto*
  c'è nel viewport → non tocca il collo di bottiglia; aggiunge attrito a
  un'app di scoperta. I problemi che risolve (carico server, churn risultati)
  non li abbiamo.
- **Top-N per popolarità "secco" (ORDER BY review_count)**: distorsione
  geografica — le recensioni si concentrano dove sta la base utenti → vista
  Europa quasi tutta italiana, PEGGIO del taglio casuale per l'obiettivo
  "mostrare copertura internazionale". Se ne riparla solo in variante
  spazialmente equa (un rappresentante per cella, poi si riempie) — che però è
  già metà dell'aggregazione server: tanto vale fare quella.
- **Filtro/ordinamento per-esigenze nel SQL dei pallini**: rompe l'invariante
  "pinCache filter-independent": oggi `clearAndReload` NON svuota la pinCache
  di proposito; renderla filter-dependent = svuotamento a ogni cambio filtro =
  churn di ritorno + filtro online-only. NB: un eventuale ORDER BY *globale*
  (uguale per tutti, es. prominence) NON rompe l'invariante.
- **Render sul viewport come "quick win"**: giusto in prospettiva (è in TODO,
  Tech debt) ma NON banale — reintroduce churn di mount/unmount nel punto più
  fragile di rn-maps (il churn-crash iOS ha una patch dedicata). Da fare con
  margine generoso (~3× viewport), rimozioni pigie, e test su dev build.

## 7. Sequenza operativa (quando si parte)

*(SUPERATA: sequenza rivista in §0, stato e trigger correnti in §0-bis.
Conservata per storia — gli step 1 e 3 sono stati fatti in Fase 1, lo step 2
è stato saltato per decisione §0.)*

Branch dedicato `feature/map-scaling` da `main` (pattern `feature/my-restaurants`).
La mappa NON si testa in Expo Go (rn-maps patchata) → **dev build** obbligatoria;
`preview` per la verità sulla perf. Tutto il pacchetto §3 è OTA-abile (i PNG
viaggiano nel bundle JS); solo l'upgrade rn-maps è nativo.

Step incrementali, ciascuno spedibile da solo:
1. **Pallini → PNG statici via `image`** — de-fragilizza la mappa attuale ed è
   il test più economico della via `image`. Vale da solo anche senza clustering.
2. **Riaccendere supercluster su Android** con bolle PNG a scaglioni + ricalcolo
   per zoom intero + chiavi geografiche. iOS per ultimo e solo se serve.
3. **Ritocchi dati contestuali**: LIMIT 1000→3000; trim pinCache per distanza
   dal centro invece che per ordine di inserimento (`useRestaurantGeo.ts`,
   `slice(-2000)`).
4. **(più avanti, trigger: DB verso i 1000 in bbox Europa o payload >0,5 MB)**
   aggregazione server-side §4, prima versione con bolle neutre. Nulla degli
   step 1-3 si butta: cambia solo la sorgente dei cluster.

Finestra naturale per il "debito colore doppia-sorgente" e l'upgrade rn-maps
1.27.x: il prossimo bump SDK Expo (vedi TODO.md).

## 8. Riferimenti

- `TODO.md` → sezione "Mappa Android — perf & rendering" (gerarchia limiti, task)
- `components/map/RestaurantMap.native.tsx` (nota su CLUSTERING_ENABLED),
  `MapPin.tsx`, `useMapClusters.ts` (dormiente), `hooks/useRestaurantGeo.ts`
- Migration 068 (`get_pins_in_bounds` con LIMIT 1000)
- Memorie assistente: `project_map_clustering`, `project_react_native_maps_churn_crash`,
  `project_pin_coverage_source_of_truth`
