# AllergiApp - TODO

## EAS / Build
- [ ] Eliminare le 2 vecchie variabili `GOOGLE_SERVICES_JSON` da EAS (sensitive + secret)

## Pulizia progetto
- [ ] Rimuovere i file markdown di privacy/terms non più usati: `PRIVACY_POLICY.md`, `PRIVACY_POLICY_EN.md`, `TERMS_OF_SERVICE.md`, `TERMS_OF_SERVICE_EN.md` (l'app apre le pagine web su allergiapp.com)
- [ ] Eliminare `google-services-2.json` dalla root di AllergiApp (copia temporanea)

## Google Play / Android
- [ ] Sincronizzare `versionCode` Android (attualmente 1) con `buildNumber` iOS (attualmente 4) in `app.config.ts`
- [ ] Aggiungere profilo Android submit in `eas.json` (serviceAccount + track)
- [ ] Completare verifica account sviluppatore (serve dispositivo Android fisico)
- [ ] Caricare AAB su Google Play Console e pubblicare
- [ ] Aggiornare link Google Play nella homepage del sito (`index.html`) quando pubblicata

## Pre-rilascio produzione
- [ ] Migrare `DraggableBottomSheet` custom a `@gorhom/bottom-sheet` + `react-native-reanimated` — il custom (Animated+PanResponder) funziona su Expo Go ma per produzione le animazioni native sono più fluide (60fps thread UI)

## Prossime feature

### Feature ristoranti (branch: feature/restaurants)
Caricamento geo-based implementato su branch separato. Criticità aperte:
- [ ] **Flickering centerOn** — `setCenterOn({...})` crea sempre un nuovo oggetto, la mappa rianima anche se la posizione non è cambiata. Aggiungere check di uguaglianza lat/lng prima di chiamare setCenterOn
- [ ] **UX campo ricerca svuotato** — dopo geocoding di una città il campo si svuota di colpo. Opzioni: mostrare il nome della città come placeholder, oppure aggiungere testo "Risultati per Torino" nel contatore
- [ ] **Clustering pin** — con centinaia di ristoranti in zone dense i pin si sovrappongono. Valutare `react-native-map-clustering` quando la densità cresce
- [ ] **Scalabilità Firestore** — se il numero di ristoranti arriva a migliaia, valutare Supabase (PostGIS) per le query geo
- [ ] Dettaglio ristorante con info allergeni

### Lingue scaricabili: valutare pre-traduzione
Attualmente le lingue vengono tradotte on-demand via MyMemory API (79 chiamate sequenziali per lingua, ~40-60s, limite 5.000 char/giorno/IP). Valutare se conviene:
- Pre-tradurre tutte le 65 lingue una tantum (con DeepL, ChatGPT/Claude, o MyMemory da locale)
- Verificare manualmente la qualità
- Hostare i JSON su Firebase Storage (~3-4KB per lingua)
- L'app scarica un singolo file JSON già pronto invece di chiamare l'API 79 volte

Vantaggi: download istantaneo, qualità garantita, nessun limite quota, nessuna dipendenza API runtime.

## Branch in sospeso
- [ ] `feature/other-restrictions` — Altre restrizioni alimentari e modalità dieta. Pronto, da mergiare in main.
- [ ] `feature/restaurants` — Feature ristoranti completa (app + admin dashboard). In sviluppo.

## Admin Dashboard (admin/)
- [ ] Committare cartella `admin/` — il `.gitignore` copre già `service-account-key.json`, `node_modules/`, `.next/`
- [ ] Decidere deploy admin (Vercel o altro)

## Sito (landing/)
- [ ] Deployare su Vercel le modifiche al sito (contacts redesign, pulsante "Scopri di più", link App Store)

## Da verificare
- [ ] Se provo a scaricare una lingua ma non c'è internet o sparisce la connessione, l'utente lo capisce o fallisce silenziosamente?
- [ ] Nei box delle lingue scaricate verificare che le dimensioni siano uguali per tutti i box e che si adattino correttamente a tutti i dispositivi (es. Burmese sembra più alto)
- [ ] Cosa succede quando finiscono i crediti gratuiti per tradurre con MyMemory?

## Completati (branch feature/other-restrictions)
- [x] Sezione "Altri alimenti" con 13 cibi — traduzioni in 15 lingue
- [x] Modalità dieta: vegetariano (3 livelli), gravidanza, allergia al nichel
- [x] Visualizzazione su card (portrait + landscape)
- [x] Fix traduzioni: svedese molluschi, tedesco du/Sie
- [x] Supporto other foods nelle lingue scaricabili
